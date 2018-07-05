import a from './lazy-a'

export default function () {
  console.log( 'lazy loaded' )
  a()
}
