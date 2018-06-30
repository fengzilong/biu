const fs = require( 'fs' )
const path = require( 'path' )
const babylon = require( 'babylon' )
const traverse = require( 'babel-traverse' ).default
const { transformFromAst } = require( 'babel-core' )

class JavaScriptAsset {
  constructor( filepath ) {
    const content = fs.readFileSync( filepath ).toString()
    this.filepath = filepath
    this.content = content
  }

  collectDependencies() {
    const deps = []

    traverse( this.ast, {
      ImportDeclaration( path ) {
        deps.push( path.node.source.value )
      }
    } )

    return deps
  }

  parse() {
    return babylon.parse( this.content, {
      sourceType: 'module',
    } )
  }

  generate() {
    const { code } = transformFromAst( this.ast, null, {
      presets: [ 'env' ]
    } )

    return code
  }
}

module.exports = JavaScriptAsset
