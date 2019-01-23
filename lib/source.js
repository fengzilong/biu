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

  validate() {
    this.valid = true
  }

  invalidate() {
    this.valid = false
  }

  isValid() {
    return this.valid
  }

  unready() {
    this.ready_ = deferred()
  }

  // source is ready for emit
  waiting() {
    return this.ready_.promise
  }

  ready() {
    this.ready_.resolve()
  }

  async init( bundler ) {
    this.valid = true
    this.mapping = {}
    this.children = []
    this.dependencies = []
    this.assets = []
    this.unready()

    const content = await this.read()
    await this.apply( content )
    await this.createGraph( bundler )
    this.ready()
  }

  async read() {
    const filepath = this.filepath
    const buffer = await fse.readFile( filepath )
    return buffer.toString()
  }

  // override it when write your own source
  apply() {}

  addDependency( dependency ) {
    this.dependencies.push( dependency )
  }

  addAsset( asset ) {
    this.assets.push( asset )
  }

  getAssets() {
    return this.assets
  }

  async createGraph( bundler ) {
    const basedir = path.dirname( this.filepath )

    this.children = []

    await Promise.all(
      this.dependencies.map( dependency => {
        return this.handleDependency( dependency, {
          basedir,
          bundler,
        } )
      } )
    )
  }

  async handleDependency( dependency, { basedir, bundler } = {} ) {
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

    // TODO: check childEntry exists

    const childSource = await bundler.createSource( childEntry )

    this.mapping[ dependency ] = childSource.id
    // record require times by this.children, it's more accurate
    this.children.push( childSource )
  }

  walk( fn ) {
    fn( this )
    this.children.forEach( child => child.walk( fn ) )
  }
}

module.exports = Source
