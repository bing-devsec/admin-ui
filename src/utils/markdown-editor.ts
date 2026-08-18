export type MarkdownListLine = {
    indent: string;
    marker: string;
    spacing: string;
    content: string;
};

export type MarkdownOrderedListLine = MarkdownListLine & {
    delimiter: string;
};

export type MarkdownCodeFenceContext = {
    indent: string;
    marker: string;
    length: number;
};

export type CurrentLineInfo = {
    lineStart: number;
    lineEnd: number;
    lineText: string;
};

export type TextRangeEdit = {
    start: number;
    end: number;
    insert: string;
    selectionStart: number;
    selectionEnd: number;
};

export type TextSearchOptions = {
    matchCase?: boolean;
};

export type TextSearchMatch = {
    start: number;
    end: number;
};

export type TextReplaceAllResult = {
    value: string;
    count: number;
    selectionStart: number;
    selectionEnd: number;
};

export type OrderedListRenumberResult = {
    value: string;
    selectionStart: number;
    selectionEnd: number;
};

export type MarkdownListIndentMoveResult = {
    value: string;
    nextCaret: number;
    movedLineWasOrdered: boolean;
    renumberOffsets: number[];
};

type BoldMarkerStripResult = {
    changed: boolean;
    text: string;
    outsideText: string;
};

const MARKDOWN_LIST_LINE_RE = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)(.*)$/;

export function getCurrentLineInfo(value: string, caret: number): CurrentLineInfo {
    const safeCaret = Math.max(0, Math.min(caret, value.length));
    const lineStart = value.lastIndexOf('\n', safeCaret - 1) + 1;
    const nextLineBreak = value.indexOf('\n', safeCaret);
    const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
    const lineText = value.slice(lineStart, lineEnd);
    return { lineStart, lineEnd, lineText };
}

export function parseMarkdownListLine(line: string): MarkdownListLine | null {
    const match = line.match(MARKDOWN_LIST_LINE_RE);
    if (!match) return null;
    return {
        indent: match[1],
        marker: match[2],
        spacing: match[3],
        content: match[4],
    };
}

export function parseMarkdownOrderedListLine(line: string): MarkdownOrderedListLine | null {
    const listLine = parseMarkdownListLine(line);
    if (!listLine) return null;

    const ordered = listLine.marker.match(/^(\d+)([.)])$/);
    if (!ordered) return null;

    return {
        ...listLine,
        delimiter: ordered[2],
    };
}

export function getNextListMarker(marker: string): string {
    const ordered = marker.match(/^(\d+)([.)])$/);
    if (!ordered) return marker;
    return `${Number.parseInt(ordered[1], 10) + 1}${ordered[2]}`;
}

export function getNormalizedListMarker(listLine: MarkdownListLine): string {
    const ordered = listLine.marker.match(/^\d+([.)])$/);
    return ordered ? `1${ordered[1]}` : listLine.marker;
}

export function getListContinuationIndent(listLine: MarkdownListLine): string {
    return listLine.indent + ' '.repeat(listLine.marker.length + listLine.spacing.length);
}

