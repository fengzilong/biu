 module.exports = `
  module.exports = {
    success: function ( message, options ) {
      options = options || {}
      console.log(
        '%cbiu:success%c ' + message,
        'background: #49cd78; color: #fff; padding: 2px 6px;',
        options.bold ? 'font-weight: bold;' : ''
      )
    },
    hmr: function( message, options ) {
      options = options || {}
      console.log(
        '%cbiu:hmr%c ' + message,
        'background: #4978cd; color: #fff; padding: 2px 6px;',
        options.bold ? 'font-weight: bold;' : ''
      )
    },
  }
 `
