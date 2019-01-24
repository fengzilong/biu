module.exports = function ( { api, Source } ) {
  return class CSSSource extends Source {
    apply( source ) {
      this.addAsset( { type: 'css', source } )
    }
  }
}
