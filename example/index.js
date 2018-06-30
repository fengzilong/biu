import a from './a.js'
import './index.css'

export default {
  x() {
    console.log( 'x' )
  },
  y() {
    a()
  }
}
