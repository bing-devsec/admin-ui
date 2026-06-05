// 移动设备预设：CSS 视口尺寸（竖屏宽 × 高）
// 数据来源：Apple 官方规格、screensizechecker.com、yesviz.com、xiaomi.com / antutu.com / eet-china.com
//
// 注意：CSS 视口宽 = 物理分辨率 / DPR。Android 视口宽会受系统显示缩放影响，
//       这里取常见浏览器在默认缩放下的实测值，用于布局参考即可。

export interface DevicePreset {
    /** 唯一 key，用于下拉选择 */
    id: string;
    /** 显示名 */
    label: string;
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
    // ========== 通用 ==========
    { id: 'generic-360',  label: '通用 360',           brand: 'Generic', width: 360, height: 780, dpr: 3 },
    { id: 'generic-375',  label: '通用 375',           brand: 'Generic', width: 375, height: 812, dpr: 3 },
    { id: 'generic-414',  label: '通用 414',           brand: 'Generic', width: 414, height: 896, dpr: 3 },

    // ========== iPhone 17 ==========
    { id: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', brand: 'Apple', width: 440, height: 956, dpr: 3, inch: 6.9 },
    { id: 'iphone-17-pro',     label: 'iPhone 17 Pro',     brand: 'Apple', width: 402, height: 874, dpr: 3, inch: 6.3 },
    { id: 'iphone-17-air',     label: 'iPhone 17 Air',     brand: 'Apple', width: 420, height: 912, dpr: 3, inch: 6.5 },
    { id: 'iphone-17',         label: 'iPhone 17',         brand: 'Apple', width: 402, height: 874, dpr: 3, inch: 6.3 },

    // ========== iPhone 16 ==========
    { id: 'iphone-16-pro-max', label: 'iPhone 16 Pro Max', brand: 'Apple', width: 440, height: 956, dpr: 3, inch: 6.9 },
    { id: 'iphone-16-pro',     label: 'iPhone 16 Pro',     brand: 'Apple', width: 402, height: 874, dpr: 3, inch: 6.3 },
    { id: 'iphone-16-plus',    label: 'iPhone 16 Plus',    brand: 'Apple', width: 430, height: 932, dpr: 3, inch: 6.7 },
    { id: 'iphone-16',         label: 'iPhone 16',         brand: 'Apple', width: 393, height: 852, dpr: 3, inch: 6.1 },
    { id: 'iphone-16e',        label: 'iPhone 16e',        brand: 'Apple', width: 390, height: 844, dpr: 3, inch: 6.1 },

    // ========== iPhone 15 ==========
    { id: 'iphone-15-pro-max', label: 'iPhone 15 Pro Max', brand: 'Apple', width: 430, height: 932, dpr: 3, inch: 6.7 },
    { id: 'iphone-15-pro',     label: 'iPhone 15 Pro',     brand: 'Apple', width: 393, height: 852, dpr: 3, inch: 6.1 },
    { id: 'iphone-15-plus',    label: 'iPhone 15 Plus',    brand: 'Apple', width: 430, height: 932, dpr: 3, inch: 6.7 },
    { id: 'iphone-15',         label: 'iPhone 15',         brand: 'Apple', width: 393, height: 852, dpr: 3, inch: 6.1 },

    // ========== Xiaomi 17 ==========
    { id: 'xiaomi-17-pro-max', label: '小米 17 Pro Max',   brand: 'Xiaomi', width: 412, height: 915, dpr: 3, inch: 6.9 },
    { id: 'xiaomi-17-pro',     label: '小米 17 Pro',       brand: 'Xiaomi', width: 393, height: 856, dpr: 3, inch: 6.3 },
    { id: 'xiaomi-17',         label: '小米 17',           brand: 'Xiaomi', width: 393, height: 856, dpr: 3, inch: 6.3 },

    // ========== Xiaomi 15 ==========
    { id: 'xiaomi-15-ultra',   label: '小米 15 Ultra',     brand: 'Xiaomi', width: 412, height: 915, dpr: 3, inch: 6.73 },
    { id: 'xiaomi-15-pro',     label: '小米 15 Pro',       brand: 'Xiaomi', width: 412, height: 915, dpr: 3, inch: 6.73 },
    { id: 'xiaomi-15',         label: '小米 15',           brand: 'Xiaomi', width: 393, height: 825, dpr: 3, inch: 6.36 },
];

export function findDevice(id: string): DevicePreset | undefined {
    return DEVICE_PRESETS.find((d) => d.id === id);
}

/** 默认机型 */
export const DEFAULT_DEVICE_ID = 'iphone-16';
