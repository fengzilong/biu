const path = require( 'path' )
const fse = require( 'fs-extra' )
const resolve = require( './utils/resolve' )
const deferred = require( './utils/deferred' )

let sourceId = 0

class Source {
  constructor( filepath, options ) {
    this.filepath = filepath
    this.options = options
    this.id = sourceId++
    this.valid = false

    this.mapping = {}
    this.children = []
    this.dependencies = []
    this.assets = []
  }

  invalidate() {
    this.valid = false
  }

  validate() {
    this.valid = true
  }

  isValid() {
    return this.valid
  }

  ready() {
    return this.ready_.promise
  }

  async init( resolver ) {
    this.valid = true
    this.mapping = {}
    this.children = []
    this.dependencies = []
    this.assets = []
    this.ready_ = deferred()
    const content = await this.read()
    const parsed = await this.parse( content )
    await this.collectDependencies( parsed )
    await this.generate( parsed )
    await this.createGraph( resolver )
    this.ready_.resolve()
  }

  async read() {
    const filepath = this.filepath
    const buffer = await fse.readFile( filepath )
    return buffer.toString()
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

  async createGraph( resolver ) {
    const basedir = path.dirname( this.filepath )

    this.children = []

    for ( let dependency of this.dependencies ) {
      let childEntry
      let hasResolveError = false

      try {
        childEntry = await resolve( dependency, {
          basedir,
          extensions: [ '.js', '.css', '.less' ]
        } )
      } catch ( e ) {
        hasResolveError = true
      }

      if ( hasResolveError || !path.isAbsolute( childEntry ) ) {
        childEntry = path.resolve( basedir, dependency )
      }

      // TODO: validate childEntry exists

      const childSource = await resolver.createSource( childEntry )

      this.mapping[ dependency ] = childSource.id
      // record require times by this.children, it's more accurate
      this.children.push( childSource )
    }
  }

  walk( fn ) {
    fn( this )
    this.children.forEach( child => child.walk( fn ) )
  }
}

module.exports = Source
