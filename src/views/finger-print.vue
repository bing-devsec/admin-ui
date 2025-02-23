<template>
    <div>
        <h2>浏览器指纹ID: {{ fingerprintId }}</h2>

        <h2>指纹组成因子:</h2>
        <ul>
            <li v-for="(value, key) in components" :key="key">
                {{ key }}: {{ value?.value }}
            </li>
        </ul>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const components = ref<any>({});
const fingerprintId = ref<string>('');

const getDeviceFingerprint = async () => {
    const fp = await FingerprintJS.load();
    const result = await fp.get();

    const {
        applePay,
        architecture,
        audio,
        audioBaseLatency,
        canvas,
        contrast,
        cpuClass,
        domBlockers,
        fonts,
        forcedColors,
        hardwareConcurrency,
        indexedDB,
        invertedColors,
        monochrome,
        openDatabase,
        osCpu,
        pdfViewerEnabled,
        platform,
        privateClickMeasurement,
        reducedMotion,
        reducedTransparency,
        touchSupport,
        vendor,
        vendorFlavors,
        webGlBasics,
        webGlExtensions
    } = result.components;

    const extendedComponents = {
        applePay,
        architecture,
        audio,
        audioBaseLatency,
        canvas,
        contrast,
        cpuClass,
        domBlockers,
        fonts,
        forcedColors,
        hardwareConcurrency,
        indexedDB,
        invertedColors,
        monochrome,
        openDatabase,
        osCpu,
        pdfViewerEnabled,
        platform,
        privateClickMeasurement,
        reducedMotion,
        reducedTransparency,
        touchSupport,
        vendor,
        vendorFlavors,
        webGlBasics,
        webGlExtensions
    };
    components.value = extendedComponents;
    fingerprintId.value = FingerprintJS.hashComponents(extendedComponents);
};

onMounted(() => {
    getDeviceFingerprint();
});
</script>