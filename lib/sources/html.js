const path = require( 'path' )
const posthtml = require( 'posthtml' )

const instance = posthtml()

module.exports = function ( { api, Source } ) {
  return class HTMLSource extends Source {
    async apply( source ) {
      const filepath = this.filepath
      const basedir = path.dirname( filepath )

      await instance
        .use( tree => {
          const nodes = findAll( tree, { tag: 'script' } )
          const sources = nodes
            .map( node => node.attrs && node.attrs.src )
            .filter( Boolean )

          sources.forEach( this.addDependency.bind( this ) )
        } )
        .process( source )
    }

    // html as entry
    async beforeEmit( bundles ) {
      const result = await instance
        .use( tree => {
          addBundlesToTree( tree, bundles )
        } )
        .process( this.source )

      bundles.push( {
        type: 'html',
        content: result.html,
        filename: path.basename( this.filepath ),
      } )
    }
  }
}

function addBundlesToTree( tree, bundles = [] ) {
  tree.match( { tag: 'script' }, node => '' )

  const htmlNode = find( tree, { tag: 'html' } )

  if ( !htmlNode ) {
    return
  }

  const linkTags = bundles
    .filter( bundle => bundle.type === 'css' )
    .map( bundle => ( {
      tag: 'link',
      attrs: {
        rel: 'stylesheet',
        href: './' + bundle.filename
      }
    } ) )

  const scriptTags = bundles
    .filter( bundle => bundle.type === 'js' )
    .map( bundle => ( {
      tag: 'script',
      attrs: {
        src: './' + bundle.filename
      }
    } ) )

  const head = find( tree, { tag: 'head' } )
  const body = find( tree, { tag: 'body' } )

  if ( linkTags.length > 0 ) {
    head.content.push.apply( head.content, linkTags )
    head.content.push( '\n' )
  }

  if ( scriptTags.length > 0 ) {
    body.content.push.apply( body.content, scriptTags )
    body.content.push( '\n' )
  }
}

function walk( root, parent = null, callback ) {
  callback( root, parent )

  if ( root.content ) {
    root.content.forEach( node => {
      callback( node, root )
      walk( node, root, callback )
    } )
  }
}

function find( tree, filter ) {
  return findAll( tree, filter )[ 0 ]
}

function findAll( tree, filter ) {
  let nodes = []

  tree.match( filter, node => {
    nodes.push( node )
    return node
  } )

  return nodes
}
