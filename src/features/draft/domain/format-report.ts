/**
 * Format Report - Conversao markdown para HTML/texto mantendo GFM.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const TRIANGLE_BULLET = '\u25BA';
const SUB_BULLET_RE = /^\s*[▪◦•·]\s+/u;
const TRIANGLE_VARIANTS_RE = /[\u25BA\u25B8\u25B6\u25BB]/g;
const TRIANGLE_MOJIBAKE_RE = /(?:Ã¢â€“Âº|ÃƒÂ¢Ã¢â‚¬â€œÃ‚Âº|Ã¢â€“Â¸|Ã¢â€“Â¶|Ã¢â€“Â»|â–º)/g;
const THEMATIC_BREAK_RE = /^([*_-])\1{2,}$/;
const EXAM_TITLE_KEYWORDS = [
    'TOMOGRAFIA',
    'RESSONANCIA',
    'ULTRASSONOGRAFIA',
    'RADIOGRAFIA',
    'MAMOGRAFIA',
    'DENSITOMETRIA',
    'CINTILOGRAFIA',
    'PET',
];
const SECTION_TITLES = new Set([
    'INDICACAO CLINICA',
    'TECNICA E PROTOCOLO',
    'ACHADOS TOMOGRAFICOS',
    'ACHADOS ULTRASSONOGRAFICOS',
    'ACHADOS POR RESSONANCIA MAGNETICA',
    'COMPARACAO',
    'IMPRESSAO',
    'DIAGNOSTICO PRINCIPAL:',
    'DIAGNOSTICOS DIFERENCIAIS:',
    'RELACAO COM A INDICACAO CLINICA:',
    'RECOMENDACOES:',
    'ACHADOS INCIDENTAIS:',
    'ACHADOS INCIDENTAIS RELEVANTES:',
    'EVENTOS ADVERSOS:',
    'NOTA SOBRE DESCRITORES DE PROBABILIDADE',
    'NOTA DE PROCEDIMENTO',
    'FIGURA CHAVE',
    'FIGURAS CHAVE',
    'IMAGEM CHAVE',
    'IMAGENS CHAVE',
]);
const NOTE_SECTION_TITLES = new Set([
    'NOTA SOBRE DESCRITORES DE PROBABILIDADE',
    'NOTA DE PROCEDIMENTO',
    'FIGURA CHAVE',
    'FIGURAS CHAVE',
    'IMAGEM CHAVE',
    'IMAGENS CHAVE',
]);
const SECTION_TITLES_NO_COLON = new Set(Array.from(SECTION_TITLES).map((title) => title.replace(/:\s*$/u, '')));
const ANNEX_READ_HEADER_RE = /^ANEXO LIDO INTEGRALMENTE:/i;

export type ExportTypographyOptions = {
    bodyFontPt?: number;
    titleFontPt?: number;
    notesFontPt?: number;
    lineHeight?: number;
    centerExamTitle?: boolean;
    justify?: boolean;
    fontFamily?: string;
    removeAnnexReadHeader?: boolean;
};

export type ClipboardTextOptions = {
    removeAnnexReadHeader?: boolean;
};

function removeDiacritics(value: string): string {
    return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function isThematicBreakLine(value: string): boolean {
    return THEMATIC_BREAK_RE.test(value.trim());
}

function normalizeTriangleGlyphs(text: string): string {
    return text
        .replace(TRIANGLE_MOJIBAKE_RE, TRIANGLE_BULLET)
        .replace(TRIANGLE_VARIANTS_RE, TRIANGLE_BULLET);
}

function splitInlineTriangleBullets(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];

    for (const rawLine of lines) {
        const line = rawLine.replace(/[ \t]+$/g, '');
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(TRIANGLE_BULLET)) {
            out.push(line);
            continue;
        }

        const idx = trimmed.indexOf(TRIANGLE_BULLET);
        if (idx <= 0) {
            out.push(line);
            continue;
        }

        const before = trimmed.slice(0, idx).trimEnd();
        const after = trimmed.slice(idx + 1).trimStart();
        if (!before || !after) {
            out.push(line);
            continue;
        }

        const indent = line.match(/^\s*/)?.[0] ?? '';
        out.push(`${indent}${before}`);
        out.push(`${indent}${TRIANGLE_BULLET} ${after}`);
    }

    return out.join('\n');
}

