import { parseHTML } from 'linkedom';

const NOISE_SELECTORS = [
    'script',
    'style',
    'noscript',
    'iframe',
    'nav',
    'footer',
    'header',
    'aside',
    '[role="navigation"]',
    '[role="banner"]',
    '[role="contentinfo"]',
    '.nav',
    '.navigation',
    '.menu',
    '.sidebar',
    '.footer',
    '.header',
    '.ad',
    '.ads',
    '.advertisement',
    '.cookie-banner',
    '.popup',
    '.modal',
];

const CONTENT_SELECTORS = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.article',
    '.post',
    '.entry',
    '#content',
    '#main',
];

export function extractTextFromHtml(html: string, maxLength = 8000): string {
    const { document } = parseHTML(html);

    for (const selector of NOISE_SELECTORS) {
        try {
            document.querySelectorAll(selector).forEach((el: Element) => { el.remove(); });
        } catch {
            // Invalid selector, skip
        }
    }

    let contentElement: Element | null = null;
    for (const selector of CONTENT_SELECTORS) {
        try {
            contentElement = document.querySelector(selector);
            if (contentElement) break;
        } catch {
            // Invalid selector, skip
        }
    }

    const root = contentElement ?? document.body;
    if (!root) return '';

    const text = extractText(root);
    const cleaned = cleanText(text);

    if (cleaned.length > maxLength) {
        return cleaned.slice(0, maxLength) + '\n\n[Content truncated]';
    }

    return cleaned;
}

function extractText(element: Element): string {
    const parts: string[] = [];

    for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === 3) {
            const text = node.textContent?.trim();
            if (text) parts.push(text);
        } else if (node.nodeType === 1) {
            const el = node as Element;
            const tagName = el.tagName?.toLowerCase();

            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
                const text = el.textContent?.trim();
                if (text) parts.push(`\n## ${text}\n`);
            } else if (tagName === 'p') {
                const text = el.textContent?.trim();
                if (text) parts.push(`${text}\n`);
            } else if (tagName === 'li') {
                const text = el.textContent?.trim();
                if (text) parts.push(`• ${text}`);
            } else if (['ul', 'ol'].includes(tagName)) {
                parts.push(extractText(el));
            } else if (tagName === 'br') {
                parts.push('\n');
            } else if (['div', 'section', 'article'].includes(tagName)) {
                parts.push(extractText(el));
            } else {
                const text = el.textContent?.trim();
                if (text) parts.push(text);
            }
        }
    }

    return parts.join(' ');
}

function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n\s+/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^\s+|\s+$/g, '')
        .trim();
}

export function isHtmlContent(content: string): boolean {
    const trimmed = content.trim().toLowerCase();
    return trimmed.startsWith('<!doctype html') || trimmed.startsWith('<html');
}
