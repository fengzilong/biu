import a from './a.js'
import './index.css'
import './index2.css'

export default {
  x() {
    console.log( 'x' )
  },
  y() {
    a()
  }
}
