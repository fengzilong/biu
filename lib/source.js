const path = require( 'path' )
const fs = require( 'fs' )
const deferred = require( './utils/deferred' )

let sourceId = 0

class Source {
  constructor( options ) {
    this.options = options
    this.mapping = {}
    this.children = []
    this.dependencies = []
    this.assets = []
    this.id = sourceId++
    this.ready_ = deferred()
  }

  ready() {
    return this.ready_.promise
  }

  async init() {
    const content = await this.read()
    const parsed = await this.parse( content )
    await this.collectDependencies( parsed )
    await this.generate( parsed )
    await this.createGraph()
    this.ready_.resolve()
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

  addDependency( dependency ) {
    this.dependencies.push( dependency )
  }

  addAsset( asset ) {
    this.assets.push( asset )
  }

  getAssets() {
    return this.assets
  }

  async createGraph() {
    const basedir = path.dirname( this.filepath )

    this.children = []

    for ( let dependency of this.dependencies ) {
      const childEntry = path.resolve( basedir, dependency )
      const childSource = await this.resolver.createSource( childEntry )
      this.mapping[ dependency ] = childSource.id
      this.children.push( childSource )
    }
  }

  walk( fn ) {
    fn( this )
    this.children.forEach( child => child.walk( fn ) )
  }
}

module.exports = Source
