const path = require( 'path' )
const CSSPacker = require( './packers/css' )
const singleton = require( './utils/singleton' )

const PACKER_MAP = {
  css: CSSPacker
}

class Resolver {
  constructor( { Source, bundler } = {} ) {
    this.extensions = {}
    this.Source = Source
    this.bundler = bundler
    this.existingSources = new Map()
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
    if ( this.existingSources.has( filepath ) ) {
      const source = this.existingSources.get( filepath )
      await source.ready()
      return source
    }

    const Source = this.resolveSource( filepath )

    if ( !Source ) {
      throw new Error( 'Cannot find proper Source to handle file: ' + filepath )
    }

    const source = new Source( { filepath, resolver: this, bundler: this.bundler } )

    this.existingSources.set( filepath, source )

    await source.init()
    return source
  }
}

module.exports = Resolver
