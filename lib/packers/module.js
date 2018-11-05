const prettier = require( 'prettier' )
const templates = require( '../templates' )
const umd = require( '../formats/umd' )

class ModulePacker {
  pack( { assets, compilation, chunkName, isEntryChunk } ) {
    let output = '{'

    output += assets.map( v => {
      return `
      /* ${ v.path } */
      ${ v.from.id }: [
        ${
          v.asset.type === 'js' ?
          'function ( module, exports, require ) {' + v.asset.source + '}' :
          `function () {}`
        },
        ${ JSON.stringify( v.from.mapping ) }
      ]`
    } ).join( ',' )
    
    output += '}'
    
    output = `
      ${ templates.manifest( 'biuJsonp' ) }
      biuJsonp( ${ isEntryChunk ? '[ 0 ]' : '[]' }, ${ output } )
    `
    
    output = prettier.format( output, { semi: false, parser: 'babylon' } )
    
    // output = umd( output, {
    //   name: this.options.name || ''
    // } )
    
    compilation[ `${ chunkName }.js` ] = output
  }
}

module.exports = ModulePacker