const path = require( 'path' )
const fs = require( 'fs' )
const prettier = require( 'prettier' )
const Resolver = require( './resolver' )
const umd = require( './formats/umd' )

const DEFAULT_OUT_DIR = path.resolve( process.cwd(), 'dist' )

class Bundler {
  constructor( options = {} ) {
    this.options = options
    this.assets = {}
    this.resolver = new Resolver()
    // used dockers
    this.dockers = new Set()
  }

  bundle( entry ) {
    const basedir = path.dirname( entry )
    const asset = this.resolver.createAsset( entry )

    asset.dependencies.forEach( dep => {
      const child = path.resolve( basedir, dep )
      const childAsset = this.bundle( child )
      asset.mapping[ dep ] = childAsset.id
      asset.children.push( childAsset )
    } )

    this.assets[ entry ] = asset
    return asset
  }

  generate() {
    const assets = this.assets
    const resolver = this.resolver

    let output = '{'

    output = output + Object.keys( assets ).map( filepath => {
      const asset = assets[ filepath ]

      // first js module as main module by default
      const mainModule = asset.modules.find( m => m.type === 'js' )

      asset.modules
        .filter( m => m.type !== 'js' )
        .forEach( m => {
          const docker = resolver.resolveDocker( m.type )
          docker.boxup( m )
          this.dockers.add( docker )
        } )

      return `${ asset.id }: [
        ${ mainModule ? wrap( mainModule.source ) : 'function() {}' },
        ${ JSON.stringify( asset.mapping ) }
      ]`
    } ).join( ',' )

    function wrap( code ) {
      return `function ( module, exports, require ) {
        ${ code }
      }`
    }

    output += '}'

    output = `
      ( function ( modules ) {
        function require( id ) {
          const [ fn, mapping ] = modules[ id ]

          const module = { exports: {} }
          const exports = module.exports

          function requireByName( name ) {
            return require( mapping[ name ] )
          }

          fn( module, exports, requireByName )

          return module.exports
        }

        return require( 0 )
      } ).bind( this, ${ output } )
    `

    output = umd( output, {
      name: this.options.name || ''
    } )

    output = prettier.format( output, { semi: false, parser: 'babylon' } )

    this.emitFile( 'index.js', output )

    this.end()
  }

  end() {
    this.dockers.forEach( docker => {
      docker.generate( {
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
