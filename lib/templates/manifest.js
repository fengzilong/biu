module.exports = function ( {
  callbackName,
  hmrPort,
  hmr,
} ) {
  return `
    ( function ( global ) {
      var existingModules = {}
      var installedModules = {}

      if ( global[ ${ JSON.stringify( callbackName ) } ] ) {
        return
      }

      var accepts = {}
      var disposes = {}
      var acceptSelfs = {}

      function createHotModuleAPI( id, mapping ) {
        return {
          accept: function( dependency, callback ) {
            var depId = mapping[ dependency ]
            accepts[ depId ] = accepts[ depId ] || []
            accepts[ depId ].push( callback )
          },

          acceptSelf: function () {
            acceptSelfs[ id ] = true
          },

          dispose: function( callback ) {
            disposes[ id ] = disposes[ id ] || []
            disposes[ id ].push( callback )
          },
        }
      }

      if ( ${ hmr } ) {
        var ws = new WebSocket( 'ws://127.0.0.1:${ hmrPort }' )

        ws.onopen = function () {
          var logger = internalRequire( '#builtins/logger' )
          logger.success( 'HMR server CONNECTED' )
        }

        ws.onmessage = function ( e ) {
          var logger = internalRequire( '#builtins/logger' )
          var message = JSON.parse( e.data )

          logger.hmr( 'applying hmr updates' )

          if ( message.type === 'update' ) {
            var updates = message.data
            updates.forEach( function ( update ) {
              var id = update.id
              var assets = update.assets

              var mainModule = assets.find( function ( asset ) {
                return asset.type === 'js'
              } )

              var fn = new Function(
                'module',
                'exports',
                'require',
                mainModule.source
              )
              var mapping = update.mapping
              existingModules[ id ] = [ fn, mapping ]

              function require( _name ) {
                return internalRequire( mapping[ _name ] || _name, _name )
              }

              var oldModule = installedModules[ id ]
              if ( oldModule ) {
                // prevent hot logic execute twice
                oldModule.hot = false
              } else {
                oldModule = {
                  exports: {},
                }
              }

              // dispose old module
              fn( oldModule, oldModule.exports, require )

              var disposeCallbacks = disposes[ id ] || []
              disposeCallbacks.forEach( function ( callback ) {
                callback()
              } )

              if ( !acceptSelfs[ id ] ) {
                var acceptCallbacks = accepts[ id ] || []
                if ( acceptCallbacks.length === 0 ) {
                  location.reload()
                } else {
                  acceptCallbacks.forEach( function ( callback ) {
                    callback()
                  } )
                }
              }
            } )
          } else if ( message.type === 'reload' ) {
            location.reload()
          }
        }
      }

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

        function require( _name ) {
          return internalRequire( mapping[ _name ] || _name, _name, name )
        }

        var module = installedModules[ id ] = {
          hot: ${ hmr } ? createHotModuleAPI( id, mapping, name ) : void 0,
          exports: {},
        }
        var exports = module.exports

        fn( module, exports, require )

        return module.exports
      }

      global[ ${ JSON.stringify( callbackName ) } ] = function ( executeModuleIds, modules ) {
        // merge
        Object.assign( existingModules, modules )

        // execute
        for ( var i = 0, len = executeModuleIds.length; i < len; i++ ) {
          const id = executeModuleIds[ i ]
          internalRequire( id )
        }
      }
    } )( this );
  `
}
