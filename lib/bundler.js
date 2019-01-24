const path = require( 'path' )
const { EventEmitter } = require( 'events' )
const fse = require( 'fs-extra' )
const chalk = require( 'chalk' )
const Resolver = require( './resolver' )
const Watcher = require( './watcher' )
const CSSPacker = require( './packers/css' )
const ModulePacker = require( './packers/module' )

const INSTALL_BUILTIN_SOURCES = Symbol( 'install_builtin_sources' )
const INSTALL_BUILTIN_PACKERS = Symbol( 'install_builtin_packers' )
const DEFAULT_OUT_DIR = path.resolve( process.cwd(), 'dist' )
const WATCH_DEBOUNCE_TIMEOUT = 100

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

    this[ INSTALL_BUILTIN_SOURCES ]( {
      '.js': require( './sources/javascript' ),
      '.less': require( './sources/less' ),
      '.css': require( './sources/css' ),
      '.html': require( './sources/html' ),
    } )

    this[ INSTALL_BUILTIN_PACKERS ]( {
      css: CSSPacker,
      module: ModulePacker,
    } )

    if ( options.watch ) {
      this.bundleTimer = null

      const invalidateAndRebundle = type => filepath => {
        this.invalidateSource( filepath )

        if ( this.bundleTimer ) {
          clearTimeout( this.bundleTimer )
        }

        setTimeout( async () => {
          const changed = path.relative( this.entrydir, filepath )
          console.log( `Rebuild as file ${ chalk.blue( changed ) } ${ type }` )

          // re-init invalid sources
          const sources = this.sources

          // incremental
          for ( let [ , source ] of Object.entries( sources ) ) {
            if ( !source.isValid() ) {
              await source.ready()
              await source.init( this )
            }
          }

          await this.pack()
        }, WATCH_DEBOUNCE_TIMEOUT )
      }

      this.watcher = new Watcher()
      this.watcher.on( 'ready', () => {
        this.watcher.on( 'add', invalidateAndRebundle( 'add' ) )
        this.watcher.on( 'change', invalidateAndRebundle( 'change' ) )
        this.watcher.on( 'unlink', invalidateAndRebundle( 'unlink' ) )
      } )
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
    const sources = this.sources
    this.entry = entry
    this.entrydir = path.dirname( entry )

    try {
      const source = await this.createSource( entry )

      const paths = new Set()
      source.walk( s => {
        sources[ s.id ] = s
        paths.add( s.filepath )
      } )

      const bundles = await this.pack()

      this.watch( Array.from( paths ) )

      return {
        bundles,
        sources,
      }
    } catch ( e ) {
      console.log( e )
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

    for ( let [ chunkName, sources ] of Object.entries( chunks ) ) {
      const collected = {}
      const isEntryChunk = chunkName === mainChunkName

      Object.keys( sources ).forEach( id => {
        const source = sources[ id ]
        const assets = source.getAssets()

        // first js module as main module by default
        const mainModule = assets.find( m => m.type === 'js' )

        if ( mainModule ) {
          mainModule.main = true
        }

        const p = path.relative( path.dirname( this.entry ), source.filepath )

        // group assets by type
        assets
          .filter( asset => asset.type !== 'js' )
          .concat( mainModule ? mainModule : [] )
          .forEach( asset => {
            const type = asset.type
            collected[ type ] = collected[ type ] || []
            collected[ type ].push( {
              path: p,
              asset,
              from: source,
            } )
          } )
      } )

      let modules = []
      for ( let [ type, assets ] of Object.entries( collected ) ) {
        const packer = this.resolver.resolvePacker( type, this.options )

        if ( packer ) {
          bundles.push( {
            type,
            content: packer.pack( assets ),
            filename: `${ chunkName }.${ type }`,
          } )
        }

        modules = modules.concat( assets )
      }

      // always pass to module packer to wrap them in module templates
      const packer = this.resolver.resolvePacker( 'module', this.options )

      bundles.push( {
        type: 'js',
        content: packer.pack( modules, {
          isEntry: isEntryChunk
        } ),
        filename: chunkName + '.js',
      } )
    }

    return bundles
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
