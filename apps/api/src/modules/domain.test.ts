import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDomainIntel } from './domain';
import * as whoiser from 'whoiser';

vi.mock('whoiser', () => ({
  default: vi.fn(),
  __esModule: true
}));

describe('Domain Intelligence Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse valid WHOIS data correctly', async () => {
    const mockWhoisData = {
      'whois.verisign-grs.com': {
        'Created Date': '1997-09-15T04:00:00Z',
        'Registry Expiry Date': '2028-09-14T04:00:00Z',
        'Registrar': 'MarkMonitor Inc.',
        'Name Server': ['ns1.google.com', 'ns2.google.com']
      }
    };
    vi.mocked((whoiser as any).default).mockResolvedValueOnce(mockWhoisData);

    const intel = await getDomainIntel('https://www.google.com/search?q=test');

    expect(intel.status).toBe('ok');
    if (intel.status === 'ok') {
      expect(intel.data.domain).toBe('google.com');
      expect(intel.data.tld).toBe('com');
      expect(intel.data.registrar).toBe('MarkMonitor Inc.');
      expect(intel.data.nameservers).toEqual(['ns1.google.com', 'ns2.google.com']);
      expect(intel.data.ageInDays).toBeGreaterThan(9000); // 1997 is very old
    }
  });

  it('should handle privacy redactions', async () => {
    const mockWhoisData = {
      'whois.some-registrar.com': {
        'Created Date': '2023-01-01T00:00:00Z',
        'Registrar': 'REDACTED FOR PRIVACY'
      }
    };
    vi.mocked((whoiser as any).default).mockResolvedValueOnce(mockWhoisData);

    const intel = await getDomainIntel('privacy-test.com');
    
    expect(intel.status).toBe('ok');
    if (intel.status === 'ok') {
      expect(intel.data.registrar).toBe('Redacted for Privacy');
    }
  });

  it('should hit the cache on subsequent lookups', async () => {
    const mockWhoisData = {
      'whois.cache-test.com': {
        'Created Date': '2023-01-01T00:00:00Z',
        'Registrar': 'Cache Registrar'
      }
    };
    vi.mocked((whoiser as any).default).mockResolvedValueOnce(mockWhoisData);

    const first = await getDomainIntel('cache-test.com');
    const second = await getDomainIntel('cache-test.com');

    expect(first).toEqual(second);
    expect((whoiser as any).default).toHaveBeenCalledTimes(1); // Second call should be cached
  });
});
