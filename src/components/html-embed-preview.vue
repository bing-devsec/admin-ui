<template>
    <div ref="container" v-html="embedMarkup"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import MarkdownIt from 'markdown-it';
import markdownHtmlEmbed from '@/utils/htmlEmbed/markdown';
import { mountAdminHtmlEmbeds } from '@/utils/adminHtmlEmbed';
import '@/utils/htmlEmbed/style.css';

const props = defineProps<{ id: string }>();
const container = ref<HTMLElement>();
// The renderer accepts only a content ID. The uploaded document stays inside the player's sandbox.
const embedMarkup = /^[a-f0-9]{32}$/.test(props.id)
    ? new MarkdownIt({ html: false }).use(markdownHtmlEmbed).render(':html-embed[' + props.id + ']')
    : '';
let dispose: (() => void) | undefined;

onMounted(() => {
    const root = container.value;
    const details = root?.querySelector('details');
    if (!root || !details) return;
    details.open = true;
    dispose = mountAdminHtmlEmbeds(root);
});
onBeforeUnmount(() => dispose?.());
</script>
