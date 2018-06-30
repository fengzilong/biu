const path = require( 'path' )
const fs = require( 'fs' )
const prettier = require( 'prettier' )
const Resolver = require( './resolver' )
const umd = require( './formats/umd' )

class Bundler {
  constructor() {
    this.assets = {}
    this.resolver = new Resolver()
  }

  // 创建资源关系图
  createGraph() {

  }

  // 收集所有 assets
  bundle( entry, options = {} ) {
    const basedir = path.dirname( entry )
    const asset = this.resolver.createAsset( entry )

    asset.dependencies.forEach( dep => {
      const child = path.resolve( basedir, dep )
      const childAsset = this.bundle( child, options )
      asset.mapping[ dep ] = childAsset.id
      asset.children.push( childAsset )
    } )

    this.assets[ entry ] = asset
    return asset
  }

  generate() {
    let output = '{'

    output = output + Object.keys( this.assets ).map( filepath => {
      const asset = this.assets[ filepath ]
      return `${ asset.id }: {
        fn: ${ wrap( asset.generated ) },
        mapping: ${ JSON.stringify( asset.mapping ) }
      }`
    } ).join( ',' )

    output += '}'

    function wrap( code ) {
      return `function ( module, exports, require ) {
        ${ code }
      }`
    }

    output = `
      ( function ( modules ) {
        function require( id ) {
          const { fn, mapping } = modules[ id ]

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
      name: 'hahaha'
    } )

    output = prettier.format( output, { semi: false, parser: 'babylon' } )

    return output
  }
}

module.exports = Bundler
