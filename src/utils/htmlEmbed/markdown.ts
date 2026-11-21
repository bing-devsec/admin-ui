// Kept identical in portal-web/utils/htmlEmbed and admin-ui/src/utils/htmlEmbed.
import type MarkdownIt from 'markdown-it';

export default function markdownHtmlEmbed(md: MarkdownIt, options: { sourceLines?: boolean } = {}): void {
    md.block.ruler.before('paragraph', 'html_embed', (state, line, _end, silent) => {
        if (state.sCount[line] - state.blkIndent >= 4) return false;
        const content = state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]).trimEnd();
        const match = /^:html-embed\[([a-f0-9]{32})\]$/.exec(content);
        if (!match) return false;
        if (silent) return true;
        const token = state.push('html_embed', 'details', 0);
        token.block = true;
        token.map = [line, line + 1];
        token.content = match[1]!;
        state.line = line + 1;
        return true;
    }, { alt: ['paragraph', 'reference', 'blockquote'] });

    md.renderer.rules.html_embed = (tokens, index) => {
        const token = tokens[index]!;
        const line = options.sourceLines && token.map ? ` data-md-line="${token.map[0]}"` : '';
        return `<details class="article-html-embed" data-html-embed-id="${token.content}"${line}>` +
            '<summary><span class="article-html-embed-closed">打开互动演示</span><span class="article-html-embed-open">收起互动演示</span></summary>' +
            '<div class="article-html-embed-body"><div class="article-html-embed-actions">' +
            '<span class="article-html-embed-status" role="status"></span>' +
            '<button type="button" data-html-embed-action="retry" hidden>重新加载</button>' +
            '<button type="button" data-html-embed-action="expand" hidden>全屏查看</button></div>' +
            '<div class="article-html-embed-stage"></div><noscript>启用 JavaScript 即可运行此演示。</noscript></div></details>\n';
    };
}
