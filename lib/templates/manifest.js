module.exports = function ( callbackName ) {
  return `
    ( function ( global ) {
      var installedModules = {}

      if ( global[ ${ JSON.stringify( callbackName ) } ] ) {
        return
      }

      global[ ${ JSON.stringify( callbackName ) } ] = function ( modules ) {
        function internalRequire( id, name, parentName ) {
          var mod = modules[ id ] || installedModules[ id ]

          if ( !mod ) {
            throw new Error(
              'MODULE NOT FOUND' +
              ( name ? ': ' + name : '' ) +
              ( parentName ? ' in ' + parentName : '' )
            )
          }

          var fn = mod[ 0 ]
          var mapping = mod[ 1 ]

          var module = installedModules[ id ] = { exports: {} }
          var exports = module.exports

          function require( _name ) {
            return internalRequire( mapping[ _name ], _name, name )
          }

          fn( module, exports, require )

          return module.exports
        }

        return internalRequire( 0 )
      }
    } )( this );
  `
}
