const path = require( 'path' )
const fs = require( 'fs' )

let sourceId = 0

class Source {
  constructor( options ) {
    this.options = options
    this.mapping = {}
    this.children = []
    this.id = sourceId++

    const content = this.read()
    const parsed = this.parsed = this.parse( content )
    this.dependencies = this.collectDependencies ?
      ( this.collectDependencies( parsed ) || [] ) :
      []
    this.assets = this.generate( parsed )
    this.createGraph()
  }

  read() {
    const filepath = this.filepath

    return fs.readFileSync( filepath ).toString()
  }

  get filepath() {
    return this.options.filepath
  }

  get resolver() {
    return this.options.resolver
  }

  parse() {

  }

  collectDependencies() {

  }

  generate() {

  }

  createGraph() {
    const basedir = path.dirname( this.filepath )

    this.children = []

    this.dependencies.forEach( dep => {
      const childEntry = path.resolve( basedir, dep )
      const childSource = this.resolver.createSource( childEntry )
      this.mapping[ dep ] = childSource.id
      this.children.push( childSource )
    } )
  }

  walk( fn ) {
    fn( this )
    this.children.forEach( child => child.walk( fn ) )
  }
}

module.exports = Source
