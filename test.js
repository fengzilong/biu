const path = require( 'path' )
const biu = require( './lib' )
const fse = require( 'fs-extra' )

process.on( 'unhandledRejection', ( reason, p ) => {
  console.log( 'Unhandled Rejection at:', p, 'reason:', reason )
} )

const entry = path.resolve( __dirname, 'examples/complex/index.html' )
const outDir = path.resolve( process.cwd(), '.out' )

;( async () => {
  await fse.emptyDir( outDir )

  const startTime = Date.now()

  await biu( entry, {
    name: 'www',
    outDir,
    env: {
      NODE_ENV: 'production'
    },
    watch: true,
  } )

  const costTime = Date.now() - startTime
  console.log( 'CostTime: ', ( costTime / 1000 ) + 's' )
} )()
