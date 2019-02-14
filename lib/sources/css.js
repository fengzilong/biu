module.exports = function ( { api, Source } ) {
  return class CSSSource extends Source {
    apply( source ) {
      this.addAsset( { type: 'css', source } )
      this.addAsset( {
        type: 'js',
        source: `
          var reloadCSS = require( '#builtins/hmr/css' )
          if ( module.hot ) {
            module.hot.acceptSelf()
            module.hot.dispose( reloadCSS )
          }
        `
      } )
    }
  }
}
