import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDnsIntel } from './dns';
import { promises as dns } from 'node:dns';

vi.mock('node:dns', () => {
  return {
    promises: {
      resolve4: vi.fn(),
      resolve6: vi.fn(),
      resolveMx: vi.fn(),
      resolveTxt: vi.fn(),
      resolveNs: vi.fn(),
    }
  };
});

describe('DNS Investigation Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should resolve and aggregate DNS records successfully', async () => {
    vi.mocked(dns.resolve4).mockResolvedValue(['93.184.216.34']);
    vi.mocked(dns.resolve6).mockResolvedValue(['2606:2800:220:1:248:1893:25c8:1946']);
    vi.mocked(dns.resolveMx).mockResolvedValue([{ exchange: 'mail.example.com', priority: 10 }]);
    vi.mocked(dns.resolveTxt)
      .mockResolvedValueOnce([['v=spf1 include:_spf.example.com ~all']]) // root domain
      .mockResolvedValueOnce([['v=DMARC1; p=reject;']]); // _dmarc
    vi.mocked(dns.resolveNs).mockResolvedValue(['ns1.example.com', 'ns2.example.com']);

    const result = await getDnsIntel('https://example.com/test');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.a).toEqual(['93.184.216.34']);
      expect(result.data.aaaa).toEqual(['2606:2800:220:1:248:1893:25c8:1946']);
      expect(result.data.mx).toEqual(['10 mail.example.com']);
      expect(result.data.ns).toEqual(['ns1.example.com', 'ns2.example.com']);
      expect(result.data.txt).toEqual(['v=spf1 include:_spf.example.com ~all', 'v=DMARC1; p=reject;']);
      expect(result.data.missingRecordsFlag).toBe(false);
    }
  });

  it('should handle missing records gracefully (ENODATA/ENOTFOUND)', async () => {
    // A records succeed, others fail
    vi.mocked(dns.resolve4).mockResolvedValue(['192.168.1.1']);
    vi.mocked(dns.resolve6).mockRejectedValue(new Error('ENODATA'));
    vi.mocked(dns.resolveMx).mockRejectedValue(new Error('ENOTFOUND'));
    vi.mocked(dns.resolveTxt).mockRejectedValue(new Error('ENODATA'));
    vi.mocked(dns.resolveNs).mockRejectedValue(new Error('ENOTFOUND'));

    const result = await getDnsIntel('test.com');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.a).toEqual(['192.168.1.1']);
      expect(result.data.aaaa).toEqual([]);
      expect(result.data.mx).toEqual([]);
      expect(result.data.txt).toEqual([]);
      expect(result.data.ns).toEqual([]);
      expect(result.data.missingRecordsFlag).toBe(false); // Has A record
    }
  });

  it('should set missingRecordsFlag if both A and AAAA are empty', async () => {
    vi.mocked(dns.resolve4).mockRejectedValue(new Error('ENODATA'));
    vi.mocked(dns.resolve6).mockRejectedValue(new Error('ENODATA'));
    vi.mocked(dns.resolveMx).mockRejectedValue(new Error('ENODATA'));
    vi.mocked(dns.resolveTxt).mockRejectedValue(new Error('ENODATA'));
    vi.mocked(dns.resolveNs).mockRejectedValue(new Error('ENODATA'));

    const result = await getDnsIntel('empty.com');

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.missingRecordsFlag).toBe(true);
    }
  });
});
