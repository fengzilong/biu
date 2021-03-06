const babylon = require( 'babylon' )
const traverse = require( 'babel-traverse' ).default
const { transformFromAst } = require( 'babel-core' )

module.exports = function ( { api, Source } ) {
  return class JavaScriptSource extends Source {
    apply( source ) {
      const ast = babylon.parse( source, {
        filename: this.filepath,
        allowReturnOutsideFunction: true,
        allowHashBang: true,
        ecmaVersion: Infinity,
        strictMode: false,
        sourceType: 'module',
        locations: true,
        plugins: [ 'exportExtensions', 'dynamicImport' ]
      } )

      traverse( ast, {
        ImportDeclaration: path => {
          this.addDependency( path.node.source.value )
        }
      } )

      const { code } = transformFromAst( ast, null, {
        presets: [ 'env' ],
        plugins: [ require( '../babel-plugins/env' )( this.options.env ) ]
      } )

      this.addAsset( { type: 'js', source: code } )
    }
  }
}
