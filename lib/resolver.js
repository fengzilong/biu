const path = require( 'path' )
const CSSPacker = require( './packers/css' )
const singleton = require( './utils/singleton' )

const PACKER_MAP = {
  css: CSSPacker
}

class Resolver {
  constructor() {
    this.extensions = {}
  }

  registerExtension( ext, Source ) {
    // TODO: validate Source is extended from original Source
    this.extensions[ ext ] = Source
  }

  resolvePacker( type ) {
    const singleton = PACKER_MAP[ type ]
    if ( singleton ) {
      return singleton()
    }
  }

  resolveSource( filepath ) {
    return this.extensions[ path.extname( filepath ) ]
  }

  createSource( filepath ) {
    const Source = this.resolveSource( filepath )
    return new Source( { filepath, resolver: this } )
  }
}

module.exports = Resolver
