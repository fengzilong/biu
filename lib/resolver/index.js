const path = require( 'path' )
const fs = require( 'fs' )
const extensions = require( './extensions' )
const Source = require( '../source' )

const INSTALL_BUILTIN_ASSETS = Symbol( 'install_builtin_assets' )

class Resolver {
  constructor() {
    this.assetId = 0
    this.extensions = {}
    this[ INSTALL_BUILTIN_ASSETS ]()
  }

  registerExtension( ext, Asset ) {
    // TODO: validate Asset is extended from original Asset
    this.extensions[ ext ] = Asset
  }

  resolveAsset( filepath ) {
    return this.extensions[ path.extname( filepath ) ]
  }

  createAsset( filepath ) {
    const Asset = this.resolveAsset( filepath )
    const asset = new Asset( { filepath } )
    const content = fs.readFileSync( filepath ).toString()

    asset.source = new Source( { filepath, content } )
    asset.id = this.assetId++
    const parsed = asset.parsed = asset.parse( content )
    asset.dependencies = asset.collectDependencies ?
      ( asset.collectDependencies( parsed ) || [] ) :
      []
    asset.modules = asset.generate( parsed )

    return asset
  }

  [ INSTALL_BUILTIN_ASSETS ]() {
    const root = path.join( __dirname, '../assets' )
    for ( let [ ext, assetPath ] of Object.entries( extensions ) ) {
      const realpath = path.resolve( root, assetPath )
      this.registerExtension( ext, require( realpath ) )
    }
  }
}

module.exports = Resolver
