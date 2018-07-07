const resolve = require( 'resolve' )

module.exports = function ( ...args ) {
  return new Promise( ( res, rej ) => {
    resolve( ...args, function ( err, result ) {
      if ( err ) {
        return rej( err )
      }

      res( result )
    } )
  } )
}
