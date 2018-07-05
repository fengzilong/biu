import a from './a.js'
import './index.css'
import './index2.css'
import './style.less'

export default {
  async x() {
    console.log( 'x' )
    const lazy = await import( './lazy' )
    lazy()
  },
  y() {
    a()
  }
}
