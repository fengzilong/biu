const fs = require( 'fs' )
const path = require( 'path' )
const babylon = require( 'babylon' )
const traverse = require( 'babel-traverse' ).default
const { transformFromAst } = require( 'babel-core' )
const Asset = require( '../asset' )

class JavaScriptAsset extends Asset {
  parse( source ) {
    const ast = babylon.parse( source, {
      sourceType: 'module',
    } )

    return {
      ast,
      source,
    }
  }

  collectDependencies( { ast } ) {
    const deps = []

    traverse( ast, {
      ImportDeclaration( path ) {
        deps.push( path.node.source.value )
      }
    } )

    return deps
  }

  generate( { ast } ) {
    const { code } = transformFromAst( ast, null, {
      presets: [ 'env' ]
    } )

    return [
      { type: 'js', source: code }
    ]
  }
}

module.exports = JavaScriptAsset
