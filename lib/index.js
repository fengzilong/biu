const Bundler = require( './bundler' )

module.exports = async function ( entry, options ) {
  const bundler = new Bundler( options )
  await bundler.bundle( entry )
  return await bundler.generate()
}
