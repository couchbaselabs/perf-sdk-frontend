import Vue from 'vue'
import App from './App.vue'
import { MdButton, MdContent, MdTabs, MdSelect } from 'vue-material/dist/components'
import 'vue-material/dist/vue-material.min.css'
import 'vue-material/dist/theme/default.css'

Vue.config.productionTip = false
Vue.use(MdButton)
Vue.use(MdContent)
Vue.use(MdTabs)
Vue.use(MdSelect)

new Vue({
  render: h => h(App),
}).$mount('#app')
