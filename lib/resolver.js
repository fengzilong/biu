const path = require( 'path' )
const CSSPacker = require( './packers/css' )
const singleton = require( './utils/singleton' )

const PACKER_MAP = {
  css: CSSPacker
}

class Resolver {
  constructor( { Source } = {} ) {
    this.extensions = {}
    this.Source = Source
  }

  registerExtension( ext, Source ) {
    if ( Source.prototype instanceof this.Source ) {
      this.extensions[ ext ] = Source
    } else {
      throw new Error( 'Source is not extended from Original Source' )
    }
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

  async createSource( filepath ) {
    const Source = this.resolveSource( filepath )
    const source = new Source( { filepath, resolver: this } )
    await source.init()
    return source
  }
}

module.exports = Resolver
