import axios, {
    type AxiosInstance,
    type AxiosRequestConfig,
    type AxiosResponse,
} from 'axios';
import router from '@/router';

interface ApiResponse<T = unknown> {
    code: number;
    message: string;
    data: T;
}

const config: AxiosRequestConfig = {
    baseURL: '/api',
    timeout: 60_000,
    headers: {
        'Content-Type': 'application/json;charset=utf-8',
    },
    // token 以 HttpOnly Cookie 形式由后端下发，请求时由浏览器自动携带
    withCredentials: true,
};

const _axios: AxiosInstance = axios.create(config);
const refreshAxios: AxiosInstance = axios.create(config);

// clearAuth 清理前端登录标记（token 为 HttpOnly Cookie，由后端登出接口清除）
function clearAuth(): void {
    localStorage.removeItem('userID');
}

// 并发去重：同一时间只发起一次刷新请求，其余请求复用同一个 Promise
let refreshPromise: Promise<boolean> | null = null;

// refreshAccessToken 刷新 token（refresh_token 通过 HttpOnly Cookie 自动携带）
function refreshAccessToken(): Promise<boolean> {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
        try {
            const response = await refreshAxios.post<ApiResponse>('/admin/refresh-token');
            const { code, message } = response.data;
            return code === 2000 && message === '';
        } catch {
            return false;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

// 响应拦截器
_axios.interceptors.response.use(
    async (response: AxiosResponse<ApiResponse>) => {
        const { status, data, config } = response;
        const statusCode = Number(status);

        if (statusCode !== 200) {
            return Promise.reject(new Error('Network error'));
        }

        const { code } = data;
        switch (code) {
            case 2000:
                return response;

            case 4010:
                clearAuth();
                router.push('/').catch(() => {});
                return Promise.reject(new Error('Unauthorized'));

            case 4011:
                clearAuth();
                router.push('/').catch(() => {});
                return Promise.reject(new Error('Forbidden'));

            case 4012: {
                const refreshSuccess = await refreshAccessToken();
                if (refreshSuccess) {
                    return _axios(config);
                }
                clearAuth();
                router.push('/').catch(() => {});
                return Promise.reject(new Error('Refresh token failed'));
            }

            case 5000:
                return response;

            default:
                return response;
        }
    },
    async (error: unknown) => {
        return Promise.reject(error);
    }
);

export default _axios;
