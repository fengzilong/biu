const path = require( 'path' )
const fs = require( 'fs' )
const biu = require( './lib' )

const entry = path.resolve( __dirname, 'example/index.js' )
const dest = path.resolve( process.cwd(), 'dist.js' )

const content = biu( entry )
fs.writeFileSync( dest, content )
