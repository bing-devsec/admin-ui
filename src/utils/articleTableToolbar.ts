import { renderArticleTableToolbar } from './articleTableToolbarMarkup';

type Alignment = 'left' | 'center' | 'right';
function isAlignment(value?: string): value is Alignment {
    return value === 'left' || value === 'center' || value === 'right';
}

function alignColumn(table: HTMLTableElement, index: number, alignment: Alignment) {
    for (const row of table.rows) {
        const cell = row.cells.item(index);
        if (cell) cell.style.textAlign = alignment;
    }
    const heading = table.rows[0]?.cells.item(index);
    if (heading) heading.dataset.tableAlignment = alignment;
}

function selectedColumn(table: HTMLTableElement) {
    return Number(table.dataset.tableColumn) || 0;
}

function wrapsText(table: HTMLTableElement) {
    return table.ownerDocument.defaultView!.getComputedStyle(table)
        .getPropertyValue('--article-table-space').trim() !== 'nowrap';
}

function updateOverflow(table: HTMLTableElement) {
    const scroll = table.closest<HTMLElement>('.ssr-table-scroll');
    const wrap = scroll?.closest<HTMLElement>('.ssr-table-wrap');
    if (!scroll || !wrap) return;
    if (scroll.scrollWidth > scroll.clientWidth + 1) wrap.dataset.overflow = 'true';
    else delete wrap.dataset.overflow;
}

function refresh(table: HTMLTableElement) {
    const bar = table.closest('.ssr-table-wrap')?.querySelector(':scope > .article-table-toolbar');
    if (!bar) return;
    const index = selectedColumn(table);
    const sample = table.tBodies[0]?.rows[0]?.cells.item(index) ?? table.rows[0]?.cells.item(index);
    const alignment = sample && table.ownerDocument.defaultView!.getComputedStyle(sample).textAlign;
    const label = bar.querySelector<HTMLElement>('.article-table-column')!;
    const text = `第 ${index + 1} 列`;
    if (label.textContent !== text) label.textContent = text;
    for (const button of bar.querySelectorAll<HTMLButtonElement>('[data-table-align]')) {
        button.setAttribute('aria-pressed', String(button.dataset.tableAlign === alignment));
    }
    const toggle = bar.querySelector<HTMLButtonElement>('[data-table-wrap]')!;
    const wrapping = wrapsText(table);
    toggle.setAttribute('role', 'switch');
    toggle.setAttribute('aria-checked', String(wrapping));
    toggle.title = wrapping ? '当前自动换行，点击切换为单行显示' : '当前单行显示，点击开启自动换行';
}

/** Save only this table's reading preferences when its fullscreen copy closes. */
export function syncTablePresentation(from: HTMLTableElement, to: HTMLTableElement) {
    if (from.dataset.tableWrapMode) to.dataset.tableWrapMode = from.dataset.tableWrapMode;
    else delete to.dataset.tableWrapMode;
    to.dataset.tableColumn = String(selectedColumn(from));
    for (const cell of from.rows[0]?.cells ?? []) {
        if (isAlignment(cell.dataset.tableAlignment)) alignColumn(to, cell.cellIndex, cell.dataset.tableAlignment);
    }
    updateOverflow(to);
    refresh(to);
}

/** Attach controls to server-rendered tables, cached article HTML and new editor previews. */
export function installTableToolbar(root: HTMLElement): () => void {
    const view = root.ownerDocument.defaultView!;
    const media = view.matchMedia('(width < 992px)');
    function initialize(wrap: Element) {
        const table = wrap.querySelector<HTMLTableElement>('.ssr-table-scroll table');
        if (!table) return;
        if (!wrap.querySelector(':scope > .article-table-toolbar')) {
            wrap.insertAdjacentHTML('beforeend', renderArticleTableToolbar(!root.closest('.ssr-table-fs-body')));
        }
        // Older cached articles have a standalone fullscreen trigger. Preserve pending clicks on it.
        const legacyButton = wrap.querySelector(':scope > .ssr-table-fs-btn');
        if (legacyButton) wrap.querySelector('.article-table-toolbar .ssr-table-fs-btn')?.replaceWith(legacyButton);
        // Keep the button node when upgrading cached toolbars with a text label and switch track.
        const oldToggle = wrap.querySelector<HTMLButtonElement>('.article-table-toolbar [data-table-wrap]:not(:empty)');
        if (oldToggle) {
            oldToggle.setAttribute('aria-label', '自动换行');
            oldToggle.replaceChildren();
        }
        refresh(table);
    }
    function initializeAll() {
        root.querySelectorAll('.ssr-table-wrap').forEach(initialize);
    }

    function onClick(event: Event) {
        const target = event.target as Element;
        const wrap = target.closest('.ssr-table-wrap');
        const table = wrap?.querySelector<HTMLTableElement>('.ssr-table-scroll table');
        if (!table) return;
        const cell = target.closest<HTMLTableCellElement>('th, td');
        const button = target.closest<HTMLButtonElement>('.article-table-toolbar button');
        if (cell?.closest('table') === table) {
            table.dataset.tableColumn = String(cell.cellIndex);
        } else if (isAlignment(button?.dataset.tableAlign)) {
            alignColumn(table, selectedColumn(table), button.dataset.tableAlign);
        } else if (button?.hasAttribute('data-table-wrap')) {
            table.dataset.tableWrapMode = wrapsText(table) ? 'nowrap' : 'wrap';
            updateOverflow(table);
        } else return;
        refresh(table);
    }
    function onKey(event: KeyboardEvent) {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        const scroll = event.target as Element;
        if (!scroll.matches('.ssr-table-scroll')) return;
        const table = scroll.querySelector('table');
        if (!table) return;
        const index = selectedColumn(table) + (event.key === 'ArrowLeft' ? -1 : 1);
        const heading = table.rows[0]?.cells.item(index);
        if (!heading) return;
        event.preventDefault();
        table.dataset.tableColumn = String(index);
        refresh(table);
        heading.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    initializeAll();
    // Vue replaces the contents of v-html; initialize just the inserted table wrappers.
    const observer = new view.MutationObserver(records => {
        for (const record of records) {
            for (const node of record.addedNodes) {
                if (!(node instanceof view.Element)) continue;
                if (node.matches('.ssr-table-wrap')) initialize(node);
                else node.querySelectorAll('.ssr-table-wrap').forEach(initialize);
            }
        }
    });
    observer.observe(root, { childList: true, subtree: true });
    const events = new view.AbortController();
    const options = { signal: events.signal };
    root.addEventListener('click', onClick, options);
    root.addEventListener('article-table-activate', onClick, options);
    root.addEventListener('keydown', onKey, options);
    media.addEventListener('change', initializeAll, options);
    return () => { observer.disconnect(); events.abort(); };
}
