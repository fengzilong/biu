const path = require( 'path' )
const singleton = require( './utils/singleton' )
const Source = require( './Source' )

class Resolver {
  constructor( options = {} ) {
    this.options = options
    this.sources = {}
    this.packers = {}
    this.builtins = {}
  }

  registerBuiltinModule( id, source ) {
    this.builtins[ id ] = {
      path: null,
      isBuiltin: true,
      asset: {
        type: 'js',
        source,
      },
      from: {
        id,
        mapping: {}
      }
    }
  }

  getBuiltinModules() {
    return Object.keys( this.builtins )
      .map( id => this.builtins[ id ] )
  }

  registerSource( ext, createSource ) {
    this.sources[ ext ] = createSource( {
      api: this.options.api,
      Source,
    } )
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
