const path = require( 'path' )
const biu = require( './lib' )

const entry = path.resolve( __dirname, 'example/index.js' )
const outDir = path.resolve( process.cwd(), '.out' )

biu( entry, {
  name: 'www',
  outDir,
  env: {
    NODE_ENV: 'production'
  }
} )
