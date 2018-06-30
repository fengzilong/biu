const path = require( 'path' )
const fs = require( 'fs' )
const prettier = require( 'prettier' )
const Resolver = require( './resolver' )
const umd = require( './formats/umd' )

class Bundler {
  constructor( options = {} ) {
    this.options = options
    this.assets = {}
    this.resolver = new Resolver()
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

    let output = '{'

    output = output + Object.keys( assets ).map( filepath => {
      const asset = assets[ filepath ]

      // first module as main module by default
      const mainModule = asset.modules[ 0 ]

      return `${ asset.id }: [
        ${ wrap( mainModule.source ) },
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

    return output
  }
}

module.exports = Bundler
