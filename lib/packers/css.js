const singleton = require( '../utils/singleton' )

class CSSPacker {
  constructor() {
    this.reset()
  }

  reset() {
    this.result = ''
  }

  pack( cssAsset ) {
    this.result += cssAsset.source
  }

  generate( { emitFile } = {} ) {
    emitFile( 'index.css', this.result )
  }
}

module.exports = singleton( CSSPacker )
