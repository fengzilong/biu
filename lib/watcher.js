const { FSWatcher } = require( 'chokidar' )

class Watcher {
  constructor( options = {} ) {
    this.watcher = new FSWatcher( options )
    this.on = this.watcher.on.bind( this.watcher )
  }

  watch( paths ) {
    this.watcher.add( paths )
  }

  unwatch( paths ) {
    this.watcher.unwatch( paths )
  }

  getWatched() {
    return this.watcher.getWatched()
  }

  close() {
    this.watcher.close()
  }
}

module.exports = Watcher
