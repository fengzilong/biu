const singleton = require( '../utils/singleton' )

class CSSPacker {
  constructor() {
    this.reset()
  }

  reset() {
    this.chunks = {}
  }

  pack( cssAsset, chunkName ) {
    this.chunks[ chunkName ] = this.chunks[ chunkName ] || ''
    this.chunks[ chunkName ] += cssAsset.source
  }

  // TODO: move outside, packer should only be responsible for pack
  async generate( { emitFile } = {} ) {
    const chunks = this.chunks
    for ( let [ chunkName, code ] of Object.entries( chunks ) ) {
      await emitFile( `${ chunkName }.css`, code )
    }
  }
}

module.exports = singleton( CSSPacker )
