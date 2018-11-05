const path = require( 'path' )
const biu = require( './lib' )
const fse = require( 'fs-extra' )

const entry = path.resolve( __dirname, 'examples/duplicated-source/index.js' )
const outDir = path.resolve( process.cwd(), '.out' )

;( async () => {
  await fse.emptyDir( outDir )

  const startTime = Date.now()
  
  await biu( entry, {
    name: 'www',
    outDir,
    env: {
      NODE_ENV: 'production'
    }
  } )
  
  const costTime = Date.now() - startTime
  console.log( 'CostTime: ', costTime / 1000 + 's' )
} )()
