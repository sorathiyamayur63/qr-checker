import { describe, it, expect } from 'vitest';
import { safeFetch, SafeFetchError } from './safeFetch';

describe('safeFetch SSRF Protections', () => {
  it('should reject loopback address', async () => {
    await expect(safeFetch('http://127.0.0.1:80')).rejects.toThrow(SafeFetchError);
    await expect(safeFetch('http://127.0.0.1:80')).rejects.toThrow(/forbidden/);
  });

  it('should reject link-local (cloud metadata) address', async () => {
    await expect(safeFetch('http://169.254.169.254/latest/meta-data')).rejects.toThrow(SafeFetchError);
  });

  it('should reject private RFC1918 addresses', async () => {
    await expect(safeFetch('http://10.0.0.5')).rejects.toThrow(SafeFetchError);
    await expect(safeFetch('http://192.168.1.100')).rejects.toThrow(SafeFetchError);
    await expect(safeFetch('http://172.16.0.1')).rejects.toThrow(SafeFetchError);
  });

  // Note: We mock or rely on external testing for mid-chain private IP redirects.
  // In a real isolated environment we'd spin up an express server that redirects to 127.0.0.1.
});
