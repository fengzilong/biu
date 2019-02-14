import './index.css'
import './index.less'
import hello from './hello'

document.body.onclick = () => hello()

if ( module.hot ) {
  module.hot.accept( './hello', () => {
    document.body.onclick = () => hello()
  } )
}
