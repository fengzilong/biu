const less = require( 'less' )

module.exports = function ( { api, Source } ) {
  return class LessSource extends Source {
    apply( source ) {
      const result = less.render( source, {
        filename: this.filepath
      } ).catch( e => console.log( e ) )

      this.addAsset( {
        type: 'css',
        source: result.css
      } )
    }
  }
}
