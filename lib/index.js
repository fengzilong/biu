const Bundler = require( './bundler' )

module.exports = async function ( entry, options ) {
  const bundler = new Bundler( options )

  const { bundles, sources } = await bundler.bundle( entry )

  const beforeEmitJobs = Object.keys( sources )
    .map( id => sources[ id ] )
    .filter( source => source.beforeEmit )

  if ( beforeEmitJobs.length > 0 ) {
    await Promise.all(
      beforeEmitJobs.map( source => source.beforeEmit( bundles ) )
    )
  }
  await bundler.emitFiles( bundles )
}
