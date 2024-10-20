import { createApp } from 'vue'
import App from './App.vue'
import router from './router'


import ElementPlus from 'element-plus'

import './assets/base.css' 
import 'element-plus/dist/index.css'

import _axios from './utils/axios'

const app = createApp(App)

app.use(router)
app.use(ElementPlus)

app.config.globalProperties.$axios = _axios
window.$axios = _axios

app.mount('#app')