import a from './a.js'
import './index.css'
import './index2.css'
import './style.less'

export default {
  x() {
    console.log( 'x' )
  },
  y() {
    a()
  }
}
