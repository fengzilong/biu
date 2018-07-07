const path = require( 'path' )
const fs = require( 'fs' )
const prettier = require( 'prettier' )
const mkdirp = require( 'mkdirp' )
const Resolver = require( './resolver' )
const umd = require( './formats/umd' )
const Source = require( './source' )
const templates = require( './templates' )

const INSTALL_BUILTIN_SOURCES = Symbol( 'install_builtin_sources' )
const DEFAULT_OUT_DIR = path.resolve( process.cwd(), 'dist' )

class Bundler {
  constructor( options = {} ) {
    this.options = options
    this.sources = {}
    // used packers
    this.packers = new Set()
    this.resolver = new Resolver( { Source, bundler: this } )
    this[ INSTALL_BUILTIN_SOURCES ]( {
      '.js': 'javascript',
      '.less': 'less',
      '.css': 'css'
    } )
  }

  [ INSTALL_BUILTIN_SOURCES ]( extensions ) {
    const root = path.join( __dirname, './sources' )
    for ( let [ ext, sourcePath ] of Object.entries( extensions ) ) {
      const realpath = path.resolve( root, sourcePath )
      this.resolver.registerExtension( ext, require( realpath ) )
    }
  }

  async bundle( entry ) {
    this.entry = entry
    const source = await this.resolver.createSource( entry )
    source.walk( s => this.sources[ s.id ] = s )
  }

  async generate() {
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
      let output = '{'

      output = output + Object.keys( sources ).map( id => {
        const source = sources[ id ]
        const assets = source.getAssets()

        // first js module as main module by default
        const mainModule = assets.find( m => m.type === 'js' )

        assets
          .filter( asset => asset.type !== 'js' )
          .forEach( asset => {
            const packer = this.resolver.resolvePacker( asset.type )
            packer.pack( asset, chunkName )
            this.packers.add( packer )
          } )

        const relativepath = path.relative( path.dirname( this.entry ), source.filepath )

        return `
        /* ${ relativepath } */
        ${ source.id }: [
          ${ mainModule ? wrap( mainModule.source ) : 'function() {}' },
          ${ JSON.stringify( source.mapping ) }
        ]`
      } ).join( ',' )

      function wrap( code ) {
        return `function ( module, exports, require ) {
          ${ code }
        }`
      }

      output += '}'

      output = `
        ${ templates.manifest( 'biuJsonp' ) }
        biuJsonp( ${ chunkName === mainChunkName ? '[ 0 ]' : '[]' }, ${ output } )
      `

      // output = umd( output, {
      //   name: this.options.name || ''
      // } )

      output = prettier.format( output, { semi: false, parser: 'babylon' } )

      this.emitFile( `${ chunkName }.js`, output )
    }

    await this.runPackers()
  }

  async runPackers() {
    for ( let packer of this.packers ) {
      await packer.generate( {
        emitFile: this.emitFile.bind( this )
      } )
    }
  }

  emitFile( filepath, content ) {
    const ourDir = this.options.outDir || DEFAULT_OUT_DIR

    const realpath = path.resolve( ourDir, filepath )

    mkdirp.sync( path.dirname( realpath ) )
    fs.writeFileSync( realpath, content )
  }
}

module.exports = Bundler
