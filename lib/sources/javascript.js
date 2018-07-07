const fs = require( 'fs' )
const path = require( 'path' )
const babylon = require( 'babylon' )
const traverse = require( 'babel-traverse' ).default
const { transformFromAst } = require( 'babel-core' )
const Source = require( '../source' )

class JavaScriptSource extends Source {
  parse( source ) {
    const ast = babylon.parse( source, {
      filename: this.filepath,
      allowReturnOutsideFunction: true,
      allowHashBang: true,
      ecmaVersion: Infinity,
      strictMode: false,
      sourceType: 'module',
      locations: true,
      plugins: ['exportExtensions', 'dynamicImport']
    } )

    return {
      ast,
      source,
    }
  }

  collectDependencies( { ast } ) {
    traverse( ast, {
      ImportDeclaration: path => {
        this.addDependency( path.node.source.value )
      }
    } )
  }

  generate( { ast } ) {
    const { code } = transformFromAst( ast, null, {
      presets: [ 'env' ],
      plugins: [ require( '../babel-plugins/env' )( this.bundler.options ) ]
    } )

    this.addAsset( { type: 'js', source: code } )
  }
}

module.exports = JavaScriptSource
