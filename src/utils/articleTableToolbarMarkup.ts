const alignments = [
    ['left', '左对齐', 'M3 5h18M3 10h11M3 15h18M3 20h11'],
    ['center', '居中对齐', 'M3 5h18M7 10h10M3 15h18M7 20h10'],
    ['right', '右对齐', 'M3 5h18M10 10h11M3 15h18M10 20h11'],
];

const alignmentButtons = alignments.map(([value, label, path]) =>
    `<button type="button" data-table-align="${value}" aria-label="${label}" title="${label}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="${path}"/></svg>
    </button>`).join('');

const fullscreenButton = `<button class="ssr-table-fs-btn" type="button" aria-label="全屏查看表格" title="全屏">
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path d="M5 5h6v2H7v4H5V5zm14 0v6h-2V7h-4V5h6zM5 19v-6h2v4h4v2H5zm14 0h-6v-2h4v-4h2v6z"/></svg>
</button>`;

export function renderArticleTableToolbar(includeFullscreen = true): string {
    return `<div class="article-table-toolbar" role="group" aria-label="表格显示设置">
        <span class="article-table-column" role="status">第 1 列</span>${alignmentButtons}
        <button type="button" data-table-wrap aria-label="自动换行" title="切换表格换行方式"></button>
        ${includeFullscreen ? fullscreenButton : ''}
    </div>`;
}
