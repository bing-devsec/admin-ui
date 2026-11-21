import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const temporary = mkdtempSync(join(tmpdir(), 'admin-caption-test-'));
after(() => rmSync(temporary, { recursive: true, force: true }));
const bundle = join(temporary, 'markdown.cjs');
await build({
    entryPoints: [fileURLToPath(new URL('../src/utils/markdown.ts', import.meta.url))],
    bundle: true, platform: 'node', format: 'cjs', outfile: bundle, logLevel: 'silent',
});
const { renderMarkdownToHtml } = createRequire(import.meta.url)(bundle);

test('optional captions preserve image and caption source positions', async () => {
    const html = await renderMarkdownToHtml('![替代文字](/a.svg)\n\n:caption[图 1 **说明**]');
    assert.match(html, /<figure[^>]*class="article-figure"[^>]*data-md-line="0"/);
    assert.match(html, /<img[^>]*data-md-line="0"/);
    assert.match(html, /<figcaption[^>]*data-md-line="2"[^>]*>图 1 <strong>说明<\/strong>/);
    assert.doesNotMatch(await renderMarkdownToHtml('![替代文字](/a.svg "提示")'), /<figure|<figcaption/);
});

test('captioned uploaded images preserve quotes, sizes and author attributes', async () => {
    const html = await renderMarkdownToHtml('<img src="/a.svg" alt="a > b" width="240" loading="eager" />\n:caption[图 2]');
    assert.match(html, /alt="a > b"/);
    assert.match(html, /width="240"/);
    assert.match(html, /loading="eager"/);
    assert.match(html, /article-img-zoomable/);
    assert.match(html, /<figcaption[^>]*>图 2/);
    const markdown = await renderMarkdownToHtml('![say "hello" & *goodbye*](/a.png "a & b")\n:caption[图 3]');
    assert.match(markdown, /alt="say &quot;hello&quot; &amp; goodbye"/);
    assert.match(markdown, /title="a &amp; b"/);
});

test('Mermaid captions remain outside the replaceable drawing container', async () => {
    const html = await renderMarkdownToHtml('```Mermaid\nflowchart LR\n A --> B\n```\n:caption[图 4]');
    assert.match(html, /class="mermaid-block"/);
    assert.match(html, /class="mermaid-fullscreen-btn"/);
    assert.match(html, /<\/pre><\/div><\/div>\s*<figcaption/);
});

test('unmatched captions retain footnotes and HTML in real captions stays literal', async () => {
    const orphan = await renderMarkdownToHtml(':caption[说明[^a]]\n\n[^a]: 注释内容');
    assert.doesNotMatch(orphan, /<figure|<figcaption/);
    assert.match(orphan, /注释内容/);
    assert.ok(orphan.indexOf('class="footnotes"') > orphan.indexOf('</p>'));
    const caption = await renderMarkdownToHtml('![图](/a.png)\n:caption[<b>文字</b>]');
    assert.match(caption, /&lt;b&gt;文字&lt;\/b&gt;/);
});

test('HTML embed references and captions keep separate editor scroll-sync lines', async () => {
    const id = '1234567890abcdef1234567890abcdef';
    const html = await renderMarkdownToHtml('引言\n\n:html-embed[' + id + ']\n:caption[图 1 汉诺塔]');
    assert.match(html, /<figure[^>]*data-md-line="2">\s*<details[^>]*data-html-embed-id="[a-f0-9]{32}"[^>]*data-md-line="2"/);
    assert.match(html, /<figcaption[^>]*data-md-line="3"[^>]*>图 1 汉诺塔<\/figcaption>/);
    assert.doesNotMatch(html, /<iframe\b/);
});

test('retired embed references render as ordinary article text', async () => {
    const reference = ':demo[1234567890abcdef1234567890abcdef]';
    const html = await renderMarkdownToHtml(reference + '\n:caption[图 1 汉诺塔]');
    assert.ok(html.includes(reference));
    assert.doesNotMatch(html, /<details|<figure|<figcaption/);
});
