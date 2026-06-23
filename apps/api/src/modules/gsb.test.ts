import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkSafeBrowsing } from './gsb';

describe('Google Safe Browsing Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return bypassed if GSB_API_KEY is not set', async () => {
    delete process.env.GSB_API_KEY;

    const result = await checkSafeBrowsing('https://example.com');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.safe).toBe(true);
      expect(result.data.bypassed).toBe(true);
    }
  });

  it('should call fetch if GSB_API_KEY is set and return safe if no matches', async () => {
    process.env.GSB_API_KEY = 'TEST_KEY';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    } as Response);

    const result = await checkSafeBrowsing('https://example.com');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.safe).toBe(true);
      expect(result.data.bypassed).toBe(false);
      expect(result.data.matches).toBeUndefined();
    }
  });

  it('should call fetch if GSB_API_KEY is set and return unsafe if matches exist', async () => {
    process.env.GSB_API_KEY = 'TEST_KEY';

    const mockMatches = [
      {
        threatType: 'SOCIAL_ENGINEERING',
        platformType: 'ANY_PLATFORM',
        threat: { url: 'https://bad.com' }
      }
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        matches: mockMatches
      })
    } as Response);

    const result = await checkSafeBrowsing('https://bad.com');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.safe).toBe(false);
      expect(result.data.bypassed).toBe(false);
      expect(result.data.matches).toEqual(mockMatches);
    }
  });

  it('should handle API errors gracefully', async () => {
    process.env.GSB_API_KEY = 'TEST_KEY';

    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const result = await checkSafeBrowsing('https://example.com');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('Network error');
    }
  });
});
