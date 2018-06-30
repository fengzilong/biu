module.exports = function ( content, options ) {
  const name = options.name

  if ( !name ) {
    throw new Error( 'expect name' )
  }

  return `
    (function (global, factory) {
      if (typeof module !== 'undefined' && typeof exports === 'object') {
        // CommonJS
        module.exports = factory();
      } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
      } else {
        // Global Variables
        global.${ name } = factory();
      }
    }(
      this,
      ${ content }
    ));
  `
}
