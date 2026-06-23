import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTlsIntel } from './tls';
import * as tls from 'node:tls';
import { EventEmitter } from 'node:events';

vi.mock('node:tls', () => {
  return {
    connect: vi.fn(),
    checkServerIdentity: vi.fn().mockReturnValue(undefined)
  };
});

describe('TLS/SSL Verification Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error for http URLs', async () => {
    const result = await getTlsIntel('http://example.com');
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('Not an HTTPS URL');
    }
  });

  it('should extract certificate info on successful secureConnect', async () => {
    const mockSocket = new EventEmitter() as any;
    mockSocket.destroy = vi.fn();
    mockSocket.getPeerCertificate = vi.fn().mockReturnValue({
      valid_from: 'Oct 10 23:59:59 2023 GMT',
      valid_to: 'Jan 10 23:59:59 2025 GMT',
      subject: { CN: 'example.com' },
      issuer: { O: 'Let\'s Encrypt' },
    });

    vi.mocked(tls.connect).mockReturnValue(mockSocket);

    const intelPromise = getTlsIntel('https://example.com');
    
    // Simulate connection success
    mockSocket.emit('secureConnect');

    const result = await intelPromise;

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.subject).toBe('example.com');
      expect(result.data.issuer).toBe('Let\'s Encrypt');
      expect(result.data.validFrom).toBe(new Date('Oct 10 23:59:59 2023 GMT').toISOString());
      expect(result.data.validTo).toBe(new Date('Jan 10 23:59:59 2025 GMT').toISOString());
      expect(typeof result.data.daysUntilExpiry).toBe('number');
    }
  });

  it('should handle connection errors gracefully', async () => {
    const mockSocket = new EventEmitter() as any;
    mockSocket.destroy = vi.fn();

    vi.mocked(tls.connect).mockReturnValue(mockSocket);

    const intelPromise = getTlsIntel('https://badssl.com');
    
    // Simulate error
    mockSocket.emit('error', new Error('ECONNREFUSED'));

    const result = await intelPromise;

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.reason).toBe('ECONNREFUSED');
    }
  });
});
