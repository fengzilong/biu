const Bundler = require( './core/Bundler' )

module.exports = function ( entry, options ) {
  const bundler = new Bundler()
  bundler.bundle( entry, options )
  return bundler.generate()
}
