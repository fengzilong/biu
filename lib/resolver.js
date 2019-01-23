const path = require( 'path' )
const singleton = require( './utils/singleton' )

class Resolver {
  constructor( options = {} ) {
    this.options = options
    this.sources = {}
    this.packers = {}
  }

  registerSource( ext, Source ) {
    this.sources[ ext ] = Source
  }

  registerPacker( type, Packer ) {
    this.packers[ type ] = singleton( Packer )
  }

  resolvePacker( type, options ) {
    const packer = this.packers[ type ]
    return packer ? packer( options ) : null
  }

  resolveSource( filepath ) {
    return this.sources[ path.extname( filepath ) ]
  }
}

module.exports = Resolver
