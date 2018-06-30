const path = require( 'path' )
const fs = require( 'fs' )
const extensions = require( './extensions' )
const Source = require( '../source' )

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

  createAsset( filepath ) {
    const Asset = this.resolveAsset( filepath )
    const asset = new Asset( { filepath } )
    const content = fs.readFileSync( filepath ).toString()

    asset.source = new Source( { filepath, content } )
    asset.id = this.assetId++
    asset.ast = asset.parse( content )
    asset.dependencies = asset.dependencies ?
      asset.dependencies( asset.ast ) :
      []
    asset.generated = asset.generate()

    return asset
  }
}

module.exports = Resolver
