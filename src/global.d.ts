import type { AxiosInstance } from 'axios';

declare global {
    interface Window {
        $axios: AxiosInstance;
        Ribbons?: unknown;
    }
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>;
    export default component;
}

export {};
