const Source = require( '../source' )

class CSSSource extends Source {
  parse( source ) {
    return source
  }

  generate( source ) {
    this.addAsset( { type: 'css', source } )
  }
}

module.exports = CSSSource