export function getActiveCodeFenceContext(value: string, offset: number): MarkdownCodeFenceContext | null {
    const lines = value.slice(0, offset).split('\n');
    let fence: MarkdownCodeFenceContext | null = null;

    for (const line of lines) {
        const match = line.match(/^([ \t]*)(`{3,}|~{3,})/);
        if (!match) continue;
        const marker = match[2][0];
        const length = match[2].length;
        if (!fence) {
            fence = { indent: match[1], marker, length };
        } else if (marker === fence.marker && length >= fence.length) {
            fence = null;
        }
    }

    return fence;
}

export function isCursorInsideCodeFence(value: string, lineStart: number): boolean {
    return getActiveCodeFenceContext(value, lineStart) !== null;
}

export function getContinuationIndentFromPreviousList(value: string, lineStart: number, currentLine: string): string | null {
    const currentIndent = currentLine.match(/^[ \t]*/)?.[0] ?? '';
    if (!currentIndent) return null;

    const previousSource = value.slice(0, lineStart).replace(/\n$/, '');
    if (!previousSource) return null;

    const previousLines = previousSource.split('\n');
    for (let index = previousLines.length - 1; index >= 0; index--) {
        const line = previousLines[index];
        if (!line.trim()) continue;

        const listLine = parseMarkdownListLine(line);
        if (listLine && currentIndent.length > listLine.indent.length) {
            return currentIndent;
        }

        const previousIndent = line.match(/^[ \t]*/)?.[0] ?? '';
        if (previousIndent.length < currentIndent.length) {
            return null;
        }
    }

    return null;
}

export function getBlockInsertionIndent(value: string, caret: number): string {
    const { lineStart, lineText } = getCurrentLineInfo(value, caret);
    if (isCursorInsideCodeFence(value, lineStart)) return '';

    const listLine = parseMarkdownListLine(lineText);
    if (listLine) {
        return getListContinuationIndent(listLine);
    }

    return getContinuationIndentFromPreviousList(value, lineStart, lineText) ?? '';
}

export function applyBlockInsertionIndent(snippet: string, indent: string): string {
    if (!indent) return snippet;
    return snippet
        .split('\n')
        .map((line) => `${indent}${line}`)
        .join('\n');
}

export function getIndentedCodeFencePasteText(value: string, start: number, text: string): string | null {
    const fence = getActiveCodeFenceContext(value, start);
    if (!fence?.indent) return null;

    const normalizedText = text.replace(/\r\n?/g, '\n');
    const { lineStart } = getCurrentLineInfo(value, start);
    const linePrefix = value.slice(lineStart, start);
    let firstLinePrefix = '';

    if (/^[ \t]*$/.test(linePrefix)) {
        if (fence.indent.startsWith(linePrefix)) {
            firstLinePrefix = fence.indent.slice(linePrefix.length);
        } else if (!linePrefix.startsWith(fence.indent)) {
            firstLinePrefix = fence.indent;
        }
    }

    const transformed = normalizedText
        .split('\n')
        .map((line, index) => `${index === 0 ? firstLinePrefix : fence.indent}${line}`)
        .join('\n');

    return transformed === text ? null : transformed;
}

export function getLineIndexAtOffset(value: string, offset: number): number {
    const safeOffset = Math.max(0, Math.min(offset, value.length));
    return value.slice(0, safeOffset).split('\n').length - 1;
}

function getLineStartOffsets(text: string): number[] {
    const starts = [0];
    for (let index = 0; index < text.length; index++) {
        if (text.charCodeAt(index) === 10) {
            starts.push(index + 1);
        }
    }
    return starts;
}

function findOrderedListAnchorLine(lines: string[], lineIndex: number): number | null {
    const candidates = [lineIndex, lineIndex - 1, lineIndex + 1];
    for (const candidate of candidates) {
        if (candidate < 0 || candidate >= lines.length) continue;
        if (parseMarkdownOrderedListLine(lines[candidate])) return candidate;
    }
    return null;
}

function isOrderedListContinuationLine(line: string, indent: string): boolean {
    if (!line.trim()) return true;
    const listLine = parseMarkdownListLine(line);
    if (listLine && listLine.indent.length <= indent.length) return false;
    const lineIndent = line.match(/^[ \t]*/)?.[0] ?? '';
    return lineIndent.length > indent.length;
}

function getOrderedListRange(lines: string[], anchorIndex: number, anchor: MarkdownOrderedListLine) {
    let start = anchorIndex;
    let end = anchorIndex;

    for (let index = anchorIndex - 1; index >= 0; index--) {
        const ordered = parseMarkdownOrderedListLine(lines[index]);
        if (ordered && ordered.indent === anchor.indent && ordered.delimiter === anchor.delimiter) {
            start = index;
            continue;
        }
        if (isOrderedListContinuationLine(lines[index], anchor.indent)) continue;
        break;
    }

    for (let index = anchorIndex + 1; index < lines.length; index++) {
        const ordered = parseMarkdownOrderedListLine(lines[index]);
        if (ordered && ordered.indent === anchor.indent && ordered.delimiter === anchor.delimiter) {
            end = index;
            continue;
        }
        if (isOrderedListContinuationLine(lines[index], anchor.indent)) continue;
        break;
    }

    return { start, end };
}

function adjustOffsetByOrderedListMarkerChanges(
    offset: number,
    changes: Array<{ markerStart: number; oldMarkerEnd: number; newMarkerEnd: number; diff: number }>
): number {
    let delta = 0;
    for (const change of changes) {
        if (offset <= change.markerStart) break;
        if (offset <= change.oldMarkerEnd) {
            return change.newMarkerEnd + delta;
        }
        delta += change.diff;
    }
    return offset + delta;
}

export function renumberOrderedList(
    value: string,
    offset: number,
    selectionStart = offset,
    selectionEnd = selectionStart
): OrderedListRenumberResult | null {
    const lineIndex = getLineIndexAtOffset(value, offset);
    const lines = value.split('\n');
    const anchorIndex = findOrderedListAnchorLine(lines, lineIndex);
    if (anchorIndex === null) return null;

    const anchor = parseMarkdownOrderedListLine(lines[anchorIndex]);
    if (!anchor) return null;

    const starts = getLineStartOffsets(value);
    const range = getOrderedListRange(lines, anchorIndex, anchor);
    const changes: Array<{ markerStart: number; oldMarkerEnd: number; newMarkerEnd: number; diff: number }> = [];
    let expectedNumber = 1;

    for (let index = range.start; index <= range.end; index++) {
        const ordered = parseMarkdownOrderedListLine(lines[index]);
        if (!ordered || ordered.indent !== anchor.indent || ordered.delimiter !== anchor.delimiter) continue;

        const nextMarker = `${expectedNumber}${ordered.delimiter}`;
        expectedNumber += 1;
        if (ordered.marker === nextMarker) continue;

        const lineStart = starts[index];
        const markerStart = lineStart + ordered.indent.length;
        const oldMarkerEnd = markerStart + ordered.marker.length;
        const newMarkerEnd = markerStart + nextMarker.length;
        changes.push({
            markerStart,
            oldMarkerEnd,
            newMarkerEnd,
            diff: nextMarker.length - ordered.marker.length,
        });
        lines[index] = `${ordered.indent}${nextMarker}${ordered.spacing}${ordered.content}`;
    }

    if (!changes.length) return null;

    return {
        value: lines.join('\n'),
        selectionStart: adjustOffsetByOrderedListMarkerChanges(selectionStart, changes),
        selectionEnd: adjustOffsetByOrderedListMarkerChanges(selectionEnd, changes),
    };
}

function getListItemRange(lines: string[], lineIndex: number, listLine: MarkdownListLine) {
    let end = lineIndex;

    for (let index = lineIndex + 1; index < lines.length; index++) {
        const nextList = parseMarkdownListLine(lines[index]);
        if (nextList && nextList.indent.length <= listLine.indent.length) break;
        end = index;
    }

    return { start: lineIndex, end };
}

function findPreviousListForIndent(lines: string[], lineIndex: number, currentIndent: string): MarkdownListLine | null {
    for (let index = lineIndex - 1; index >= 0; index--) {
        const line = lines[index];
        if (!line.trim()) continue;

        const listLine = parseMarkdownListLine(line);
        if (listLine && listLine.indent.length <= currentIndent.length) {
            return listLine;
        }
    }

    return null;
}

function findParentListForOutdent(lines: string[], lineIndex: number, currentIndent: string): MarkdownListLine | null {
    for (let index = lineIndex - 1; index >= 0; index--) {
        const listLine = parseMarkdownListLine(lines[index]);
        if (listLine && listLine.indent.length < currentIndent.length) {
            return listLine;
        }
    }

    return null;
}

function removeOneMarkdownIndentLevel(indent: string): string {
    if (!indent) return indent;
    if (indent.endsWith('\t')) return indent.slice(0, -1);
    if (indent.length <= 3) return '';
    return indent.slice(0, -2);
}

function getMovedListLine(listLine: MarkdownListLine, targetIndent: string): string {
    return `${targetIndent}${getNormalizedListMarker(listLine)}${listLine.spacing}${listLine.content}`;
}

function transformListItemIndent(lines: string[], range: { start: number; end: number }, listLine: MarkdownListLine, targetIndent: string): string[] {
    return lines.slice(range.start, range.end + 1).map((line, index) => {
        if (index === 0) {
            return getMovedListLine(listLine, targetIndent);
        }
        if (line.startsWith(listLine.indent)) {
            return `${targetIndent}${line.slice(listLine.indent.length)}`;
        }
        return `${targetIndent}${line}`;
    });
}

export function moveMarkdownListItemIndent(value: string, caret: number, shiftKey: boolean): MarkdownListIndentMoveResult | null {
    const { lineStart, lineText } = getCurrentLineInfo(value, caret);
    if (isCursorInsideCodeFence(value, lineStart)) return null;

    const listLine = parseMarkdownListLine(lineText);
    if (!listLine) return null;

    const lines = value.split('\n');
    const lineIndex = getLineIndexAtOffset(value, caret);
    let targetIndent = '';
    if (shiftKey) {
        const parent = findParentListForOutdent(lines, lineIndex, listLine.indent);
        targetIndent = parent ? parent.indent : removeOneMarkdownIndentLevel(listLine.indent);
        if (targetIndent === listLine.indent) return null;
    } else {
        const previousList = findPreviousListForIndent(lines, lineIndex, listLine.indent);
        targetIndent = previousList ? getListContinuationIndent(previousList) : `${listLine.indent}  `;
    }

    if (targetIndent === listLine.indent) return null;

    const lineStartOffsets = getLineStartOffsets(value);
    const range = getListItemRange(lines, lineIndex, listLine);
    const transformedLines = transformListItemIndent(lines, range, listLine, targetIndent);
    const replaceStart = lineStartOffsets[range.start];
    const replaceEnd = lineStartOffsets[range.end] + lines[range.end].length;
    const insert = transformedLines.join('\n');
    const marker = getNormalizedListMarker(listLine);
    const oldContentStart = lineStartOffsets[lineIndex] + listLine.indent.length + listLine.marker.length + listLine.spacing.length;
    const newContentStart = replaceStart + targetIndent.length + marker.length + listLine.spacing.length;
    const nextCaret = caret <= oldContentStart ? newContentStart : newContentStart + (caret - oldContentStart);

    return {
        value: `${value.slice(0, replaceStart)}${insert}${value.slice(replaceEnd)}`,
        nextCaret,
        movedLineWasOrdered: parseMarkdownOrderedListLine(lineText) !== null,
        renumberOffsets: [nextCaret, replaceStart + insert.length + 1],
    };
}

export function createMarkdownTable(rows: number, cols: number): string {
    const safeRows = normalizeTableSize(rows, 1, 20);
    const safeCols = normalizeTableSize(cols, 1, 10);
    const headers = Array.from({ length: safeCols }, (_, index) => `列 ${index + 1}`);
    const divider = Array.from({ length: safeCols }, () => '---');
    const bodyRows = Array.from({ length: safeRows }, () => Array.from({ length: safeCols }, () => '').join(' | '));
    return [
        `| ${headers.join(' | ')} |`,
        `| ${divider.join(' | ')} |`,
        ...bodyRows.map((row) => `| ${row} |`),
    ].join('\n');
}

function normalizeTableSize(value: number, min: number, max: number): number {
    const size = Math.floor(Number(value));
    if (!Number.isFinite(size)) return min;
    return Math.min(Math.max(size, min), max);
}

export function formatMarkdownListSelection(source: string, ordered: boolean): string {
    const lines = (source || '列表项').split('\n');
    let orderedIndex = 1;
    return lines.map((line) => {
        if (!line.trim()) return line;
        const text = line.replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '');
        return ordered ? `${orderedIndex++}. ${text}` : `- ${text}`;
    }).join('\n');
}

function trimSelectedLineBoundaryWhitespace(value: string, start: number, end: number): { start: number; end: number } {
    const selected = value.slice(start, end);
    if (!selected) return { start, end };

    const leadingWhitespace = selected.match(/^[\t \r\n]+/)?.[0] ?? '';
    const trailingWhitespace = selected.match(/[\t \r\n]+$/)?.[0] ?? '';
    const nextStart = /[\r\n]/.test(leadingWhitespace) ? start + leadingWhitespace.length : start;
    const nextEnd = /[\r\n]/.test(trailingWhitespace) ? end - trailingWhitespace.length : end;

    return nextStart < nextEnd ? { start: nextStart, end: nextEnd } : { start, end };
}

function getBacktickMarker(source: string, minLength: number): string {
    const longestBacktickRun = Math.max(0, ...Array.from(source.matchAll(/`+/g), (match) => match[0].length));
    return '`'.repeat(Math.max(minLength, longestBacktickRun + 1));
}

