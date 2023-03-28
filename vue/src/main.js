import { createApp } from 'vue'

import App from './App.vue'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'

import router from './router.ts'

const app = createApp(App)
app.use(router)

app.mount('#app')
