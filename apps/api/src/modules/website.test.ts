import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractWebsiteIntel } from './website';
import * as safeFetchModule from '../lib/safeFetch';

describe('Website Intelligence Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should extract title and description', async () => {
    const html = `
      <html>
        <head>
          <title>Test Page</title>
          <meta name="description" content="This is a test description.">
        </head>
        <body></body>
      </html>
    `;
    
    vi.spyOn(safeFetchModule, 'safeFetch').mockResolvedValueOnce({
      body: html
    } as any);

    const result = await extractWebsiteIntel('http://example.com');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.title).toBe('Test Page');
      expect(result.data.metaDescription).toBe('This is a test description.');
    }
  });

  it('should detect password fields and forms', async () => {
    const html = `
      <html>
        <body>
          <form action="/login">
            <input type="password" name="pwd">
          </form>
        </body>
      </html>
    `;

    vi.spyOn(safeFetchModule, 'safeFetch').mockResolvedValueOnce({
      body: html
    } as any);

    const result = await extractWebsiteIntel('http://example.com');
    if (result.status === 'ok') {
      expect(result.data.hasPasswordField).toBe(true);
      expect(result.data.hasLoginForm).toBe(true);
    }
  });

  it('should detect WordPress', async () => {
    const html = `
      <html>
        <head>
          <meta name="generator" content="WordPress 6.0">
        </head>
        <body>
          <link rel="stylesheet" href="/wp-content/themes/test/style.css">
        </body>
      </html>
    `;

    vi.spyOn(safeFetchModule, 'safeFetch').mockResolvedValueOnce({
      body: html
    } as any);

    const result = await extractWebsiteIntel('http://example.com');
    if (result.status === 'ok') {
      expect(result.data.technologies).toContainEqual({ name: 'WordPress', category: 'cms' });
    }
  });

  it('should return error if safeFetch fails', async () => {
    vi.spyOn(safeFetchModule, 'safeFetch').mockRejectedValueOnce(new Error('Network error'));
    
    const result = await extractWebsiteIntel('http://example.com');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('Network error');
    }
  });
});
