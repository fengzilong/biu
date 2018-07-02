const Source = require( '../source' )

class CSSSource extends Source {
  parse( source ) {
    return source
  }

  generate( source ) {
    return [
      { type: 'css', source }
    ]
  }
}

module.exports = CSSSource
