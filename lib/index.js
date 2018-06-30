const Bundler = require( './bundler' )

module.exports = function ( entry, options ) {
  const bundler = new Bundler()
  bundler.bundle( entry, options )
  return bundler.generate()
}
