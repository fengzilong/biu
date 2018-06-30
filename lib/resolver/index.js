const path = require( 'path' )
const extensions = require( './extensions' )

class Resolver {
  constructor() {
    this.assetId = 0

    this.extensions = {}
    const root = path.join( __dirname, '../assets' )
    for ( let [ ext, assetPath ] of Object.entries( extensions ) ) {
      const realpath = path.resolve( root, assetPath )
      this.extensions[ ext ] = require( realpath )
    }
  }

  resolveAsset( filepath ) {
    return this.extensions[ path.extname( filepath ) ]
  }

  createAsset( entry ) {
    const Asset = this.resolveAsset( entry )
    const asset = new Asset( entry )

    asset.id = this.assetId++
    asset.ast = asset.parse()
    asset.dependencies = asset.dependencies ? asset.dependencies() : []
    asset.generated = asset.generate()

    return asset
  }
}

module.exports = Resolver
