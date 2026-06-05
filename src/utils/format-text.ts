// Markdown 排版美化工具
// 设计原则：
//   1) 必须保护代码块/行内代码/数学公式/链接 URL/HTML 标签，避免误改;
//   2) 仅做安全无损的文本层修正，不改语义;
//   3) 处理顺序：保护占位 → 文本变换 → 还原占位。

const PLACEHOLDER_PREFIX = '\u0000FMT_';
const PLACEHOLDER_SUFFIX = '\u0000';

/**
 * 美化 Markdown 文本：
 *   - CJK 与 ASCII 字母/数字之间补一个空格（盘古之白）
 *   - 清理行尾空白
 *   - 连续空行收敛为最多 1 个空行
 *
 * 注意：标题 / 列表 / 引用后的空格属于 Markdown 语法本身，
 *       不在美化范围内（避免在 `#话题`、`>=` 等场景误改语义）。
 */
export function beautifyMarkdown(input: string): string {
    if (!input) return input;

    const protects: string[] = [];
    const protect = (s: string): string => {
        const i = protects.length;
        protects.push(s);
        return `${PLACEHOLDER_PREFIX}${i}${PLACEHOLDER_SUFFIX}`;
    };

    let text = input;

    // ============================================================
    // 1) 保护区：替换为占位符
    // ============================================================
    // 围栏代码块（含语言标识）
    text = text.replace(/```[\s\S]*?```/g, (m) => protect(m));
    // 块级公式 $$...$$
    text = text.replace(/\$\$[\s\S]*?\$\$/g, (m) => protect(m));
    // 行内代码 `...`
    text = text.replace(/`[^`\n]+`/g, (m) => protect(m));
    // 行内公式 $...$（要求 $ 两侧不是空白，避免误伤价格符号）
    text = text.replace(/\$(?=\S)([^$\n]+?)(?<=\S)\$/g, (m) => protect(m));
    // Markdown 链接/图片，仅保护 URL 部分；label 仍然参与文本美化
    text = text.replace(/(!?\[)([^\]]*)\]\(([^)\n]+)\)/g, (_m, prefix, label, url) => {
        return `${prefix}${label}]${protect('(' + url + ')')}`;
    });
    // 行内 HTML 标签
    text = text.replace(/<[^>\n]+>/g, (m) => protect(m));

    // ============================================================
    // 2) 文本变换
    // ============================================================
    const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff';
    // CJK 后跟 ASCII 字母/数字
    text = text.replace(new RegExp(`([${CJK}])([A-Za-z0-9])`, 'g'), '$1 $2');
    // ASCII 字母/数字后跟 CJK
    text = text.replace(new RegExp(`([A-Za-z0-9])([${CJK}])`, 'g'), '$1 $2');

    // 行尾空白清理
    text = text.replace(/[ \t]+$/gm, '');

    // 连续空行收敛为最多 1 个空行
    text = text.replace(/\n{3,}/g, '\n\n');

    // ============================================================
    // 3) 还原保护区
    // ============================================================
    text = text.replace(
        new RegExp(`${PLACEHOLDER_PREFIX}(\\d+)${PLACEHOLDER_SUFFIX}`, 'g'),
        (_m, i) => protects[Number(i)] ?? ''
    );

    return text;
}
