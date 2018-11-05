const Bundler = require( './bundler' )

module.exports = async function ( entry, options ) {
  await new Bundler( options ).bundle( entry )
}
