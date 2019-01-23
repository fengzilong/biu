const DEFAUTL_ENV = {
  NODE_ENV: 'development'
}

module.exports = function ( options = {} ) {
  const env = Object.assign( DEFAUTL_ENV, options.env )

  return function ( babel ) {
    const { types: t } = babel

    return {
      name: 'env',
      visitor: {
        MemberExpression( path ) {
          if (
            t.isMemberExpression( path.node ) &&
            t.isMemberExpression( path.node.object ) &&
            t.isIdentifier( path.node.object.object ) &&
            t.isIdentifier( path.node.object.property ) &&
            path.node.object.object.name === 'process' &&
            path.node.object.property.name === 'env'
          ) {
            const key = path.node.property.name

            if ( key in env ) {
              const value = env[ key ]
              const map = {
                string: 'stringLiteral',
                number: 'numericLiteral',
                boolean: 'booleanLiteral',
              }

              const builder = t[ map[ typeof value ] ]
              if ( builder ) {
                path.replaceWith( builder( value ) )
              }
            }
          }
        }
      }
    }
  }
}
