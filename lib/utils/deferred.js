module.exports = function () {
  const tmp = {}

  tmp.promise = new Promise( ( resolve, reject ) => {
    tmp.resolve = resolve
    tmp.reject = reject
  } )

  return tmp
}
