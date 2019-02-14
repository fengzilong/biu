const path = require( 'path' )
const fse = require( 'fs-extra' )
const hashsum = require( 'hash-sum' )
const resolve = require( './utils/resolve' )
const deferred = require( './utils/deferred' )

let sourceId = 0

const READ_SOURCE = Symbol( 'read_source' )
const CREATE_GRAPH = Symbol( 'create_graph' )
const UNREADY = Symbol( 'unready' )
const READY = Symbol( 'ready' )
const HANDLE_DEPENDENCY = Symbol( 'handle_dependency' )

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

  // resolve when source is ready for emit
  waiting() {
    return this.ready_.promise
  }

  async init( bundler ) {
    const oldDependencies = this.dependencies || []
    this.valid = true
    this.mapping = {}
    this.children = []
    this.dependencies = []
    this.assets = []

    this[ UNREADY ]()
    const source = await this[ READ_SOURCE ]()
    this.source = source
    await this.apply( source )
    this.updateHash()
    this.syncLastHashIfNeeded()
    this.diffDependencies( this.dependencies, oldDependencies )
    await this[ CREATE_GRAPH ]( bundler )
    this[ READY ]()
  }

  diffDependencies( ndeps = [], odeps = [] ) {
    let dirty = false

    // add
    ndeps.some( dep => {
      if ( !~odeps.indexOf( dep ) ) {
        dirty = true
        return true
      }

      return false
    } )

    // del
    odeps.some( dep => {
      if ( !~ndeps.indexOf( dep ) ) {
        dirty = true
        return true
      }

      return false
    } )

    this.hmrForceReload = dirty
  }

  // to override
  // please collect dependencies and update hash in this phase
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

  updateHash() {
    this.lastHash = this.hash
    const assets = this.getAssets()
    const content = assets.map( asset => asset.source ).join( '\n' )
    this.hash = hashsum( content )
  }

  syncLastHash() {
    this.lastHash = this.hash
  }

  // when first init source, sync lastHash and hash
  syncLastHashIfNeeded() {
    if (
      typeof this.lastHash === 'undefined' &&
      typeof this.hash !== 'undefined'
    ) {
      this.lastHash = this.hash
    }
  }

  isHashChanged() {
    return this.lastHash !== this.hash
  }

  walk( fn ) {
    fn( this )
    this.children.forEach( child => child.walk( fn ) )
  }

  [ UNREADY ]() {
    this.ready_ = deferred()
  }

  [ READY ]() {
    this.ready_.resolve()
  }

  async [ READ_SOURCE ]() {
    const filepath = this.filepath
    const buffer = await fse.readFile( filepath )
    return buffer.toString()
  }

  async [ CREATE_GRAPH ]( bundler ) {
    const basedir = path.dirname( this.filepath )

    this.children = []

    await Promise.all(
      this.dependencies.map( dependency => {
        return this[ HANDLE_DEPENDENCY ]( dependency, {
          basedir,
          bundler,
        } )
      } )
    )
  }

  async [ HANDLE_DEPENDENCY ]( dependency, { basedir, bundler } = {} ) {
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

    // TODO: check child entry existence before createSource
    const childSource = await bundler.createSource( childEntry )

    this.mapping[ dependency ] = childSource.id
    // calc require times according to this.children
    this.children.push( childSource )
  }
}

module.exports = Source
