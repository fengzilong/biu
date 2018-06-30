module.exports = ( Klass, ...args ) => {
  let singleton = null

  return () => {
    if ( singleton ) {
      return singleton
    }

    singleton = new Klass( ...args )
    return singleton
  }
}
