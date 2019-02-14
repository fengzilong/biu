/* global document */

module.exports = function ( url ) {
  return new Promise( function ( resolve, reject ) {
    var link = document.createElement( 'link' )
    link.rel = 'stylesheet'
    link.href = url

    link.onerror = function ( e ) {
      reject( e )
    }

    link.onload = function () {
      resolve()
    }

    document.head.appendChild( link )
  } )
}
