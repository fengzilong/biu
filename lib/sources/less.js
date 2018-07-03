const Source = require( '../source' )
const less = require( 'less' )

class LessSource extends Source {
  parse( source ) {
    return less.render( source, {
      filename: this.filepath
    } ).catch( e => console.log( e ) )
  }

  generate( parsed ) {
    this.addAsset( {
      type: 'css',
      source: parsed.css
    } )
  }
}

module.exports = LessSource
