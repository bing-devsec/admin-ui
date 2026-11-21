type ResolveUrl = (id: string) => string;

const idFormat = /^[a-f0-9]{32}$/;
const defaultUrl: ResolveUrl = id => '/api-backend/user/article/html-embed/' + id;
const maxBytes = 2 * 1024 * 1024;
// srcdoc starts with this policy, before any author markup. The iframe also receives an opaque origin.
const policy = [
    "default-src 'none'", "script-src 'unsafe-inline'", "style-src 'unsafe-inline'",
    "img-src data: blob:", "font-src data:", "media-src data: blob:", "connect-src 'none'",
    "form-action 'none'", "base-uri 'none'", "frame-src 'none'", "object-src 'none'",
].join('; ');

function bind(block: HTMLDetailsElement, resolveUrl: ResolveUrl): (() => void) | undefined {
    const doc = block.ownerDocument;
    const win = doc.defaultView;
    const id = block.dataset.htmlEmbedId || '';
    const stage = block.querySelector<HTMLElement>('.article-html-embed-stage');
    const status = block.querySelector<HTMLElement>('.article-html-embed-status');
    const retry = block.querySelector<HTMLButtonElement>('[data-html-embed-action="retry"]');
    const expand = block.querySelector<HTMLButtonElement>('[data-html-embed-action="expand"]');
    if (!win || !idFormat.test(id) || !stage || !status || !retry || !expand) return;

    let request: AbortController | undefined;
    let frame: HTMLIFrameElement | undefined;
    // Keep the decoded document while this block is mounted. Each opening gets a fresh iframe.
    let source: string | undefined;
    function reset() {
        request?.abort();
        request = undefined;
        frame?.remove();
        frame = undefined;
        if (doc.fullscreenElement === block) void doc.exitFullscreen().catch(() => {});
        retry!.hidden = true;
        expand!.hidden = true;
        expand!.textContent = '全屏查看';
        status!.textContent = '';
    }
    async function load() {
        if (!block.open || request || frame) return;
        const current = new AbortController();
        request = current;
        retry!.hidden = true;
        status!.textContent = '正在加载演示…';
        try {
            if (source === undefined) {
                const response = await win!.fetch(resolveUrl(id), {
                    signal: current.signal, credentials: 'omit', redirect: 'error',
                });
                if (response.status === 404) throw new Error('找不到这个演示文件。');
                if (!response.ok || response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !== 'text/plain')
                    throw new Error('演示文件加载失败。');
                if (Number(response.headers.get('content-length')) > maxBytes) throw new Error('演示文件超过 2 MiB。');
                const bytes = await response.arrayBuffer();
                if (bytes.byteLength > maxBytes) throw new Error('演示文件超过 2 MiB。');
                if (current.signal.aborted || !block.open) return;
                source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
            }
            const iframe = doc.createElement('iframe');
            iframe.title = block.closest('figure')?.querySelector('figcaption')?.textContent?.trim() || '互动演示';
            iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
            iframe.referrerPolicy = 'no-referrer';
            iframe.srcdoc = '<!doctype html><meta http-equiv="Content-Security-Policy" content="' + policy + '">' + source;
            frame = iframe;
            stage!.appendChild(iframe);
            status!.textContent = '';
            expand!.hidden = !doc.fullscreenEnabled;
        } catch (error) {
            if (current.signal.aborted || !block.open) return;
            status!.textContent = error instanceof Error && ['找不到这个演示文件。','演示文件超过 2 MiB。'].includes(error.message)
                ? error.message : '演示文件加载失败。';
            retry!.hidden = false;
        } finally {
            if (request === current) request = undefined;
        }
    }
    const toggle = () => { if (block.open) void load(); else reset(); };
    const fullscreen = () => {
        const transition = doc.fullscreenElement === block ? doc.exitFullscreen() : block.requestFullscreen();
        void transition.catch(() => { status!.textContent = '当前窗口无法全屏。'; });
    };
    const reflectFullscreen = () => { expand!.textContent = doc.fullscreenElement === block ? '退出全屏' : '全屏查看'; };
    retry.addEventListener('click', load);
    expand.addEventListener('click', fullscreen);
    doc.addEventListener('fullscreenchange', reflectFullscreen);
    block.addEventListener('toggle', toggle);
    if (block.open) void load();
    return () => {
        block.removeEventListener('toggle', toggle);
        retry.removeEventListener('click', load);
        expand.removeEventListener('click', fullscreen);
        doc.removeEventListener('fullscreenchange', reflectFullscreen);
        reset();
        source = undefined;
    };
}

export function mountHtmlEmbeds(root: ParentNode, resolveUrl: ResolveUrl = defaultUrl): () => void {
    const disposers: (() => void)[] = [];
    for (const block of root.querySelectorAll<HTMLDetailsElement>('details.article-html-embed[data-html-embed-id]')) {
        const dispose = bind(block, resolveUrl);
        if (dispose) disposers.push(dispose);
    }
    return () => { for (const dispose of disposers.splice(0)) dispose(); };
}
