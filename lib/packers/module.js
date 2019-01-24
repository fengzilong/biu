const prettier = require( 'prettier' )
const manifest = require( '../templates/manifest' )
// const umd = require( '../formats/umd' )

class ModulePacker {
  pack( modules, options ) {
    const entryModule = modules.find( mod => mod.main = true )

    let output = '{'

    output = output + modules.map( v => {
      return `
      /* ${ v.path } */
      ${ v.from.id }: [
        ${ v.asset.type === 'js' ?
    'function ( module, exports, require ) {' + v.asset.source + '}' :
    `function () {}` },
        ${ JSON.stringify( v.from.mapping ) }
      ]`
    } ).join( ',' )

    output = output + '}'

    output = `
      ${ manifest( 'biuJsonp' ) }
      biuJsonp( ${ ( options.isEntry && entryModule ) ? '[' + entryModule.from.id + ']' : '[]' }, ${ output } )
    `

    output = prettier.format( output, { semi: false, parser: 'babylon' } )

    // output = umd( output, {
    //   name: this.options.name || ''
    // } )

    return output
  }
}

module.exports = ModulePacker
