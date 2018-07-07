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
    const sources = this.sources

    let output = '{'

    output = output + Object.keys( sources ).map( id => {
      const source = sources[ id ]
      const assets = source.getAssets()

      // first js module as main module by default
      const mainModule = assets.find( m => m.type === 'js' )

      assets
        .filter( m => m.type !== 'js' )
        .forEach( m => {
          const packer = this.resolver.resolvePacker( m.type )
          packer.pack( m )
          this.packers.add( packer )
        } )

      return `
      /* ${ path.relative( path.dirname( this.entry ), source.filepath ) } */
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
      biuJsonp( ${ output } )
    `

    // output = umd( output, {
    //   name: this.options.name || ''
    // } )

    output = prettier.format( output, { semi: false, parser: 'babylon' } )

    this.emitFile( 'index.js', output )

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
