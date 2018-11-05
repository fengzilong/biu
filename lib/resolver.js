const path = require( 'path' )
const singleton = require( './utils/singleton' )

class Resolver {
  constructor( options = {} ) {
    this.options = options
    this.extensions = {}
    this.packers = {}
    this.existingSources = new Map()
  }

  registerExtension( ext, Source ) {
    this.extensions[ ext ] = Source
  }
  
  registerPacker( type, Packer ) {
    this.packers[ type ] = singleton( Packer )
  }

  resolvePacker( type, options ) {
    const packer = this.packers[ type ]
    return packer ? packer( options ) : null
  }

  resolveSource( filepath ) {
    return this.extensions[ path.extname( filepath ) ]
  }

  async createSource( filepath ) {
    if ( this.existingSources.has( filepath ) ) {
      const source = this.existingSources.get( filepath )
      source.requiredTimes++
      await source.ready()
      return source
    }

    const Source = this.resolveSource( filepath )

    if ( !Source ) {
      throw new Error( 'Cannot find proper Source to handle file: ' + filepath )
    }

    const source = new Source( filepath, this.options )

    this.existingSources.set( filepath, source )

    await source.init( this )
    return source
  }
}

module.exports = Resolver
