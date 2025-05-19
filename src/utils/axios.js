import axios from 'axios';
import router from '@/router';

const config = {
    baseURL: 'http://127.0.0.1:8080',
    // baseURL: '/api',
    headers: {
        'Content-Type': 'application/json;charset=utf-8',
    },
    withCredentials: false,
}

const _axios = axios.create(config)

// 请求拦截器
_axios.interceptors.request.use(
    (config) => {
        if (config.url === '/admin/refresh-token') {
            return config;
        }
        const accessToken = localStorage.getItem("accessToken");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// refreshAccessToken 刷新token
async function refreshAccessToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
        try {
            const response = await _axios.post('/admin/refresh-token', null, {
                headers: { Authorization: `Bearer ${refreshToken}` },
            });

            const { code, message, data } = response.data;
            const { accessToken, refreshToken: newRefreshToken, userID } = data || {};
            if (code === 2000 && message === '') {
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);
                localStorage.setItem('userID', userID);
                _axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
                return true;
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    } else {
        return false;
    }
}

// 响应拦截器
_axios.interceptors.response.use(
    async(response) => {
        const { status, data, config } = response;
        const statusCode = Number(status);

        if (statusCode === 200) {
            const { code } = data;
            switch (code) {
                case 2000:
                    return response;

                case 4010:
                    router.push('/').catch(() => {});
                    return Promise.reject(new Error('Unauthorized'));

                case 4011:
                    router.push('/').catch(() => {});
                    return Promise.reject(new Error('Forbidden'));

                case 4012:
                    const refreshSuccess = await refreshAccessToken();
                    if (refreshSuccess) {
                        return _axios(config);
                    } else {
                        router.push('/').catch(() => {});
                        return Promise.reject(new Error('Refresh token failed'));
                    }

                case 5000:
                    return response;

                default:
                    return response;
            }
        } else {
            return Promise.reject(new Error('Network error'));
        }
    },
    async(error) => {
        return Promise.reject(error);
    }
);

export default _axios;