export function getMarkdownInlineCodeEdit(
    value: string,
    start: number,
    end: number,
    fallbackText = 'code'
): TextRangeEdit {
    ({ start, end } = trimSelectedLineBoundaryWhitespace(value, start, end));
    const text = value.slice(start, end) || fallbackText;
    const marker = getBacktickMarker(text, 1);
    const needsPadding = text.startsWith('`') || text.endsWith('`') ||
        (text.startsWith(' ') && text.endsWith(' ') && Boolean(text.trim()));
    const padding = needsPadding ? ' ' : '';
    const insert = `${marker}${padding}${text}${padding}${marker}`;
    const selectionStart = start + marker.length + padding.length;

    return {
        start,
        end,
        insert,
        selectionStart,
        selectionEnd: selectionStart + text.length,
    };
}

export function getMarkdownCodeBlockEdit(
    value: string,
    start: number,
    end: number,
    language = 'bash'
): TextRangeEdit | null {
    const selected = value.slice(start, end);
    if (!selected) return null;

    const leadingLineBreaks = selected.match(/^(?:\r?\n)+/)?.[0] ?? '';
    const trailingLineBreaks = selected.match(/(?:\r?\n)+$/)?.[0] ?? '';
    start += leadingLineBreaks.length;
    end -= trailingLineBreaks.length;
    if (start >= end) return null;

    const text = value.slice(start, end);
    const before = value.slice(0, start);
    const after = value.slice(end);
    const prefix = before && !before.endsWith('\n\n') ? (before.endsWith('\n') ? '\n' : '\n\n') : '';
    const suffix = after && !after.startsWith('\n\n') ? (after.startsWith('\n') ? '\n' : '\n\n') : '';
    const fence = getBacktickMarker(text, 3);
    const openingFence = `${fence}${language.trim()}`;
    const insert = `${prefix}${openingFence}\n${text}\n${fence}${suffix}`;
    const selectionStart = start + prefix.length + openingFence.length + 1;

    return {
        start,
        end,
        insert,
        selectionStart,
        selectionEnd: selectionStart + text.length,
    };
}

