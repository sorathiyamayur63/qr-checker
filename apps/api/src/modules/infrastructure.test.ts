import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getInfrastructureIntel } from './infrastructure';

describe('Infrastructure Intelligence Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully parse a Cloudflare IP', async () => {
    const mockResponse = {
      status: 'success',
      country: 'United States',
      isp: 'Cloudflare, Inc.',
      org: 'Cloudflare, Inc.',
      as: 'AS13335 Cloudflare, Inc.',
      query: '1.1.1.1'
    };

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    } as Response);

    const result = await getInfrastructureIntel('1.1.1.1');
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.ip).toBe('1.1.1.1');
      expect(result.data.asn).toBe('AS13335 Cloudflare, Inc.');
      expect(result.data.hostingProvider).toBe('Cloudflare, Inc.');
      expect(result.data.country).toBe('United States');
      expect(result.data.cloudProvider).toBe('Cloudflare');
    }
  });

  it('should return error on fetch failure', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));
    
    const result = await getInfrastructureIntel('8.8.8.8');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('Network error');
    }
  });

  it('should return error if ip-api.com returns fail status', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'fail', message: 'invalid query' })
    } as Response);

    const result = await getInfrastructureIntel('invalid-ip');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('ip-api.com lookup failed: invalid query');
    }
  });
});
