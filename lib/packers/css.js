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

  // TODO: move outside, packer should only be responsible for pack
  generate( { emitFile } = {} ) {
    emitFile( 'index.css', this.result )
  }
}

module.exports = singleton( CSSPacker )
