const path = require( 'path' )
const fs = require( 'fs' )
const fse = require( 'fs-extra' )
const Resolver = require( './resolver' )
const Source = require( './source' )
const CSSPacker = require( './packers/css' )
const JSPacker = require( './packers/js' )

const INSTALL_BUILTIN_SOURCES = Symbol( 'install_builtin_sources' )
const INSTALL_BUILTIN_PACKERS = Symbol( 'install_builtin_packers' )
const DEFAULT_OUT_DIR = path.resolve( process.cwd(), 'dist' )

class Bundler {
  constructor( options = {} ) {
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
      js: JSPacker,
    } )
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
    const source = await this.resolver.createSource( entry )
    source.walk( s => this.sources[ s.id ] = s )
    await this.generate()
  }
  
  splitChunks() {
    
  }

  async generate() {
    const compilation = this.compilation
    const mainChunkName = path.basename( this.entry, path.extname( this.entry ) )

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

    const sources = this.sources

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
          .concat( mainModule )
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

      for ( let [ type, assets ] of Object.entries( collected ) ) {
        const packer = this.resolver.resolvePacker( type, this.options )
        packer.pack( {
          assets,
          compilation,
          chunkName,
          isEntryChunk,
        } )
      }
    }

    await this.emit()
  }

  async emit() {
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
