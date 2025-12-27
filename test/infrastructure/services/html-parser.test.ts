import { describe, it, expect } from 'vitest';
import { extractTextFromHtml, isHtmlContent } from '../../../src/infrastructure/services/html-parser';

describe('html-parser', () => {
    describe('isHtmlContent', () => {
        it('detects HTML doctype', () => {
            expect(isHtmlContent('<!DOCTYPE html><html>')).toBe(true);
        });

        it('detects html tag', () => {
            expect(isHtmlContent('<html lang="en">')).toBe(true);
        });

        it('returns false for plain text', () => {
            expect(isHtmlContent('Hello world')).toBe(false);
        });

        it('returns false for JSON', () => {
            expect(isHtmlContent('{"key": "value"}')).toBe(false);
        });
    });

    describe('extractTextFromHtml', () => {
        it('extracts text from simple HTML', () => {
            const html = '<html><body><p>Hello world</p></body></html>';
            const result = extractTextFromHtml(html);
            expect(result).toContain('Hello world');
        });

        it('removes script tags', () => {
            const html = '<html><body><script>alert("bad")</script><p>Content</p></body></html>';
            const result = extractTextFromHtml(html);
            expect(result).not.toContain('alert');
            expect(result).toContain('Content');
        });

        it('removes style tags', () => {
            const html = '<html><body><style>.foo{color:red}</style><p>Content</p></body></html>';
            const result = extractTextFromHtml(html);
            expect(result).not.toContain('color');
            expect(result).toContain('Content');
        });

        it('removes navigation elements', () => {
            const html = '<html><body><nav><a>Home</a></nav><main><p>Article</p></main></body></html>';
            const result = extractTextFromHtml(html);
            expect(result).not.toContain('Home');
            expect(result).toContain('Article');
        });

        it('preserves headings', () => {
            const html = '<html><body><h1>Title</h1><p>Content</p></body></html>';
            const result = extractTextFromHtml(html);
            expect(result).toContain('Title');
            expect(result).toContain('Content');
        });

        it('truncates long content', () => {
            const longContent = 'a'.repeat(10000);
            const html = `<html><body><p>${longContent}</p></body></html>`;
            const result = extractTextFromHtml(html, 100);
            expect(result.length).toBeLessThan(200);
            expect(result).toContain('[Content truncated]');
        });

        it('prioritizes article content', () => {
            const html = `
                <html><body>
                    <header>Header noise</header>
                    <article><p>Main article content</p></article>
                    <footer>Footer noise</footer>
                </body></html>
            `;
            const result = extractTextFromHtml(html);
            expect(result).toContain('Main article content');
            expect(result).not.toContain('Header noise');
        });
    });
});
