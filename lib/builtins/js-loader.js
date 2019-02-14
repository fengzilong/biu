/* global document */

module.exports = function ( url ) {
  return new Promise( function ( resolve, reject ) {
    var script = document.createElement( 'script' )
    script.type = 'text/javascript'
    script.async = true
    script.charset = 'utf-8'
    script.src = url

    script.onerror = function ( e ) {
      reject( e )
    }

    script.onload = function () {
      resolve()
    }

    document.head.appendChild( script )
  } )
}
