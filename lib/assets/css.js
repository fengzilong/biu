const Asset = require( '../asset' )

class CSSAsset extends Asset {
  parse( source ) {
    return source
  }

  generate( source ) {
    const code = `return ${ JSON.stringify( source ) }`
    return [
      { type: 'css', source: code }
    ]
  }
}

module.exports = CSSAsset
