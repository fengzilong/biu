const fs = require( 'fs' )
const path = require( 'path' )
const babylon = require( 'babylon' )
const traverse = require( 'babel-traverse' ).default
const { transformFromAst } = require( 'babel-core' )
const Asset = require( '../asset' )

class JavaScriptAsset extends Asset {
  parse( content ) {
    return babylon.parse( content, {
      sourceType: 'module',
    } )
  }

  dependencies( ast ) {
    const deps = []

    traverse( ast, {
      ImportDeclaration( path ) {
        deps.push( path.node.source.value )
      }
    } )

    return deps
  }

  generate() {
    const { code } = transformFromAst( this.ast, null, {
      presets: [ 'env' ]
    } )

    return code
  }
}

module.exports = JavaScriptAsset
