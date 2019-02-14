const path = require( 'path' )
const { EventEmitter } = require( 'events' )
const fse = require( 'fs-extra' )
const chalk = require( 'chalk' )
const Resolver = require( './resolver' )
const Watcher = require( './watcher' )
const CSSPacker = require( './packers/css' )
const JSPacker = require( './packers/js' )
const manifest = require( './templates/manifest' )
const HMRServer = require( './hmr/server' )

const INSTALL_BUILTIN_SOURCES = Symbol( 'install_builtin_sources' )
const INSTALL_BUILTIN_PACKERS = Symbol( 'install_builtin_packers' )
const INSTALL_BUILTINS = Symbol( 'install_builtins' )
const DEFAULT_OUT_DIR = path.resolve( process.cwd(), 'dist' )
const WATCH_DEBOUNCE_TIMEOUT = 100
const DEFAULT_HMR_PORT = 9001

class Bundler extends EventEmitter {
  constructor( options = {} ) {
    super()

    this.options = options
    this.sources = {}
    // used packers
    this.packers = new Set()
    this.resolver = new Resolver( Object.assign( {}, options, {
      api: {},
    } ) )
    this.existingSources = new Map()

    this[ INSTALL_BUILTINS ]( {
      '#builtins/hmr/css': require( './hmr/builtins/css' ),
      '#builtins/logger': require( './builtins/logger' ),
    } )

    this[ INSTALL_BUILTIN_SOURCES ]( {
      '.js': require( './sources/javascript' ),
      '.less': require( './sources/less' ),
      '.css': require( './sources/css' ),
      '.html': require( './sources/html' ),
    } )

    this[ INSTALL_BUILTIN_PACKERS ]( {
      css: CSSPacker,
      js: JSPacker,
    } )

    if ( options.hmr ) {
      this.hmrServer = new HMRServer()
      // TODO: from config or get free port automatically
      this.hmrServer.start( {
        port: DEFAULT_HMR_PORT,
      } )
    }

    if ( options.watch ) {
      this.bundleTimer = null
      const changes = []

      const invalidateAndRebundle = type => filepath => {
        this.invalidateSource( filepath )

        changes.push( {
          type,
          file: path.relative( this.entrydir, filepath )
        } )

        if ( this.bundleTimer ) {
          clearTimeout( this.bundleTimer )
        }

        setTimeout( async () => {
          console.log(
            `Rebuild as file ` +
            changes
              .map( change => chalk.blue( change.file ) + ' ' + change.type )
              .join( ', ' )
          )
          changes.length = 0

          // re-init invalid sources
          // incremental
          // TODO: 并行
          for ( let [ , source ] of Object.entries( this.sources ) ) {
            if ( !source.isValid() ) {
              await source.waiting()
              await source.init( this )
            }
          }

          // upadte sources
          const { sources, paths } = this.walkSources( this.entrySource )
          this.sources = sources

          await this.emit( await this.pack() )

          setTimeout( () => {
            this.watch( paths )
          }, 1000 )
        }, WATCH_DEBOUNCE_TIMEOUT )
      }

      this.watcher = new Watcher()
      this.watcher.on( 'ready', () => {
        this.watcher.on( 'change', invalidateAndRebundle( 'change' ) )
        // this.watcher.on( 'add', invalidateAndRebundle( 'add' ) )
        // this.watcher.on( 'unlink', invalidateAndRebundle( 'unlink' ) )
      } )
    }
  }

  [ INSTALL_BUILTINS ]( builtins ) {
    for ( let [ id, content ] of Object.entries( builtins ) ) {
      this.resolver.registerBuiltinModule( id, content )
    }
  }

  [ INSTALL_BUILTIN_SOURCES ]( extensions ) {
    for ( let [ ext, Source ] of Object.entries( extensions ) ) {
      this.resolver.registerSource( ext, Source )
    }
  }

  [ INSTALL_BUILTIN_PACKERS ]( packers ) {
    for ( let [ type, Packer ] of Object.entries( packers ) ) {
      this.resolver.registerPacker( type, Packer )
    }
  }

  invalidateSource( filepath ) {
    const source = this.existingSources.get( filepath )

    if ( source ) {
      source.invalidate()
    }
  }

  async createSource( filepath ) {
    let source = this.existingSources.get( filepath )

    if ( source ) {
      if ( source.isValid() ) {
        await source.waiting()
        return source
      }

      // re-init source in existingSources in watch mode
      // shall wait previous waiting() to avoid conflicts
      await source.waiting()
      await source.init( this )
      return source
    }

    const Source = this.resolver.resolveSource( filepath )

    if ( !Source ) {
      throw new Error( 'Cannot find proper Source to handle file: ' + filepath )
    }

    source = new Source( filepath, this.options )

    this.existingSources.set( filepath, source )

    await source.init( this )

    return source
  }

