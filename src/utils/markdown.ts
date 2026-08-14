// 从 portal-web/utils/markdown.ts 复制并适配为 admin-ui（纯客户端 SPA）使用。
// 目标：与前台文章详情页 100% 一致的渲染产物，便于后台写作时实时预览。
//
// 与前台版的差异：
//   1) admin-ui 永远是客户端环境，把 `import.meta.client` 直接当作 true 处理；
//   2) heading id 生成、KaTeX、Shiki、mermaid 占位符等规则保持一致；
//   3) COS srcset 注入 / 表格滚动外壳 / admonition 等也全部保留。
import MarkdownIt from 'markdown-it';
// @ts-ignore - markdown-it-footnote 没有官方类型声明
import footnotePlugin from 'markdown-it-footnote';
import katex from 'katex';
import type { Highlighter, ThemedToken } from 'shiki';
import { createHighlighter, bundledLanguages } from 'shiki';
import { getCustomShikiLanguage, isBundledShikiLanguage, isPlainTextShikiLanguage, normalizeCodeFenceLanguage } from './shikiLanguages';

const md = new MarkdownIt({
    html: true,
    linkify: true,
    breaks: true,
    typographer: true
});

// 启用 [^1] 脚注语法：[^1] 渲染为可点击上标 → 跳到底部 [^1]: ... 定义；定义末尾自动加 ↩ 返回锚点
md.use(footnotePlugin);

// ============================================================
// 提示块（Admonition）：!!! tips/info/warning/error/success/thinking/example
// ============================================================
const ADMONITION_TYPES = new Set(['tips', 'info', 'warning', 'error', 'success', 'thinking', 'example', 'summary']);
const ADMONITION_DEFAULT_TITLES: Record<string, string> = {
    tips: '小技巧',
    info: '说明',
    warning: '注意',
    error: '错误',
    success: '完成',
    thinking: '思考',
    example: '示例',
    summary: '总结',
};
const ADMONITION_EMOJIS: Record<string, string> = {
    tips: '💡',
    info: '📘',
    warning: '⚠️',
    error: '❌',
    success: '🍺',
    thinking: '🤔',
    example: '🌰',
    summary: '📌',
};
const ADMONITION_KIND_ALIASES: Record<string, string> = {
    tips: 'tips', tip: 'tips', 小技巧: 'tips', 技巧: 'tips', 提示: 'tips',
    info: 'info', note: 'info', 说明: 'info', 信息: 'info',
    warning: 'warning', warn: 'warning', 注意: 'warning', 警告: 'warning',
    error: 'error', 错误: 'error', 失败: 'error',
    success: 'success', 成功: 'success', 完成: 'success',
    thinking: 'thinking', think: 'thinking', 思考: 'thinking', 想法: 'thinking', 问题: 'thinking',
    example: 'example', 示例: 'example', 例子: 'example', 栗子: 'example',
    summary: 'summary', abstract: 'summary', 总结: 'summary', 摘要: 'summary', 小结: 'summary', 概述: 'summary',
};

interface AdmonitionMeta {
    kind: string;
    title: string;
    content: string;
}