export function getTextSearchMatches(value: string, query: string, options: TextSearchOptions = {}): TextSearchMatch[] {
    if (!query) return [];

    const source = options.matchCase ? value : value.toLowerCase();
    const needle = options.matchCase ? query : query.toLowerCase();
    if (!needle) return [];

    const matches: TextSearchMatch[] = [];
    let index = source.indexOf(needle);
    while (index !== -1) {
        matches.push({ start: index, end: index + query.length });
        index = source.indexOf(needle, index + needle.length);
    }

    return matches;
}

export function replaceAllTextSearchMatches(value: string, matches: TextSearchMatch[], replacement: string): TextReplaceAllResult {
    if (!matches.length) {
        return {
            value,
            count: 0,
            selectionStart: 0,
            selectionEnd: 0,
        };
    }

    let cursor = 0;
    let nextValue = '';
    for (const match of matches) {
        nextValue += value.slice(cursor, match.start) + replacement;
        cursor = match.end;
    }
    nextValue += value.slice(cursor);

    const firstMatchStart = matches[0].start;
    return {
        value: nextValue,
        count: matches.length,
        selectionStart: firstMatchStart,
        selectionEnd: firstMatchStart + replacement.length,
    };
}

function isStandaloneBoldMarker(value: string, index: number): boolean {
    return value.slice(index, index + 2) === '**' && value[index - 1] !== '*' && value[index + 2] !== '*';
}