function isSubtitleLikeLine(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (/^\*\*[^*].*\*\*:?[ \t]*$/u.test(trimmed)) return true;
    if (/^#{1,6}\s+\S/u.test(trimmed)) return true;
    return false;
}

function separateSubtitleFromTriangleBullets(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        out.push(line);
        const next = lines[i + 1] || '';
        if (!isSubtitleLikeLine(line)) continue;
        if (!next.trim().startsWith(TRIANGLE_BULLET)) continue;
        out.push('');
    }

    return out.join('\n');
}

function splitInlineBoldLabelContent(text: string): string {
    const plainLabelRe = /^(\s*(?:Achados incidentais(?: relevantes)?|Eventos adversos|Diagn[oó]stico principal|Diagn[oó]sticos diferenciais|Rela[cç][aã]o com a indica[cç][aã]o cl[ií]nica|Recomenda[cç][oõ]es):)\s+(.+)$/iu;
    const lines = text.split('\n');
    const out: string[] = [];

    for (const line of lines) {
        const match = line.match(/^(\s*\*\*[^*]+:\*\*)\s+(.+)$/u);
        if (match) {
            out.push(match[1].trimEnd());
            out.push('');
            out.push(match[2].trimStart());
            continue;
        }

        const plainMatch = line.match(plainLabelRe);
        if (!plainMatch) {
            out.push(line);
            continue;
        }

        out.push(plainMatch[1].trimEnd());
        out.push('');
        out.push(plainMatch[2].trimStart());
    }

    return out.join('\n');
}

function splitInlineDifferentialRationale(text: string): string {
    const markerRe = /(\*{1,3}\s*A favor:\s*\*{1,3}|\*{1,3}\s*Contra\/menos favor[aá]vel:\s*\*{1,3}|A favor:|Contra\/menos favor[aá]vel:)/i;
    const lines = text.split('\n');
    const out: string[] = [];

    for (const line of lines) {
        const marker = line.match(markerRe);
        if (!marker || marker.index === undefined || marker.index <= 0) {
            out.push(line);
            continue;
        }

        const trimmed = line.trim();
        if (SUB_BULLET_RE.test(trimmed)) {
            out.push(line);
            continue;
        }

        let prefix = line.slice(0, marker.index).trimEnd();
        let suffix = line.slice(marker.index).trimStart();
        prefix = prefix.replace(/[▪◦•·]\s*$/u, '').trimEnd();

        if (!prefix || !suffix) {
            out.push(line);
            continue;
        }

        if (!SUB_BULLET_RE.test(suffix)) {
            suffix = `▪ ${suffix}`;
        }

        out.push(prefix);
        out.push('');
        out.push(suffix);
    }

    return out.join('\n');
}

function isSubBulletLabelLine(value: string): boolean {
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (isSubtitleLikeLine(trimmed)) return true;
    if (/^►\s+\*\*.+:\*\*[ \t]*$/u.test(trimmed)) return true;
    if (/^►\s+.+:[ \t]*$/u.test(trimmed)) return true;
    if (/^[▪◦•·]\s+\*\*.+:\*\*[ \t]*$/u.test(trimmed)) return true;
    return false;
}

function separateLabelsFromSubBullets(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        out.push(line);
        const next = lines[i + 1] || '';
        if (!isSubBulletLabelLine(line)) continue;
        if (!SUB_BULLET_RE.test(next.trim())) continue;
        out.push('');
    }

    return out.join('\n');
}

