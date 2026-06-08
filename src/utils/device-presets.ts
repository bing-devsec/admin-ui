// 移动设备预设：CSS 视口尺寸（竖屏宽 × 高）
// 数据来源：Apple 官方规格、screensizechecker.com、yesviz.com、xiaomi.com / antutu.com / eet-china.com
//
// 注意：CSS 视口宽 = 物理分辨率 / DPR。Android 视口宽会受系统显示缩放影响，
//       这里取常见浏览器在默认缩放下的实测值，用于布局参考即可。

/** 设备品类：用于在编辑器中区分手机和平板，影响外壳样式（刘海/Home 条仅手机展示） */
export type DeviceCategory = 'phone' | 'tablet';

export interface DevicePreset {
    /** 唯一 key，用于下拉选择 */
    id: string;
    /** 显示名 */
    label: string;
    /** 设备品类 */
    category: DeviceCategory;
    /** 厂商分组 */
    brand: 'Apple' | 'Xiaomi' | 'Generic';
    /** 竖屏 CSS 宽度 (px) */
    width: number;
    /** 竖屏 CSS 高度 (px) */
    height: number;
    /** 设备像素比（仅展示用） */
    dpr: number;
    /** 屏幕物理尺寸（英寸） */
    inch?: number;
}

export const DEVICE_PRESETS: DevicePreset[] = [
    // ========== 通用（手机） ==========
    { id: 'generic-360',  label: '通用 360',           category: 'phone', brand: 'Generic', width: 360, height: 780, dpr: 3 },
    { id: 'generic-375',  label: '通用 375',           category: 'phone', brand: 'Generic', width: 375, height: 812, dpr: 3 },
    { id: 'generic-414',  label: '通用 414',           category: 'phone', brand: 'Generic', width: 414, height: 896, dpr: 3 },

    // ========== iPhone 17 ==========
    { id: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', category: 'phone', brand: 'Apple', width: 440, height: 956, dpr: 3, inch: 6.9 },
    { id: 'iphone-17-pro',     label: 'iPhone 17 Pro',     category: 'phone', brand: 'Apple', width: 402, height: 874, dpr: 3, inch: 6.3 },
    { id: 'iphone-17-air',     label: 'iPhone 17 Air',     category: 'phone', brand: 'Apple', width: 420, height: 912, dpr: 3, inch: 6.5 },
    { id: 'iphone-17',         label: 'iPhone 17',         category: 'phone', brand: 'Apple', width: 402, height: 874, dpr: 3, inch: 6.3 },

    // ========== iPhone 16 ==========
    { id: 'iphone-16-pro-max', label: 'iPhone 16 Pro Max', category: 'phone', brand: 'Apple', width: 440, height: 956, dpr: 3, inch: 6.9 },
    { id: 'iphone-16-pro',     label: 'iPhone 16 Pro',     category: 'phone', brand: 'Apple', width: 402, height: 874, dpr: 3, inch: 6.3 },
    { id: 'iphone-16-plus',    label: 'iPhone 16 Plus',    category: 'phone', brand: 'Apple', width: 430, height: 932, dpr: 3, inch: 6.7 },
    { id: 'iphone-16',         label: 'iPhone 16',         category: 'phone', brand: 'Apple', width: 393, height: 852, dpr: 3, inch: 6.1 },
    { id: 'iphone-16e',        label: 'iPhone 16e',        category: 'phone', brand: 'Apple', width: 390, height: 844, dpr: 3, inch: 6.1 },

    // ========== iPhone 15 ==========
    { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', category: 'phone', brand: 'Apple', width: 430, height: 932, dpr: 3, inch: 6.7 },
    { id: 'iphone-15-pro',     label: 'iPhone 15 Pro',     category: 'phone', brand: 'Apple', width: 393, height: 852, dpr: 3, inch: 6.1 },
    { id: 'iphone-15-plus',    label: 'iPhone 15 Plus',    category: 'phone', brand: 'Apple', width: 430, height: 932, dpr: 3, inch: 6.7 },
    { id: 'iphone-15',         label: 'iPhone 15',         category: 'phone', brand: 'Apple', width: 393, height: 852, dpr: 3, inch: 6.1 },

    // ========== Xiaomi 17 ==========
    { id: 'xiaomi-17-pro-max', label: '小米 17 Pro Max',   category: 'phone', brand: 'Xiaomi', width: 412, height: 915, dpr: 3, inch: 6.9 },
    { id: 'xiaomi-17-pro',     label: '小米 17 Pro',       category: 'phone', brand: 'Xiaomi', width: 393, height: 856, dpr: 3, inch: 6.3 },
    { id: 'xiaomi-17',         label: '小米 17',           category: 'phone', brand: 'Xiaomi', width: 393, height: 856, dpr: 3, inch: 6.3 },

    // ========== Xiaomi 15 ==========
    { id: 'xiaomi-15-ultra',   label: '小米 15 Ultra',     category: 'phone', brand: 'Xiaomi', width: 412, height: 915, dpr: 3, inch: 6.73 },
    { id: 'xiaomi-15-pro',     label: '小米 15 Pro',       category: 'phone', brand: 'Xiaomi', width: 412, height: 915, dpr: 3, inch: 6.73 },
    { id: 'xiaomi-15',         label: '小米 15',           category: 'phone', brand: 'Xiaomi', width: 393, height: 825, dpr: 3, inch: 6.36 },

    // ========== iPad（平板） ==========
    { id: 'ipad-mini-7',       label: 'iPad mini (A17 Pro)', category: 'tablet', brand: 'Apple', width: 744, height: 1133, dpr: 2, inch: 8.3 },
    { id: 'ipad-air-11',       label: 'iPad Air 11"',        category: 'tablet', brand: 'Apple', width: 820, height: 1180, dpr: 2, inch: 11 },
    { id: 'ipad-air-13',       label: 'iPad Air 13"',        category: 'tablet', brand: 'Apple', width: 1024, height: 1366, dpr: 2, inch: 13 },
    { id: 'ipad-pro-11',       label: 'iPad Pro 11"',        category: 'tablet', brand: 'Apple', width: 834, height: 1210, dpr: 2, inch: 11 },
    { id: 'ipad-pro-13',       label: 'iPad Pro 13"',        category: 'tablet', brand: 'Apple', width: 1032, height: 1376, dpr: 2, inch: 13 },

    // ========== Android 平板 ==========
    { id: 'matepad-11',        label: '华为 MatePad 11',      category: 'tablet', brand: 'Generic', width: 800, height: 1280, dpr: 2, inch: 11 },
    { id: 'xiaomi-pad-7-pro',  label: '小米平板 7 Pro',       category: 'tablet', brand: 'Xiaomi', width: 840, height: 1260, dpr: 2, inch: 11.2 },
];

export function findDevice(id: string): DevicePreset | undefined {
    return DEVICE_PRESETS.find((d) => d.id === id);
}

/** 默认机型：典型代表 */
export const DEFAULT_DEVICE_ID = 'xiaomi-17-pro';

/** 各品类的默认机型，用于切换品类时回填 */
export const DEFAULT_DEVICE_BY_CATEGORY: Record<DeviceCategory, string> = {
    phone: 'xiaomi-17-pro',
    tablet: 'ipad-air-11',
};
