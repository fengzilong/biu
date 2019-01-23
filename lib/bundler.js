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
    this.resolver = new Resolver( options )
    this.compilation = {}

    this[ INSTALL_BUILTIN_SOURCES ]( {
      '.js': 'javascript',
      '.less': 'less',
      '.css': 'css',
    } )

    this[ INSTALL_BUILTIN_PACKERS ]( {
      css: CSSPacker,
      module: ModulePacker,
    } )

    if ( options.watch ) {
      this.bundleTimer = null

      const invalidateAndRebundle = type => filepath => {
        this.resolver.invalidateSource( filepath )

        if ( this.bundleTimer ) {
          clearTimeout( this.bundleTimer )
        }

        setTimeout( async () => {
          const changed = path.relative( this.entrydir, filepath )
          console.log( `Rebuild as file ${ chalk.blue( changed ) } ${ type }` )

          // re-init invalid sources
          const sources = this.sources

          for ( let [ , source ] of Object.entries( sources ) ) {
            if ( !source.isValid() ) {
              await source.ready()
              await source.init( this.resolver )
            }
          }

          await this.generate()
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
    const root = path.join( __dirname, './sources' )
    for ( let [ ext, sourcePath ] of Object.entries( extensions ) ) {
      const realpath = path.resolve( root, sourcePath )
      this.resolver.registerExtension( ext, require( realpath ) )
    }
  }

  [ INSTALL_BUILTIN_PACKERS ]( packers ) {
    for ( let [ type, Packer ] of Object.entries( packers ) ) {
      this.resolver.registerPacker( type, Packer )
    }
  }

  async bundle( entry ) {
    this.entry = entry
    this.entrydir = path.dirname( entry )
    const source = await this.resolver.createSource( entry )

    const paths = new Set()
    source.walk( s => {
      this.sources[ s.id ] = s
      paths.add( s.filepath )
    } )
    await this.generate()
    this.watch( Array.from( paths ) )
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

  async generate() {
    const compilation = this.compilation
    const mainChunkName = path.basename( this.entry, path.extname( this.entry ) )
    const sources = this.sources

    const chunks = this.splitChunks( sources, mainChunkName )

    for ( let [ chunkName, sources ] of Object.entries( chunks ) ) {
      const collected = {}
      const isEntryChunk = chunkName === mainChunkName

      Object.keys( sources ).forEach( id => {
        const source = sources[ id ]
        const assets = source.getAssets()

        // first js module as main module by default
        const mainModule = assets.find( m => m.type === 'js' )
        const p = path.relative( path.dirname( this.entry ), source.filepath )

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
          packer.pack( {
            assets,
            compilation,
            chunkName,
            isEntryChunk,
          } )
        }
        modules = modules.concat( assets )
      }

      // always pass to module packer to wrap them in module templates
      const mp = this.resolver.resolvePacker( 'module', this.options )
      mp.pack( {
        assets: modules,
        compilation,
        chunkName,
        isEntryChunk,
      } )
    }

    await this.emitFiles()
  }

  async emitFiles() {
    const compilation = this.compilation

    for ( let [ filepath, content ] of Object.entries( compilation ) ) {
      await this.emitFile( filepath, content )
    }
  }

  async emitFile( filepath, content ) {
    const ourDir = this.options.outDir || DEFAULT_OUT_DIR
    const realpath = path.resolve( ourDir, filepath )
    await fse.outputFile( realpath, content )
  }
}

module.exports = Bundler
