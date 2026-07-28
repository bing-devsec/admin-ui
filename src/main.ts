import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import './assets/base.css';
import 'element-plus/dist/index.css';
import 'katex/dist/katex.min.css';
import './assets/article.css';
import './assets/admin-responsive.css';

import _axios from './utils/axios';

const app = createApp(App);

dayjs.locale('zh-cn');

app.use(router);
app.use(ElementPlus, { locale: zhCn });

app.config.globalProperties.$axios = _axios;
window.$axios = _axios;

app.mount('#app');
