const Bundler = require( './bundler' )

module.exports = async function ( entry, options ) {
  const startTime = Date.now()

  const bundler = new Bundler( options )
  await bundler.bundle( entry )
  const result = await bundler.generate()

  const costTime = Date.now() - startTime
  console.log( 'CostTime: ', costTime / 1000 + 's' )
}
