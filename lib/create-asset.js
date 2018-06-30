const path = require( 'path' )
const assets = require( './assets' )

let assetId = 0

module.exports = function createAsset( { type, entry } ) {
  const asset = new assets[ type ]( entry )
  asset.id = assetId++
  asset.ast = asset.parse()
  asset.dependencies = asset.collectDependencies ? asset.collectDependencies() : []
  asset.generated = asset.generate()

  return asset
}