function normalizeThematicBreakBlocks(text: string): string {
    const lines = text.split('\n');
    const out: string[] = [];
    const lastNonEmpty = (): string => {
        for (let i = out.length - 1; i >= 0; i--) {
            if (out[i].trim()) return out[i];
        }
        return '';
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!isThematicBreakLine(trimmed)) {
            out.push(line);
            continue;
        }

        const prev = out.length > 0 ? out[out.length - 1] : '';
        if (prev.trim() && !isThematicBreakLine(prev)) {
            out.push('');
        }

        if (isThematicBreakLine(lastNonEmpty())) {
            continue;
        }

        out.push('---');

        const next = (lines[i + 1] || '').trim();
        if (next && !isThematicBreakLine(next)) {
            out.push('');
        }
    }

    return out.join('\n');
}

function capitalizeIndicationOpening(text: string): string {
    const lines = text.split('\n');
    const isIndicationTitle = (value: string): boolean => {
        const normalized = removeDiacritics(value)
            .replace(/\*/g, '')
            .toLowerCase()
            .trim();
        return normalized === 'indicacao clinica';
    };

    const capitalizeFirstLetter = (value: string): string =>
        value.replace(/^(\s*)([\p{Ll}])/u, (_m, ws: string, ch: string) => `${ws}${ch.toLocaleUpperCase('pt-BR')}`);

    for (let i = 0; i < lines.length; i++) {
        if (!isIndicationTitle(lines[i])) continue;

        for (let j = i + 1; j < lines.length; j++) {
            const candidate = lines[j];
            const trimmed = candidate.trim();
            if (!trimmed || isThematicBreakLine(trimmed)) continue;
            if (trimmed.startsWith(TRIANGLE_BULLET) || SUB_BULLET_RE.test(trimmed)) break;
            lines[j] = capitalizeFirstLetter(candidate);
            return lines.join('\n');
        }
    }

    return lines.join('\n');
}

function normalizeMarkdownTitleCandidate(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    const unwrapped = trimmed
        .replace(/^#{1,6}\s+/u, '')
        .replace(/^\*\*\s*(.*?)\s*\*\*$/u, '$1')
        .replace(/^__\s*(.*?)\s*__$/u, '$1')
        .trim();

    return normalizeSectionLabel(unwrapped);
}

function isKnownSectionTitleLine(value: string): boolean {
    const normalized = normalizeMarkdownTitleCandidate(value);
    if (!normalized) return false;
    if (SECTION_TITLES.has(normalized)) return true;
    return SECTION_TITLES_NO_COLON.has(normalized.replace(/:\s*$/u, ''));
}

function isProcedureNoteTitleLine(value: string): boolean {
    const normalized = normalizeMarkdownTitleCandidate(value);
    if (!normalized) return false;
    return normalized.replace(/:\s*$/u, '') === 'NOTA DE PROCEDIMENTO';
}

function ensureProcedureNoteTrailingRule(text: string): string {
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        if (!isProcedureNoteTitleLine(lines[i])) continue;

        let inserted = false;
        for (let j = i + 1; j < lines.length; j++) {
            const trimmed = lines[j].trim();
            if (!trimmed) continue;
            if (isThematicBreakLine(trimmed)) {
                inserted = true;
                break;
            }
            if (!isKnownSectionTitleLine(trimmed)) {
                continue;
            }

            lines.splice(j, 0, '', '---', '');
            inserted = true;
            i = j + 2;
            break;
        }

        if (inserted) continue;

        let tail = lines.length - 1;
        while (tail >= 0 && !lines[tail].trim()) tail--;
        if (tail >= 0 && !isThematicBreakLine(lines[tail].trim())) {
            lines.push('', '---');
        }
    }

    return lines.join('\n');
}

export function prepareMarkdownForRender(md: string): string {
    if (!md) return '';

    let normalized = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    normalized = normalizeTriangleGlyphs(normalized);
    normalized = splitInlineBoldLabelContent(normalized);
    normalized = splitInlineDifferentialRationale(normalized);
    normalized = splitInlineTriangleBullets(normalized);
    normalized = separateSubtitleFromTriangleBullets(normalized);
    normalized = separateLabelsFromSubBullets(normalized);
    normalized = ensureProcedureNoteTrailingRule(normalized);
    normalized = normalizeThematicBreakBlocks(normalized);
    normalized = capitalizeIndicationOpening(normalized);
    normalized = normalized.replace(/\n{3,}/g, '\n\n');
    return normalized.trim();
}

