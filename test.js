const path = require( 'path' )
const biu = require( './lib' )
const fse = require( 'fs-extra' )

const entry = path.resolve( __dirname, 'examples/simple/index.js' )
const outDir = path.resolve( process.cwd(), '.out' )

;( async () => {
  await fse.emptyDir( outDir )

  biu( entry, {
    name: 'www',
    outDir,
    env: {
      NODE_ENV: 'production'
    }
  } )
} )()
