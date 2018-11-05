class CSSPacker {
  pack( { assets, compilation, chunkName } ) {
    compilation[ `${ chunkName }.css` ] = compilation[ `${ chunkName }.css` ] || ''

    compilation[ `${ chunkName }.css` ] = assets
      .map( a => a.asset.source )
      .join( '' )
  }
}

module.exports = CSSPacker
