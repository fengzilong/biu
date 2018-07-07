import a from './utils/a.js'
import b from './utils/b.js'
import './index.css'
import './index2.css'
import './style.less'
// import vue from 'vue'

const obj = {
  x() {
    console.log( 'x' )
    // console.log( vue )
  },
  y() {
    a()
    b()
  }
}

obj.x()
obj.y()
