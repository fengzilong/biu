const prettier = require( 'prettier' )
// const umd = require( '../formats/umd' )

// pack all js modules
module.exports = class JSPacker {
  pack( modules, options = {} ) {
    let output = '{' +
      modules
        .map( mod => {
          return `
            ${ mod.path ? '/* ' + mod.path + ' */' : '' }
            "${ mod.from.id }": [
              function ( module, exports, require ) { ${ mod.asset.source } },
              ${ JSON.stringify( mod.from.mapping ) }
            ]`
        } )
        .filter( Boolean )
        .join( ',' ) +
      '}'

    output = `
      biuJsonp( ${ JSON.stringify( options.executeIds || [] ) }, ${ output } )
    `

    output = prettier.format( output, { semi: false, parser: 'babylon' } )

    // output = umd( output, {
    //   name: this.options.name || ''
    // } )

    return output
  }
}
