import { describe, it, expect } from 'vitest';
import { calculateThreatScore } from './score';
import { ScanResult } from '@qr/shared';

describe('Threat Scoring Module', () => {
  it('should return SAFE for completely benign scan', () => {
    const scan: Partial<ScanResult> = {
      gsb: { status: 'ok', data: { safe: true, bypassed: false, matches: [] } },
      urlFindings: { length: 15, isExcessiveLength: false, suspiciousChars: [], homographDetected: false, punycodeDecoded: null, typosquat: null },
      website: { status: 'ok', data: { hasLoginForm: false, hasPasswordField: false, hasCreditCardField: false, technologies: [], title: null, metaDescription: null } },
      domain: { status: 'ok', data: { domain: 'example.com', tld: 'com', registrar: 'Test', registrationDate: '2010-01-01', expirationDate: '2030-01-01', nameservers: [], ageInDays: 5000 } },
      infrastructure: { status: 'ok', data: { ip: '1.2.3.4', asn: 'AS123', hostingProvider: 'Safe ISP', cloudProvider: null, country: 'US' } },
      dns: { status: 'ok', data: { a: ['1.2.3.4'], aaaa: [], mx: [], txt: ['v=spf1 include:_spf.google.com ~all', 'v=DMARC1; p=none;'], ns: [], suspiciousHostingFlag: false, missingRecordsFlag: false } },
      redirects: { redirectCount: 1, chain: [{ hop: 1, url: 'http://example.com', statusCode: 200, method: 'http' }], finalUrl: 'http://example.com', shortenerDetected: false, loopDetected: false },
      certificate: { status: 'ok', data: { validFrom: '2020', validTo: '2030', daysUntilExpiry: 1000, isSelfSigned: false, isExpired: false, issuer: 'CA', subject: 'example.com', signatureAlgorithm: 'sha256RSA', hostnameMismatch: false } }
    };

    const result = calculateThreatScore(scan);
    expect(result.totalScore).toBe(0);
    expect(result.severity).toBe('safe');
    expect(result.indicators.length).toBe(0);
  });

  it('should return CRITICAL for GSB match', () => {
    const scan: Partial<ScanResult> = {
      gsb: { status: 'ok', data: { safe: false, bypassed: false, matches: [{ threatType: 'MALWARE', platformType: 'ANY_PLATFORM', threat: { url: 'http://example.com' } }] } }
    };

    const result = calculateThreatScore(scan);
    expect(result.totalScore).toBe(100);
    expect(result.severity).toBe('critical');
    expect(result.indicators.some(i => i.name.includes('Flagged by Google Safe Browsing as: MALWARE'))).toBe(true);
  });

  it('should accumulate score for multiple risks (Typosquat + Cloudflare + no DMARC)', () => {
    const scan: Partial<ScanResult> = {
      urlFindings: { length: 15, isExcessiveLength: false, suspiciousChars: [], homographDetected: false, punycodeDecoded: null, typosquat: { targetBrand: 'Google', similarityPct: 90 } }, // +40
      infrastructure: { status: 'ok', data: { ip: '1.2.3.4', asn: null, hostingProvider: 'Cloudflare', cloudProvider: 'Cloudflare', country: null } }, // +20
      dns: { status: 'ok', data: { a: [], aaaa: [], mx: [], txt: ['v=spf1'], ns: [], suspiciousHostingFlag: false, missingRecordsFlag: false } } // +10 (no dmarc)
    };

    const result = calculateThreatScore(scan);
    expect(result.totalScore).toBe(70);
    expect(result.severity).toBe('high');
    expect(result.indicators.some(i => i.name.includes('Domain mimics high-value target (Google)'))).toBe(true);
    expect(result.indicators.some(i => i.name.includes('Origin IP masked by Cloudflare'))).toBe(true);
    expect(result.indicators.some(i => i.name.includes('Domain lacks strict email sender authentication (SPF/DMARC)'))).toBe(true);
  });

  it('should cap at 100', () => {
    const scan: Partial<ScanResult> = {
      gsb: { status: 'ok', data: { safe: false, bypassed: false, matches: [{ threatType: 'MALWARE', platformType: 'ANY', threat: { url: 'x' } }] } }, // +100
      urlFindings: { length: 15, isExcessiveLength: false, suspiciousChars: [], homographDetected: false, punycodeDecoded: null, typosquat: { targetBrand: 'Google', similarityPct: 90 } }, // +40
    };

    const result = calculateThreatScore(scan);
    expect(result.totalScore).toBe(100);
    expect(result.severity).toBe('critical');
  });

  it('should flag login form without TLS', () => {
    const scan: Partial<ScanResult> = {
      website: { status: 'ok', data: { hasLoginForm: true, hasPasswordField: true, hasCreditCardField: false, technologies: [], title: null, metaDescription: null } },
      certificate: { status: 'ok', data: { isSelfSigned: true, issuer: '', subject: '', validFrom: '', validTo: '', daysUntilExpiry: 100, isExpired: false, signatureAlgorithm: '', hostnameMismatch: false } }
    };

    const result = calculateThreatScore(scan);
    expect(result.totalScore).toBe(50); // 30 for login without TLS, 20 for self-signed
    expect(result.severity).toBe('medium');
    expect(result.indicators.some(i => i.name.includes('Page asks for sensitive credentials without valid TLS encryption'))).toBe(true);
    expect(result.indicators.some(i => i.name.includes('TLS certificate is self-signed'))).toBe(true);
  });
});