function normalizeAdmonitionTitle(raw: string | undefined, kind: string): string {
    const trimmed = (raw || '').trim();
    if (!trimmed) return ADMONITION_DEFAULT_TITLES[kind];
    const quoted = trimmed.match(/^(['"])([\s\S]*)\1$/);
    return quoted ? quoted[2].trim() : trimmed;
}

function normalizeAdmonitionKind(raw: string | undefined): string | null {
    if (!raw) return null;
    return ADMONITION_KIND_ALIASES[raw.trim().toLowerCase()] || ADMONITION_KIND_ALIASES[raw.trim()] || null;
}

md.block.ruler.before('blockquote', 'admonition', function (state, startLine, endLine, silent) {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    if (start + 3 > max) return false;

    const line = state.src.slice(start, max).trim();
    const match = line.match(/^!!!\s+([^\s]+)(?:\s+(.*))?$/);
    if (!match) return false;

    const kind = normalizeAdmonitionKind(match[1]);
    if (!kind || !ADMONITION_TYPES.has(kind)) return false;
    if (silent) return true;

    let nextLine = startLine + 1;
    let foundClose = false;

    while (nextLine < endLine) {
        const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lineEnd = state.eMarks[nextLine];
        const currentLine = state.src.slice(lineStart, lineEnd).trim();
        if (currentLine === '!!!') {
            foundClose = true;
            break;
        }
        nextLine += 1;
    }

    if (!foundClose) return false;

    const content =
        nextLine > startLine + 1
            ? state.getLines(startLine + 1, nextLine, 0, false)
            : '';

    const token = state.push('admonition', 'div', 0);
    token.block = true;
    token.map = [startLine, nextLine + 1];
    token.meta = {
        kind,
        title: normalizeAdmonitionTitle(match[2], kind),
        content,
    } satisfies AdmonitionMeta;

    state.line = nextLine + 1;
    return true;
});

md.renderer.rules.admonition = function (tokens, idx, _options, env) {
    const meta = tokens[idx].meta as AdmonitionMeta | undefined;
    if (!meta) return '';

    const hasBody = Boolean(meta.content.trim());
    let bodyHtml = hasBody ? md.render(meta.content, env) : '';
    // admonition body 是嵌套独立渲染，markdown-it-footnote 会把内部的 [^1] 当成 ref，
    // 但定义在外层文档，本次嵌套渲染收集不到 → 输出一段空的 footnotes section（"1. ↩"）。
    // 外层文档的 footnote 流程会正确输出真实定义，所以这里把 body 内部产生的 footnotes section 整段移除。
    if (bodyHtml) {
        bodyHtml = bodyHtml
            .replace(/<hr\s+class="footnotes-sep"[^>]*>/g, '')
            .replace(/<section\s+class="footnotes"[\s\S]*?<\/section>/g, '');
    }
    const safeTitle = md.utils.escapeHtml(meta.title);
    const emoji = md.utils.escapeHtml(ADMONITION_EMOJIS[meta.kind] || '📝');
    const rootClass = hasBody ? 'md-admonition' : 'md-admonition md-admonition--title-only';

    return (
        `<div class="${rootClass} md-admonition--${meta.kind}">` +
        `<div class="md-admonition__title">` +
        `<span class="md-admonition__emoji" aria-hidden="true">${emoji}</span>` +
        `<span class="md-admonition__title-text">${safeTitle}</span>` +
        `</div>` +
        (hasBody ? `<div class="md-admonition__body">${bodyHtml}</div>` : '') +
        `</div>\n`
    );
};

// ============================================================
// 数学公式（KaTeX）：行内 $...$ 与块级 $$...$$ 自定义规则
// ============================================================
function renderKatex(src: string, displayMode: boolean): string {
    try {
        return katex.renderToString(src, {
            displayMode,
            throwOnError: false,
            output: 'html',
            strict: 'ignore' as const,
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `<span class="katex-error" title="${md.utils.escapeHtml(msg)}">${md.utils.escapeHtml(src)}</span>`;
    }
}

md.block.ruler.before('fence', 'math_block', function (state, startLine, endLine, silent) {
    const start = state.bMarks[startLine] + state.tShift[startLine];
    const max = state.eMarks[startLine];
    if (start + 2 > max) return false;
    if (state.src.slice(start, start + 2) !== '$$') return false;

    let nextLine = startLine;
    let firstLine = state.src.slice(start + 2, max).trim();
    let found = false;

    if (firstLine.endsWith('$$') && firstLine.length >= 2) {
        firstLine = firstLine.slice(0, -2);
        found = true;
    }

    while (!found) {
        nextLine++;
        if (nextLine >= endLine) break;
        const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lineEnd = state.eMarks[nextLine];
        const line = state.src.slice(lineStart, lineEnd);
        const idx = line.lastIndexOf('$$');
        if (idx !== -1) {
            found = true;
            break;
        }
    }

    if (!found) return false;
    if (silent) return true;

    let content: string;
    if (nextLine === startLine) {
        content = firstLine;
    } else {
        const lastLineStart = state.bMarks[nextLine] + state.tShift[nextLine];
        const lastLineEnd = state.eMarks[nextLine];
        const lastLine = state.src.slice(lastLineStart, lastLineEnd);
        const closingIdx = lastLine.lastIndexOf('$$');
        const middle = state.src.slice(state.eMarks[startLine], lastLineStart);
        content = (firstLine + '\n' + middle + lastLine.slice(0, closingIdx)).trim();
    }

    const token = state.push('math_block', 'div', 0);
    token.block = true;
    token.markup = '$$';
    token.content = content;
    state.line = nextLine + 1;
    return true;
});
md.renderer.rules.math_block = function (tokens, idx) {
    return `<div class="math-block">${renderKatex(tokens[idx].content, true)}</div>\n`;
};

md.inline.ruler.after('escape', 'math_inline', function (state, silent) {
    const start = state.pos;
    if (state.src.charCodeAt(start) !== 0x24) return false;
    if (state.src.charCodeAt(start + 1) === 0x24) return false;

    const prevChar = start > 0 ? state.src.charCodeAt(start - 1) : -1;
    if (prevChar >= 0x30 && prevChar <= 0x39) return false;

    let pos = start + 1;
    const max = state.posMax;
    let found = -1;
    while (pos < max) {
        const code = state.src.charCodeAt(pos);
        if (code === 0x5c) {
            pos += 2;
            continue;
        }
        if (code === 0x0a) break;
        if (code === 0x24) {
            found = pos;
            break;
        }
        pos++;
    }
    if (found === -1) return false;

    const content = state.src.slice(start + 1, found);
    if (content.length === 0) return false;
    if (content.charCodeAt(0) === 0x20 || content.charCodeAt(content.length - 1) === 0x20) {
        return false;
    }
    const nextChar = found + 1 < state.src.length ? state.src.charCodeAt(found + 1) : -1;
    if (nextChar >= 0x30 && nextChar <= 0x39) return false;

    if (!silent) {
        const token = state.push('math_inline', 'span', 0);
        token.markup = '$';
        token.content = content;
    }
    state.pos = found + 1;
    return true;
});
md.renderer.rules.math_inline = function (tokens, idx) {
    return renderKatex(tokens[idx].content, false);
};

// ============================================================
// 代码块：Shiki 占位符 → 异步消费
// ============================================================
const SHIKI_THEME = 'github-dark';
let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLanguages = new Set<string>();

function getHighlighter(): Promise<Highlighter> {
    if (!highlighterPromise) {
        highlighterPromise = createHighlighter({
            themes: [SHIKI_THEME],
            langs: [],
        });
    }
    return highlighterPromise;
}

async function ensureLanguageLoaded(highlighter: Highlighter, lang: string): Promise<boolean> {
    if (!lang) return false;
    if (isPlainTextShikiLanguage(lang)) return true;
    if (loadedLanguages.has(lang)) return true;
    const customLanguage = getCustomShikiLanguage(lang);
    try {
        if (customLanguage) {
            await highlighter.loadLanguage(customLanguage);
        } else if (isBundledShikiLanguage(lang)) {
            await highlighter.loadLanguage(lang);
        } else {
            return false;
        }
        loadedLanguages.add(lang);
        return true;
    } catch {
        return false;
    }
}

const SHIKI_PLACEHOLDER_PREFIX = '<!--shiki-placeholder:';
const SHIKI_PLACEHOLDER_SUFFIX = '-->';

interface PendingHighlight {
    lang: string;
    rawCode: string;
}

interface RenderEnv {
    pendingHighlights: Map<string, PendingHighlight>;
    pendingCounter: number;
    placeholderSalt: string;
    headingIndex: number;
}

function createRenderEnv(): RenderEnv {
    return {
        pendingHighlights: new Map<string, PendingHighlight>(),
        pendingCounter: 0,
        placeholderSalt:
            Math.random().toString(36).slice(2, 8) + Date.now().toString(36),
        headingIndex: 0,
    };
}

function nextPlaceholderToken(env: RenderEnv): string {
    env.pendingCounter += 1;
    return `${env.pendingCounter.toString(36)}-${env.placeholderSalt}`;
}

function tokenizedLinesToHtml(linesTokens: ThemedToken[][]): string | null {
    if (linesTokens.length === 0) {
        return '<span class="ssr-code-line">\u200B</span>';
    }

    let totalVisible = 0;
    for (const line of linesTokens) {
        for (const t of line) totalVisible += t.content.length;
        if (totalVisible > 0) break;
    }
    if (totalVisible === 0) {
        return null;
    }

    const out: string[] = [];
    for (const line of linesTokens) {
        const visibleLength = line.reduce((acc, t) => acc + t.content.length, 0);
        if (visibleLength === 0) {
            out.push('<span class="ssr-code-line">\u200B</span>');
            continue;
        }
        let lineHtml = '';
        for (const token of line) {
            const safe = escapeHtml(token.content);
            if (token.color) {
                lineHtml += `<span style="color:${token.color}">${safe}</span>`;
            } else {
                lineHtml += safe;
            }
        }
        out.push(`<span class="ssr-code-line">${lineHtml}</span>`);
    }
    return out.join('');
}

function isBlankTokenLine(line: ThemedToken[]): boolean {
    return line.length === 0 || line.every((token) => token.content.length === 0);
}

function trimTrailingBlankTokenLine(linesTokens: ThemedToken[][]): void {
    if (linesTokens.length > 0 && isBlankTokenLine(linesTokens[linesTokens.length - 1])) {
        linesTokens.pop();
    }
}

function rawCodeToLinesHtml(rawCode: string): string {
    const lines = rawCode.replace(/\n$/, '').split('\n');
    if (lines.length === 0) {
        return '<span class="ssr-code-line">\u200B</span>';
    }
    return lines
        .map((l) =>
            l.length === 0
                ? '<span class="ssr-code-line">\u200B</span>'
                : `<span class="ssr-code-line">${escapeHtml(l)}</span>`,
        )
        .join('');
}

function escapeHtml(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function resolveShikiPlaceholders(html: string, env: RenderEnv): Promise<string> {
    if (env.pendingHighlights.size === 0) return html;
    const highlighter = await getHighlighter();

    // admin-ui 一定是客户端，沿用 portal-web 的客户端首次让出微任务策略
    await Promise.resolve();

    const tryHighlight = (lang: string, rawCode: string): ThemedToken[][] | null => {
        try {
            const result = highlighter.codeToTokens(rawCode, {
                lang: lang as keyof typeof bundledLanguages,
                theme: SHIKI_THEME,
            });
            return result.tokens;
        } catch {
            return null;
        }
    };

    const replacements = new Map<string, string>();
    for (const [token, { lang, rawCode }] of env.pendingHighlights) {
        const supported = await ensureLanguageLoaded(highlighter, lang);
        let highlighted: string | null = null;

        if (supported) {
            let linesTokens = tryHighlight(lang, rawCode);
            if (linesTokens) {
                trimTrailingBlankTokenLine(linesTokens);
                highlighted = tokenizedLinesToHtml(linesTokens);
            }

            if (highlighted === null) {
                await new Promise<void>((resolve) => {
                    if (typeof queueMicrotask === 'function') {
                        queueMicrotask(resolve);
                    } else {
                        Promise.resolve().then(resolve);
                    }
                });
                linesTokens = tryHighlight(lang, rawCode);
                if (linesTokens) {
                    trimTrailingBlankTokenLine(linesTokens);
                    highlighted = tokenizedLinesToHtml(linesTokens);
                }
            }
        }

        if (highlighted === null) {
            highlighted = rawCodeToLinesHtml(rawCode);
        }
        replacements.set(token, highlighted);
    }

    const re = new RegExp(
        `${SHIKI_PLACEHOLDER_PREFIX}([a-z0-9-]+)${SHIKI_PLACEHOLDER_SUFFIX}`,
        'g',
    );
    return html.replace(re, (_, token) => replacements.get(token) ?? '');
}

md.renderer.rules.fence = function (tokens, idx, _options, env: RenderEnv) {
    const token = tokens[idx];
    const info = (token.info || '').trim();
    const rawLang = (info.split(/\s+/g)[0] || '').toLowerCase();
    const lang = normalizeCodeFenceLanguage(rawLang);
    const rawCode = token.content || '';

    if (lang === 'mermaid') {
        const escaped = md.utils.escapeHtml(rawCode);
        const fsIcon =
            '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">' +
            '<path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>' +
            '</svg>';
        return (
            `<div class="mermaid-block" data-mermaid-rendered="false">` +
            `<button class="mermaid-fullscreen-btn" type="button" aria-label="全屏查看图表" title="全屏">${fsIcon}</button>` +
            `<div class="mermaid-content">` +
            `<pre class="mermaid-source">${escaped}</pre>` +
            `</div>` +
            `</div>\n`
        );
    }

    const placeholderToken = nextPlaceholderToken(env);
    env.pendingHighlights.set(placeholderToken, { lang, rawCode });
    const linesPlaceholder = `${SHIKI_PLACEHOLDER_PREFIX}${placeholderToken}${SHIKI_PLACEHOLDER_SUFFIX}`;
    const linesHtml = linesPlaceholder;
    const langLabel = rawLang || 'text';
    const safeLang = md.utils.escapeHtml(langLabel);

    const COLLAPSE_THRESHOLD = 30;
    const lineCount = rawCode.replace(/\n$/, '').split('\n').length;
    const collapsible = lineCount > COLLAPSE_THRESHOLD;

    let gutterHtml = '';
    for (let n = 1; n <= lineCount; n++) {
        gutterHtml += `<span class="ssr-code-num">${n}</span>`;
    }

    const blockAttrs = [
        `class="ssr-code-block"`,
        `data-lang="${safeLang}"`,
    ];
    if (collapsible) {
        blockAttrs.push('data-collapsible="true"');
        blockAttrs.push('data-collapsed="true"');
        blockAttrs.push(`data-line-count="${lineCount}"`);
    }

    const headToggleDom = collapsible
        ? `<button class="ssr-code-toggle ssr-code-toggle--head ssr-code-iconbtn" type="button" aria-expanded="false" aria-label="展开代码" title="展开">` +
          `<span class="ssr-code-toggle-icon-wrap" aria-hidden="true">` +
          `<svg class="ssr-code-toggle-icon" viewBox="0 0 24 24" aria-hidden="true">` +
          `<path fill="currentColor" d="M12 15.41l6.3-6.3-1.4-1.42L12 12.59 7.1 7.7l-1.4 1.4z"/>` +
          `</svg>` +
          `</span>` +
          `</button>`
        : '';
    const floatingToggleDom = collapsible
        ? `<div class="ssr-code-mask" aria-hidden="true"></div>` +
          `<button class="ssr-code-toggle ssr-code-toggle--floating" type="button" aria-expanded="false">` +
          `展开全部 (${lineCount} 行)` +
          `</button>`
        : '';

    return (
        `<div ${blockAttrs.join(' ')}>` +
        `<div class="ssr-code-head">` +
        `<span class="ssr-code-lang">${safeLang}</span>` +
        `<div class="ssr-code-actions">` +
        headToggleDom +
        `<button class="ssr-code-fullscreen ssr-code-iconbtn" type="button" aria-label="全屏查看代码" title="全屏">` +
        `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">` +
        `<path fill="currentColor" d="M5 5h6v2H7v4H5V5zm14 0v6h-2V7h-4V5h6zM5 19v-6h2v4h4v2H5zm14 0h-6v-2h4v-4h2v6z"/>` +
        `</svg>` +
        `</button>` +
        `<button class="ssr-code-copy ssr-code-iconbtn" type="button" aria-label="复制代码" title="复制">` +
        `<svg class="ssr-code-copy-icon ssr-code-copy-icon--default" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">` +
        `<path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>` +
        `</svg>` +
        `<svg class="ssr-code-copy-icon ssr-code-copy-icon--success" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">` +
        `<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>` +
        `</svg>` +
        `<svg class="ssr-code-copy-icon ssr-code-copy-icon--error" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">` +
        `<path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>` +
        `</svg>` +
        `</button>` +
        `</div>` +
        `</div>` +
        `<div class="ssr-code-body">` +
        `<div class="ssr-code-pane">` +
        `<div class="ssr-code-gutter" aria-hidden="true">${gutterHtml}</div>` +
        `<pre class="ssr-code-pre"><code class="hljs language-${safeLang}">${linesHtml}</code></pre>` +
        `</div>` +
        floatingToggleDom +
        `</div>` +
        `</div>\n`
    );
};

// 图片：补 .article-img / lazy / async
md.renderer.rules.image = function (tokens, idx) {
    const token = tokens[idx];
    const src = token.attrGet('src') || '';
    const title = token.attrGet('title') || '';
    const alt = token.content || '';
    return `<img class="article-img article-img-zoomable" src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy" decoding="async" style="width: 100%; height: auto; max-width: 100%; display: block;">`;
};

// 表格：外包横向滚动壳 + 全屏按钮
const defaultTableOpen = md.renderer.rules.table_open || function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
};
const defaultTableClose = md.renderer.rules.table_close || function (tokens, idx, options, _env, self) {
    return self.renderToken(tokens, idx, options);
};
md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
    const fsBtn =
        '<button class="ssr-table-fs-btn" type="button" aria-label="全屏查看表格" title="全屏">' +
        '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">' +
        '<path fill="currentColor" d="M5 5h6v2H7v4H5V5zm14 0v6h-2V7h-4V5h6zM5 19v-6h2v4h4v2H5zm14 0h-6v-2h4v-4h2v6z"/>' +
        '</svg>' +
        '</button>';
    return `<div class="ssr-table-wrap">${fsBtn}<div class="ssr-table-scroll">${defaultTableOpen(tokens, idx, options, env, self)}`;
};
md.renderer.rules.table_close = function (tokens, idx, options, env, self) {
    return `${defaultTableClose(tokens, idx, options, env, self)}</div></div>`;
};

// heading id：与前台保持一致
const cleanHeadingText = (text: string): string =>
    text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();

const defaultHeadingOpen = md.renderer.rules.heading_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
};

md.renderer.rules.heading_open = function (tokens, idx, options, env: RenderEnv, self) {
    const token = tokens[idx];
    const inlineToken = tokens[idx + 1];
    const text = inlineToken && inlineToken.type === 'inline' ? inlineToken.content : '';
    const level = Number(token.tag.slice(1));
    const id = `h${level}-${env.headingIndex}-${cleanHeadingText(text)}`;
    env.headingIndex += 1;
    token.attrSet('id', id);
    return defaultHeadingOpen(tokens, idx, options, env, self);
};

// 自有 COS 图床的图片注入 srcset / sizes
const COS_HOSTS = /\.(myqcloud|tencentcos)\.com$/i;
const COS_SRCSET_WIDTHS = [400, 800, 1200, 1920];

function buildCosSrcset(rawUrl: string): string | null {
    let parsed: URL;
    try {
        parsed = new URL(rawUrl, 'https://placeholder.local');
    } catch {
        return null;
    }
    if (!COS_HOSTS.test(parsed.hostname)) return null;
    if (parsed.search) return null;
    if (parsed.pathname.toLowerCase().endsWith('.svg')) return null;

    return COS_SRCSET_WIDTHS
        .map(w => `${rawUrl}?imageMogr2/thumbnail/${w}x/format/webp/quality/85 ${w}w`)
        .join(', ');
}

function ensureImgAttributes(html: string): string {
    return html.replace(/<img\b([^>]*)>/gi, (_full, attrs: string) => {
        let next = attrs;

        if (/\bclass\s*=\s*("|')/i.test(next)) {
            next = next.replace(/\bclass\s*=\s*("|')([^"']*)\1/i, (_m, quote: string, value: string) => {
                const classes = new Set(value.split(/\s+/).filter(Boolean));
                classes.add('article-img');
                classes.add('article-img-zoomable');
                return `class=${quote}${Array.from(classes).join(' ')}${quote}`;
            });
        } else {
            next = ` class="article-img article-img-zoomable"` + next;
        }

        if (!/\bloading\s*=/i.test(next)) {
            next += ' loading="lazy"';
        }
        if (!/\bdecoding\s*=/i.test(next)) {
            next += ' decoding="async"';
        }

        if (!/\bsrcset\s*=/i.test(next)) {
            const srcMatch = next.match(/\bsrc\s*=\s*("|')([^"']+)\1/i);
            if (srcMatch) {
                const srcset = buildCosSrcset(srcMatch[2]);
                if (srcset) {
                    next += ` srcset="${srcset}"`;
                    if (!/\bsizes\s*=/i.test(next)) {
                        next += ` sizes="(max-width: 576px) 100vw, (max-width: 992px) 90vw, 720px"`;
                    }
                }
            }
        }

        return `<img${next}>`;
    });
}

export interface CatalogHeading {
    id: string;
    text: string;
    level: number;
}

/**
 * 从 markdown-it 渲染好的 HTML 字符串里抽取目录标题。
 * 与 portal-web 的 CatalogRenderer 输入保持一致。
 */
export function extractHeadingsFromHtml(html: string | undefined | null, maxLevel = 3): CatalogHeading[] {
    if (!html) return [];

    const headings: CatalogHeading[] = [];
    const regex = /<h([1-6])\b[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi;

    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
        const level = Number(match[1]);
        if (level > maxLevel) continue;

        const id = match[2];
        const innerHtml = match[3] || '';
        const text = innerHtml
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!id || !text) continue;
        headings.push({ id, text, level });
    }

    return headings;
}

/**
 * 把 Markdown 渲染为 HTML。与前台同步：异步（Shiki 异步加载语法）。
 */
export async function renderMarkdownToHtml(markdown: string | undefined | null, maxLength?: number): Promise<string> {
    if (!markdown) return '';

    const contentToRender = maxLength && markdown.length > maxLength
        ? markdown.slice(0, maxLength) + '\n\n...'
        : markdown;

    try {
        const env = createRenderEnv();
        const html = md.render(contentToRender, env);
        const resolved = await resolveShikiPlaceholders(html, env);
        return ensureImgAttributes(resolved);
    } catch {
        return `<pre>${md.utils.escapeHtml(contentToRender)}</pre>`;
    }
}

/**
 * 提前预热 Shiki：可在写作页挂载时调用，让首个代码块不卡。
 */
export function prewarmHighlighter(): void {
    void getHighlighter();
}
