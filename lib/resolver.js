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

  resolveSourceCtor( filepath ) {
    return this.extensions[ path.extname( filepath ) ]
  }
  
  invalidateSource( filepath ) {
    const source = this.existingSources.get( filepath )
    
    if ( source ) {
      source.invalidate()
    }
  }

  async createSource( filepath ) {
    let source = this.existingSources.get( filepath )

    if ( source ) {
      if ( source.isValid() ) {
        await source.ready()
        return source
      }

      // re-init source in existingSources in watch mode
      // shall wait previous ready() to avoid conflicts
      await source.ready()
      await source.init( this )
      return source
    }

    const Source = this.resolveSourceCtor( filepath )

    if ( !Source ) {
      throw new Error( 'Cannot find proper Source to handle file: ' + filepath )
    }

    source = new Source( filepath, this.options )

    this.existingSources.set( filepath, source )

    await source.init( this )
    return source
  }
}

module.exports = Resolver
