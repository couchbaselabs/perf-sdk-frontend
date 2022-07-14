import Vue from 'vue'
import App from './App.vue'
// import { MdButton, MdContent, MdTabs, MdSelect } from 'vue-material/dist/components'
// import 'vue-material/dist/vue-material.min.css'
// import 'vue-material/dist/theme/default.css'
import { BootstrapVue, IconsPlugin } from 'bootstrap-vue'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'

Vue.config.productionTip = false
// Vue.use(MdButton)
// Vue.use(MdContent)
// Vue.use(MdTabs)
// Vue.use(MdSelect)

Vue.use(BootstrapVue)
Vue.use(IconsPlugin)

// new Vue({
//   render: h => h(App),
// }).$mount('#app')

window.onpopstate = function(event) {
    console.info(`location: ${document.location}, state: ${JSON.stringify(event.state)}`)
}


import router from './router.ts'

new Vue({
    router,
    render: h => h(App)
}).$mount('#app');

// createApp(App).use(router).mount('#app')