  async bundle( entry ) {
    this.entry = entry
    this.entrydir = path.dirname( entry )

    try {
      const source = await this.createSource( entry )
      this.entrySource = source

      const { sources, paths } = this.walkSources( this.entrySource )
      this.sources = sources

      await this.emit( await this.pack() )

      this.watch( paths )
    } catch ( e ) {
      console.log( e )
    }
  }

  walkSources( source ) {
    const sources = {}
    const paths = new Set()

    source.walk( s => {
      sources[ s.id ] = s
      paths.add( s.filepath )
    } )

    return {
      sources,
      paths: Array.from( paths ),
    }
  }

  async emit( { bundles, updates } ) {
    const sources = this.sources

    const beforeEmitJobs = Object.keys( sources )
      .map( id => sources[ id ] )
      .filter( source => source.beforeEmit )

    if ( beforeEmitJobs.length > 0 ) {
      await Promise.all(
        beforeEmitJobs.map( source => source.beforeEmit( bundles ) )
      )
    }

    await this.emitFiles( bundles )

    if ( this.options.hmr ) {
      if ( updates.some( update => update.reload ) ) {
        this.hmrServer.pushReload()
      } else {
        this.hmrServer.pushUpdate( updates )
      }
    }
  }

  async watch( paths ) {
    if ( this.watcher ) {
      console.log( `Watching ${ chalk.green( paths.length ) } files` )
      this.watcher.watch( paths )
    }
  }

  splitChunks( sources, mainChunkName ) {
    const defaultSplitChunkRules = [
      {
        name: 'vendor',
        test( source ) {
          if (
            source.filepath.includes( 'node_modules' ) ||
            source.requiredTimes > 1
          ) {
            return true
          }

          return false
        }
      }
    ]

    const chunks = {
      [ mainChunkName ]: []
    }

    Object.keys( sources ).forEach( id => {
      const source = sources[ id ]

      let matched = null

      defaultSplitChunkRules.some( rule => {
        if ( rule.test( source ) ) {
          matched = rule
          return true
        }

        return false
      } )

      if ( matched ) {
        chunks[ matched.name ] = chunks[ matched.name ] || []
        chunks[ matched.name ].push( source )
      } else {
        chunks[ mainChunkName ].push( source )
      }
    } )

    return chunks
  }

  async pack() {
    const mainChunkName = 'client'
    const sources = this.sources
    const chunks = this.splitChunks( sources, mainChunkName )
    const bundles = []
    const JSPacker = this.resolver.resolvePacker( 'js', this.options )

    // manifest + builtins chunk
    bundles.push( {
      type: 'js',
      content: manifest( {
        callbackName: 'biuJsonp',
        hmrPort: DEFAULT_HMR_PORT,
        hmr: Boolean( this.options.hmr ),
      } ) + JSPacker.pack( this.resolver.getBuiltinModules() ),
      filename: 'manifest.js',
    } )

    // for notify hmr clients
    const changed = []

    for ( let [ chunkName, sources ] of Object.entries( chunks ) ) {
      const collected = {}
      const isMainChunk = chunkName === mainChunkName
      let executeIds = []

      Object.keys( sources ).forEach( id => {
        const source = sources[ id ]
        const assets = source.getAssets()

        if ( source.isHashChanged() ) {
          changed.push( source )
          source.syncLastHash()
        }

        // first js module as main module by default
        const mainModule = assets.find( m => m.type === 'js' )

        if ( isMainChunk && mainModule ) {
          executeIds.push( source.id )
        }

        const sourcePath = path.relative( path.dirname( this.entry ), source.filepath )

        // group assets by type
        assets
          .filter( asset => asset.type !== 'js' )
          .concat( mainModule ? mainModule : [] )
          .forEach( asset => {
            const type = asset.type
            collected[ type ] = collected[ type ] || []
            collected[ type ].push( {
              path: sourcePath,
              asset,
              from: source,
            } )
          } )
      } )

      for ( let [ type, modules ] of Object.entries( collected ) ) {
        const packer = this.resolver.resolvePacker( type, this.options )

        bundles.push( {
          type,
          content: packer.pack( modules, {
            executeIds,
          } ),
          filename: `${ chunkName }.${ type }`,
        } )
      }
    }

    const updates = changed.map( source => {
      return {
        id: source.id,
        assets: source.getAssets(),
        mapping: source.mapping,
        reload: Boolean( source.hmrForceReload ),
      }
    } )

    return { bundles, updates }
  }

  async emitFiles( bundles ) {
    // TODO: 并行
    for ( let { filename, content } of bundles ) {
      await this.emitFile( filename, content )
    }
  }

  async emitFile( filename, content ) {
    const ourDir = this.options.outDir || DEFAULT_OUT_DIR
    const realpath = path.resolve( ourDir, filename )
    await fse.outputFile( realpath, content )
  }
}

module.exports = Bundler
