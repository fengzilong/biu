module.exports = function ( callbackName ) {
  return `
    ( function ( global ) {
      var existingModules = {}
      var installedModules = {}

      if ( global[ ${ JSON.stringify( callbackName ) } ] ) {
        return
      }

      global[ ${ JSON.stringify( callbackName ) } ] = function ( executeModuleIds, modules ) {
        // merge
        Object.assign( existingModules, modules )

        function internalRequire( id, name, parentName ) {
          if ( installedModules[ id ] ) {
            return installedModules[ id ].exports
          }

          var mod = existingModules[ id ]

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

        // execute
        for ( var i = 0, len = executeModuleIds.length; i < len; i++ ) {
          const id = executeModuleIds[ i ]
          internalRequire( id )
        }
      }
    } )( this );
  `
}
