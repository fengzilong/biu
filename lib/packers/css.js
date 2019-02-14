module.exports = class CSSPacker {
  pack( modules ) {
    return modules
      .map( mod => mod.asset.source )
      .join( '' )
  }
}
