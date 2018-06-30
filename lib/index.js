const Bundler = require( './bundler' )

module.exports = function ( entry, options ) {
  const bundler = new Bundler( options )
  bundler.bundle( entry )
  return bundler.generate()
}