function findNextStandaloneBoldMarker(value: string, from: number): number {
    let index = value.indexOf('**', from);
    while (index !== -1) {
        if (isStandaloneBoldMarker(value, index)) return index;
        index = value.indexOf('**', index + 1);
    }
    return -1;
}

function stripCompleteBoldMarkers(value: string): BoldMarkerStripResult {
    let cursor = 0;
    let text = '';
    let outsideText = '';
    let changed = false;

    while (cursor < value.length) {
        const open = findNextStandaloneBoldMarker(value, cursor);
        if (open === -1) break;

        const close = findNextStandaloneBoldMarker(value, open + 2);
        if (close === -1) break;

        const before = value.slice(cursor, open);
        const content = value.slice(open + 2, close);
        if (!content) {
            text += value.slice(cursor, open + 2);
            cursor = open + 2;
            continue;
        }

        text += before + content;
        outsideText += before;
        cursor = close + 2;
        changed = true;
    }

    const rest = value.slice(cursor);
    return {
        changed,
        text: text + rest,
        outsideText: outsideText + rest,
    };
}

function isOnlyPunctuationOrSpace(value: string): boolean {
    return value.replace(/[\s\u3000.,;:!?，。；：！？、·~\-—–()[\]{}<>《》"'“”‘’`\\/|+=*&^%$#@]+/g, '') === '';
}

export function getBoldToggleEdit(value: string, start: number, end: number, fallbackText = '加粗文本'): TextRangeEdit {
    ({ start, end } = trimSelectedLineBoundaryWhitespace(value, start, end));
    const selected = value.slice(start, end);
    if (selected) {
        const hasBoldWrapperAroundSelection = start >= 2 && value.slice(start - 2, start) === '**' && value.slice(end, end + 2) === '**';
        if (hasBoldWrapperAroundSelection) {
            const wrappedSelection = value.slice(start - 2, end + 2);
            const strippedWrapped = stripCompleteBoldMarkers(wrappedSelection);
            if (strippedWrapped.changed && isOnlyPunctuationOrSpace(strippedWrapped.outsideText)) {
                const replaceStart = start - 2;
                return {
                    start: replaceStart,
                    end: end + 2,
                    insert: strippedWrapped.text,
                    selectionStart: replaceStart,
                    selectionEnd: replaceStart + strippedWrapped.text.length,
                };
            }
        }

        const stripped = stripCompleteBoldMarkers(selected);
        if (stripped.changed) {
            if (isOnlyPunctuationOrSpace(stripped.outsideText)) {
                return {
                    start,
                    end,
                    insert: stripped.text,
                    selectionStart: start,
                    selectionEnd: start + stripped.text.length,
                };
            }

            const insert = `**${stripped.text}**`;
            return {
                start,
                end,
                insert,
                selectionStart: start + 2,
                selectionEnd: start + 2 + stripped.text.length,
            };
        }
    }

    const text = selected || fallbackText;
    return {
        start,
        end,
        insert: `**${text}**`,
        selectionStart: start + 2,
        selectionEnd: start + 2 + text.length,
    };
}
