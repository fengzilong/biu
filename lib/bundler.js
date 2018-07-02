const path = require( 'path' )
const fs = require( 'fs' )
const prettier = require( 'prettier' )
const Resolver = require( './resolver' )
const extensions = require( './resolver/extensions' )
const umd = require( './formats/umd' )

const INSTALL_BUILTIN_SOURCES = Symbol( 'install_builtin_sources' )
const DEFAULT_OUT_DIR = path.resolve( process.cwd(), 'dist' )

class Bundler {
  constructor( options = {} ) {
    this.options = options
    this.sources = {}
    // used packers
    this.packers = new Set()
    this.resolver = new Resolver()
    this[ INSTALL_BUILTIN_SOURCES ]( extensions )
  }

  [ INSTALL_BUILTIN_SOURCES ]( extensions ) {
    const root = path.join( __dirname, './sources' )
    for ( let [ ext, sourcePath ] of Object.entries( extensions ) ) {
      const realpath = path.resolve( root, sourcePath )
      this.resolver.registerExtension( ext, require( realpath ) )
    }
  }

  bundle( entry ) {
    const source = this.resolver.createSource( entry )
    source.walk( s => this.sources[ s.filepath ] = s )
  }

  generate() {
    const sources = this.sources

    let output = '{'

    output = output + Object.keys( sources ).map( filepath => {
      const source = sources[ filepath ]

      // first js module as main module by default
      const mainModule = source.assets.find( m => m.type === 'js' )

      source.assets
        .filter( m => m.type !== 'js' )
        .forEach( m => {
          const packer = this.resolver.resolvePacker( m.type )
          packer.pack( m )
          this.packers.add( packer )
        } )

      return `${ source.id }: [
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
      function () {
        var modules = ${ output }

        function require( id ) {
          var mod = modules[ id ]
          var fn = mod[ 0 ]
          var mapping = mod[ 1 ]

          var module = { exports: {} }
          var exports = module.exports

          function requireByName( name ) {
            return require( mapping[ name ] )
          }

          fn( module, exports, requireByName )

          return module.exports
        }

        return require( 0 )
      }
    `

    output = umd( output, {
      name: this.options.name || ''
    } )

    output = prettier.format( output, { semi: false, parser: 'babylon' } )

    this.emitFile( 'index.js', output )

    this.end()
  }

  end() {
    this.packers.forEach( packer => {
      packer.generate( {
        emitFile: this.emitFile.bind( this )
      } )
    } )
  }

  emitFile( filepath, content ) {
    const ourDir = this.options.outDir || DEFAULT_OUT_DIR

    const realpath = path.resolve( ourDir, filepath )

    // TODO: mkdirp

    fs.writeFileSync( realpath, content )
  }
}

module.exports = Bundler
