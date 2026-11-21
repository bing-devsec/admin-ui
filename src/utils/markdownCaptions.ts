import type MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

// Kept in sync between admin-ui and portal-web. This is a Markdown block
// extension; existing images and their enhancement/rendering rules stay intact.
const SINGLE_IMAGE_HTML = /^<img\b(?:[^"'<>]|"[^"]*"|'[^']*')*\/?>\s*$/i;

function captionText(line: string): string | null {
    const match = line.trim().match(/^:caption\[(.*)\]$/);
    return match && match[1].trim() ? match[1].trim() : null;
}

function isImageParagraph(token: Token): boolean {
    const children = (token.children || []).filter(child => child.type !== 'text' || child.content.trim());
    const image = (child: Token) => child.type === 'image' ||
        (child.type === 'html_inline' && SINGLE_IMAGE_HTML.test(child.content.trim()));
    return (children.length === 1 && image(children[0])) ||
        (children.length === 3 && children[0].type === 'link_open' && image(children[1]) && children[2].type === 'link_close');
}

export default function markdownCaptions(md: MarkdownIt, options: { sourceLines?: boolean } = {}): void {
    // An uploaded <img> and its caption may have no blank line between them.
    // Split ONLY a standalone image followed by an explicit caption; arbitrary
    // HTML blocks retain markdown-it's normal boundaries and trust model.
    md.block.ruler.before('html_block', 'captioned_html_image', (state, startLine, endLine, silent) => {
        if (!md.options.html || state.sCount[startLine] - state.blkIndent >= 4) return false;
        const firstLine = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]);
        if (!/^<img\b/i.test(firstLine)) return false;

        let imageEnd = startLine;
        let quote = '';
        let closed = false;
        const lines: string[] = [];
        while (imageEnd < endLine && !state.isEmpty(imageEnd)) {
            if (state.sCount[imageEnd] < state.blkIndent) return false;
            const line = state.getLines(imageEnd, imageEnd + 1, state.blkIndent, false);
            for (let i = 0; i < line.length; i++) {
                if (quote) {
                    if (line[i] === quote) quote = '';
                } else if (line[i] === '"' || line[i] === "'") {
                    quote = line[i];
                } else if (line[i] === '>') {
                    if (line.slice(i + 1).trim()) return false;
                    closed = true;
                    break;
                }
            }
            lines.push(line);
            imageEnd++;
            if (closed) break;
        }
        const content = lines.join('\n').trim();
        if (!SINGLE_IMAGE_HTML.test(content)) return false;

        let nextLine = imageEnd;
        while (nextLine < endLine && state.isEmpty(nextLine)) nextLine++;
        if (nextLine >= endLine || state.sCount[nextLine] < state.blkIndent || state.sCount[nextLine] - state.blkIndent >= 4) return false;
        const next = state.src.slice(state.bMarks[nextLine] + state.tShift[nextLine], state.eMarks[nextLine]);
        if (captionText(next) === null) return false;
        if (silent) return true;

        const token = state.push('html_block', '', 0);
        token.block = true;
        token.map = [startLine, imageEnd];
        token.content = content + '\n';
        state.line = imageEnd;
        return true;
    });

    md.block.ruler.before('paragraph', 'figure_caption', (state, startLine, _endLine, silent) => {
        if (state.sCount[startLine] - state.blkIndent >= 4) return false;
        const line = state.src.slice(state.bMarks[startLine] + state.tShift[startLine], state.eMarks[startLine]);
        const text = captionText(line);
        if (text === null) return false;
        if (silent) return true;

        const token = state.push('caption_candidate', '', 0);
        token.block = true;
        token.map = [startLine, startLine + 1];
        token.content = text;
        token.meta = { original: line.trim() };
        state.line = startLine + 1;
        return true;
    }, { alt: ['paragraph'] });

    md.core.ruler.after('inline', 'figure_captions', state => {
        const output: Token[] = [];
        const addSourceLine = (token: Token, line: number | undefined) => {
            if (options.sourceLines && line !== undefined) token.attrSet('data-md-line', String(line));
        };

        for (const token of state.tokens) {
            if (token.type !== 'caption_candidate') {
                output.push(token);
                continue;
            }

            const last = output[output.length - 1];
            let mediaStart = output.length;
            let media: Token[] = [];
            if (last?.level === token.level && (
                last.type === 'html_embed' ||
                (last.type === 'fence' && last.info.trim().split(/\s+/)[0].toLowerCase() === 'mermaid') ||
                (last.type === 'html_block' && SINGLE_IMAGE_HTML.test(last.content.trim()))
            )) {
                mediaStart--;
                media = [last];
            } else if (last?.type === 'paragraph_close' && last.level === token.level) {
                const open = output[output.length - 3];
                const inline = output[output.length - 2];
                if (open?.type === 'paragraph_open' && inline?.type === 'inline' && isImageParagraph(inline)) {
                    mediaStart -= 3;
                    media = [inline];
                }
            }

            if (media.length === 0) {
                // Keep unmatched markers in the normal inline pipeline, so
                // references/footnotes are collected before footnote_tail.
                const open = new state.Token('paragraph_open', 'p', 1);
                open.block = true;
                open.level = token.level;
                open.map = token.map;
                addSourceLine(open, token.map?.[0]);
                const inline = new state.Token('inline', '', 0);
                inline.level = token.level + 1;
                inline.map = token.map;
                inline.content = token.meta.original;
                inline.children = [];
                md.inline.parse(inline.content, md, state.env, inline.children);
                const close = new state.Token('paragraph_close', 'p', -1);
                close.block = true;
                close.level = token.level;
                output.push(open, inline, close);
                continue;
            }

            const figureOpen = new state.Token('figure_open', 'figure', 1);
            figureOpen.block = true;
            figureOpen.level = token.level;
            figureOpen.map = [media[0].map?.[0] ?? token.map![0], token.map![1]];
            figureOpen.attrSet('class', 'article-figure');
            addSourceLine(figureOpen, figureOpen.map[0]);

            const captionOpen = new state.Token('figcaption_open', 'figcaption', 1);
            captionOpen.block = true;
            captionOpen.level = token.level + 1;
            captionOpen.map = token.map;
            captionOpen.attrSet('class', 'article-figcaption');
            addSourceLine(captionOpen, token.map?.[0]);

            const inline = new state.Token('inline', '', 0);
            inline.level = token.level + 2;
            inline.content = token.content;
            inline.map = token.map;
            inline.children = [];
            md.inline.parse(token.content, md, state.env, inline.children);
            for (const child of inline.children) {
                // Captions allow inline Markdown, not raw HTML or nested images.
                if (child.type === 'html_inline') child.type = 'text';
                if (child.type === 'image') {
                    child.type = 'text';
                    child.content = child.content || child.attrGet('alt') || '';
                }
            }

            const captionClose = new state.Token('figcaption_close', 'figcaption', -1);
            captionClose.block = true;
            captionClose.level = token.level + 1;
            const figureClose = new state.Token('figure_close', 'figure', -1);
            figureClose.block = true;
            figureClose.level = token.level;
            media.forEach(child => { child.level = token.level + 1; });
            output.splice(mediaStart);
            output.push(figureOpen, ...media, captionOpen, inline, captionClose, figureClose);
        }
        state.tokens = output;
    });
}
