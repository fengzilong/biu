module.exports = `
  module.exports = function reloadCSS() {
    var links = document.querySelectorAll( 'link[rel="stylesheet"]' )
    var timestamp = +new Date()

    Array.prototype.slice.call( links ).forEach( function ( link ) {
      link.href = link.href.replace( /(\\?\\d+)?$/, '?' + timestamp )
    } )
  }
`
