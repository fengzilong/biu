const path = require( 'path' )
const assets = require( '../assets' )

class Resolver {
  constructor() {
    this.assetId = 0
  }

  createAsset( { type, entry } ) {
    const asset = new assets[ type ]( entry )

    asset.id = this.assetId++
    asset.ast = asset.parse()
    asset.dependencies = asset.collectDependencies ? asset.collectDependencies() : []
    asset.generated = asset.generate()

    return asset
  }
}

module.exports = Resolver
