const less = require( 'less' )

module.exports = function ( { api, Source } ) {
  return class LessSource extends Source {
    async apply( source ) {
      try {
        const result = await less.render( source, {
          filename: this.filepath
        } )

        this.addAsset( {
          type: 'css',
          source: result.css
        } )
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
      } catch ( e ) {
        console.log( e )
      }
    }
  }
}
