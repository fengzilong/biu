const Source = require( '../source' )
const less = require( 'less' )

class LessSource extends Source {
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

module.exports = LessSource
