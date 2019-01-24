class CSSPacker {
  pack( modules ) {
    return modules
      .map( a => a.asset.source )
      .join( '' )
  }
}

module.exports = CSSPacker
