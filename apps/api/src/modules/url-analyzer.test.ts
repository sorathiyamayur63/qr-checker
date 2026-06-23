import { describe, it, expect } from 'vitest';
import { analyzeUrlSecurity } from './url-analyzer';

describe('URL Security Analysis Module', () => {
  it('should detect excessive length', async () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(80);
    const result = await analyzeUrlSecurity(longUrl);
    expect(result.length).toBeGreaterThan(75);
    expect(result.isExcessiveLength).toBe(true);
  });

  it('should detect suspicious characters like @ in authority', async () => {
    const result = await analyzeUrlSecurity('https://user:pass@example.com');
    expect(result.suspiciousChars).toContain('@');
  });

  it('should detect homographs', async () => {
    const result = await analyzeUrlSecurity('https://www.xn--ggle-5qa.com');
    expect(result.homographDetected).toBe(true);
    expect(result.punycodeDecoded).toBe('www.gögle.com');
  });

  it('should detect typosquatting of popular brands', async () => {
    const result = await analyzeUrlSecurity('https://paypa1.com');
    expect(result.typosquat).not.toBeNull();
    if (result.typosquat) {
      expect(result.typosquat.targetBrand).toBe('paypal');
      expect(result.typosquat.similarityPct).toBeGreaterThan(70);
    }
  });

  it('should return safely for normal URLs', async () => {
    const result = await analyzeUrlSecurity('https://example.com');
    expect(result.isExcessiveLength).toBe(false);
    expect(result.suspiciousChars.length).toBe(0);
    expect(result.homographDetected).toBe(false);
    expect(result.typosquat).toBeNull();
  });
});
