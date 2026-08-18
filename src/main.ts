import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import {
    ElAlert,
    ElButton,
    ElCalendar,
    ElCheckbox,
    ElContainer,
    ElDatePicker,
    ElDialog,
    ElDivider,
    ElDrawer,
    ElDropdown,
    ElEmpty,
    ElForm,
    ElIcon,
    ElImage,
    ElInput,
    ElInputNumber,
    ElLoading,
    ElMenu,
    ElMessage,
    ElMessageBox,
    ElNotification,
    ElPagination,
    ElPopover,
    ElRadio,
    ElSegmented,
    ElSelect,
    ElTable,
    ElTabs,
    ElTag,
    provideGlobalConfig,
} from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

import './assets/base.css';
import 'element-plus/es/components/alert/style/css.mjs';
import 'element-plus/es/components/button/style/css.mjs';
import 'element-plus/es/components/calendar/style/css.mjs';
import 'element-plus/es/components/checkbox/style/css.mjs';
import 'element-plus/es/components/container/style/css.mjs';
import 'element-plus/es/components/date-picker/style/css.mjs';
import 'element-plus/es/components/dialog/style/css.mjs';
import 'element-plus/es/components/divider/style/css.mjs';
import 'element-plus/es/components/drawer/style/css.mjs';
import 'element-plus/es/components/dropdown/style/css.mjs';
import 'element-plus/es/components/empty/style/css.mjs';
import 'element-plus/es/components/form/style/css.mjs';
import 'element-plus/es/components/icon/style/css.mjs';
import 'element-plus/es/components/image/style/css.mjs';
import 'element-plus/es/components/input/style/css.mjs';
import 'element-plus/es/components/input-number/style/css.mjs';
import 'element-plus/es/components/loading/style/css.mjs';
import 'element-plus/es/components/menu/style/css.mjs';
import 'element-plus/es/components/message/style/css.mjs';
import 'element-plus/es/components/message-box/style/css.mjs';
import 'element-plus/es/components/notification/style/css.mjs';
import 'element-plus/es/components/pagination/style/css.mjs';
import 'element-plus/es/components/popover/style/css.mjs';
import 'element-plus/es/components/radio/style/css.mjs';
import 'element-plus/es/components/radio-button/style/css.mjs';
import 'element-plus/es/components/radio-group/style/css.mjs';
import 'element-plus/es/components/segmented/style/css.mjs';
import 'element-plus/es/components/select/style/css.mjs';
import 'element-plus/es/components/table/style/css.mjs';
import 'element-plus/es/components/tabs/style/css.mjs';
import 'element-plus/es/components/tag/style/css.mjs';
import './assets/article.css';
import './assets/admin-responsive.css';

import _axios from './utils/axios';

const app = createApp(App);

dayjs.locale('zh-cn');

app.use(router);
[
    ElAlert,
    ElButton,
    ElCalendar,
    ElCheckbox,
    ElContainer,
    ElDatePicker,
    ElDialog,
    ElDivider,
    ElDrawer,
    ElDropdown,
    ElEmpty,
    ElForm,
    ElIcon,
    ElImage,
    ElInput,
    ElInputNumber,
    ElLoading,
    ElMenu,
    ElMessage,
    ElMessageBox,
    ElNotification,
    ElPagination,
    ElPopover,
    ElRadio,
    ElSegmented,
    ElSelect,
    ElTable,
    ElTabs,
    ElTag,
].forEach((plugin) => app.use(plugin));
provideGlobalConfig({ locale: zhCn }, app, true);

app.config.globalProperties.$axios = _axios;
window.$axios = _axios;

app.mount('#app');
