const singleton = require( '../utils/singleton' )

class CSSDocker {
  constructor() {
    this.reset()
  }

  reset() {
    this.result = ''
  }

  boxup( cssModule ) {
    this.result += cssModule.source
  }

  generate( { emitFile } = {} ) {
    emitFile( 'index.css', this.result )
  }
}

module.exports = singleton( CSSDocker )
