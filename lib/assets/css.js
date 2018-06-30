const Asset = require( '../asset' )

class CSSAsset extends Asset {
  parse( source ) {
    return source
  }

  generate( source ) {
    return [
      { type: 'css', source }
    ]
  }
}

module.exports = CSSAsset
