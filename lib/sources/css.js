const Source = require( '../source' )

class CSSSource extends Source {
  apply( source ) {
    this.addAsset( { type: 'css', source } )
  }
}

module.exports = CSSSource
