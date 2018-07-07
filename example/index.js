import a from './utils/a.js'
import b from './utils/b.js'
import './index.css'
import './index2.css'
import './style.less'

export default {
  async x() {
    console.log( 'x' )
  },
  y() {
    a()
    b()
  }
}
