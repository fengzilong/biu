const http = require( 'http' )
const WebSocket = require( 'ws' )

module.exports = class HMRServer {
  async start( options ) {
    this.stop()

    this.server = http.createServer()
    this.wss = new WebSocket.Server( {
      server: this.server,
    } )

    await new Promise( resolve => {
      this.server.listen( options.port, resolve )
      console.log( 'HMR server listening on', options.port )
    } )
  }

  stop() {
    if ( this.wss ) {
      this.wss.close()
    }

    if ( this.server ) {
      this.server.close()
    }
  }

  pushUpdate( updates ) {
    this.boardcast( {
      type: 'update',
      data: updates,
    } )
  }

  pushReload() {
    this.boardcast( {
      type: 'reload',
    } )
  }

  boardcast( data ) {
    data = JSON.stringify( data )

    this.wss.clients.forEach( client => {
      if ( client.readyState === WebSocket.OPEN ) {
        client.send( data )
      }
    } )
  }
}