function normalizeSectionLabel(value: string): string {
    return removeDiacritics(value)
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function getNodeText(node: Element): string {
    return (node.textContent || '').replace(/\s+/g, ' ').trim();
}

function setInlineStyle(node: Element, declarations: Record<string, string>): void {
    const current = node.getAttribute('style')?.trim() || '';
    const parts = current ? [current.replace(/;?$/, ';')] : [];
    for (const [key, value] of Object.entries(declarations)) {
        parts.push(`${key}: ${value};`);
    }
    node.setAttribute('style', parts.join(' '));
}

function isSectionTitle(text: string): boolean {
    return SECTION_TITLES.has(normalizeSectionLabel(text));
}

function isNoteSectionTitle(text: string): boolean {
    return NOTE_SECTION_TITLES.has(normalizeSectionLabel(text));
}

function looksLikeExamTitle(text: string): boolean {
    const cleaned = text.replace(/[^\p{L}\p{N}\s\-()/]/gu, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 10) return false;
    const normalized = normalizeSectionLabel(cleaned);
    if (isSectionTitle(normalized)) return false;
    if (!EXAM_TITLE_KEYWORDS.some((keyword) => normalized.includes(keyword))) return false;

    const lettersOnly = cleaned.replace(/[^\p{L}]/gu, '');
    if (!lettersOnly) return false;
    let uppercaseCount = 0;
    for (const ch of lettersOnly) {
        if (ch === ch.toLocaleUpperCase('pt-BR')) uppercaseCount += 1;
    }
    const uppercaseRatio = uppercaseCount / lettersOnly.length;
    return uppercaseRatio >= 0.8 || cleaned === cleaned.toLocaleUpperCase('pt-BR');
}

function applyNotesTypography(topBlocks: Element[], notesFontPt: number, lineHeight: number): void {
    for (let i = 0; i < topBlocks.length; i++) {
        const block = topBlocks[i];
        const text = getNodeText(block);
        if (!isNoteSectionTitle(text)) continue;

        setInlineStyle(block, {
            'font-size': `${notesFontPt}pt`,
            'line-height': String(lineHeight),
            'font-weight': '700',
            'text-align': 'left',
        });

        for (let j = i + 1; j < topBlocks.length; j++) {
            const next = topBlocks[j];
            const nextTag = next.tagName.toLowerCase();
            if (nextTag === 'hr') {
                if (j === i + 1) {
                    continue;
                }
                break;
            }

            setInlineStyle(next, {
                'font-size': `${notesFontPt}pt`,
                'line-height': String(lineHeight),
                'text-align': 'justify',
            });
            next.querySelectorAll('p, li, td, th').forEach((child) => {
                setInlineStyle(child, {
                    'font-size': `${notesFontPt}pt`,
                    'line-height': String(lineHeight),
                    'text-align': 'justify',
                });
            });
        }
    }
}

function applyExportTypography(renderedHtml: string, options?: ExportTypographyOptions): string {
    const bodyFontPt = options?.bodyFontPt ?? 12;
    const titleFontPt = options?.titleFontPt ?? 14;
    const notesFontPt = options?.notesFontPt ?? 10;
    const lineHeight = options?.lineHeight ?? 1.5;
    const justify = options?.justify ?? true;
    const centerExamTitle = options?.centerExamTitle ?? true;
    const fontFamily = options?.fontFamily ?? 'Arial, Helvetica, sans-serif';
    const removeAnnexReadHeader = options?.removeAnnexReadHeader ?? false;

    const rootInlineStyle = [
        `font-family: ${fontFamily}`,
        `font-size: ${bodyFontPt}pt`,
        `line-height: ${lineHeight}`,
        `text-align: ${justify ? 'justify' : 'left'}`,
        'color: #111111',
    ].join('; ');

    if (typeof DOMParser === 'undefined') {
        return `<div style="${rootInlineStyle};">${renderedHtml}</div>`;
    }

    const doc = new DOMParser().parseFromString(renderedHtml, 'text/html');
    if (removeAnnexReadHeader) {
        Array.from(doc.body.children).forEach((node) => {
            if (ANNEX_READ_HEADER_RE.test(getNodeText(node))) {
                node.remove();
            }
        });
    }

    const topBlocks = Array.from(doc.body.children);

    doc.body.querySelectorAll('p, li, td, th, blockquote, pre').forEach((node) => {
        setInlineStyle(node, {
            'font-size': `${bodyFontPt}pt`,
            'line-height': String(lineHeight),
            'text-align': justify ? 'justify' : 'left',
        });
    });

    doc.body.querySelectorAll('table').forEach((table) => {
        setInlineStyle(table, {
            width: '100%',
            'border-collapse': 'collapse',
            'margin-top': '6pt',
            'margin-bottom': '6pt',
        });
    });

    doc.body.querySelectorAll('th, td').forEach((cell) => {
        setInlineStyle(cell, {
            border: '1px solid #d0d0d0',
            padding: '4pt 6pt',
            'vertical-align': 'top',
        });
    });

    doc.body.querySelectorAll('hr').forEach((hr) => {
        setInlineStyle(hr, {
            border: '0',
            'border-top': '1px solid #cfcfcf',
            margin: '6pt 0',
        });
    });

    applyNotesTypography(topBlocks, notesFontPt, lineHeight);

    if (centerExamTitle) {
        const titleBlock = topBlocks.find((node) => looksLikeExamTitle(getNodeText(node)));
        if (titleBlock) {
            setInlineStyle(titleBlock, {
                'font-size': `${titleFontPt}pt`,
                'line-height': String(lineHeight),
                'text-align': 'center',
                'font-weight': '700',
                'margin-top': '2pt',
                'margin-bottom': '6pt',
            });
            titleBlock.querySelectorAll('strong').forEach((strong) => {
                setInlineStyle(strong, {
                    'font-size': `${titleFontPt}pt`,
                });
            });
        }
    }

    return `<div style="${rootInlineStyle};">${doc.body.innerHTML}</div>`;
}

function buildRenderedHtml(md: string): string {
    if (!md) return '';
    const normalized = prepareMarkdownForRender(md);

    const rendered = renderToStaticMarkup(
        React.createElement(
            ReactMarkdown,
            { remarkPlugins: [remarkGfm] },
            normalized,
        ),
    );

    return rendered;
}

function stripLeadingAnnexReadHeader(md: string): string {
    const lines = md.split('\n');
    let idx = 0;

    while (idx < lines.length && !lines[idx].trim()) idx++;
    if (idx < lines.length && ANNEX_READ_HEADER_RE.test(lines[idx].trim())) {
        lines.splice(idx, 1);
        while (idx < lines.length && !lines[idx].trim()) {
            lines.splice(idx, 1);
        }
    }

    return lines.join('\n');
}

export function buildStyledReportHtmlForExport(
    md: string,
    options?: ExportTypographyOptions,
): string {
    const rendered = buildRenderedHtml(md);
    return applyExportTypography(rendered, options);
}

export function markdownToCleanHTML(md: string): string {
    return buildRenderedHtml(md);
}

export function markdownToClipboardText(md: string, options?: ClipboardTextOptions): string {
    if (!md) return '';
    const normalizedMd = options?.removeAnnexReadHeader ? stripLeadingAnnexReadHeader(md) : md;

    const html = buildRenderedHtml(normalizedMd);
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
        return normalizedMd.trim();
    }

    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '').trim();
}

export function stripMarkdown(md: string): string {
    return markdownToClipboardText(md);
}
