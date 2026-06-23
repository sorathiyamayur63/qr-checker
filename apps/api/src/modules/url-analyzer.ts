import { UrlSecurityFindings } from '@qr/shared';
import { levenshteinDistance } from '../lib/levenshtein';
import * as punycode from 'node:punycode';

const HIGH_VALUE_BRANDS = [
  'google', 'paypal', 'apple', 'microsoft', 'amazon', 'facebook', 'instagram', 'linkedin', 'netflix', 'dropbox'
];

export async function analyzeUrlSecurity(urlStr: string): Promise<UrlSecurityFindings> {
  const findings: UrlSecurityFindings = {
    length: urlStr.length,
    isExcessiveLength: urlStr.length > 75,
    suspiciousChars: [],
    homographDetected: false,
    punycodeDecoded: null,
    typosquat: null
  };

  try {
    const parsed = new URL(urlStr);
    
    // Check for credential stuffing in authority (e.g. http://user:pass@example.com)
    if (parsed.username || parsed.password || urlStr.replace('://', '').split('/')[0].includes('@')) {
      findings.suspiciousChars.push('@');
    }

    // Check for multiple subdomains
    const hostnameParts = parsed.hostname.split('.');
    if (hostnameParts.length > 3) { // e.g. a.b.c.com is 4 parts
      findings.suspiciousChars.push('multiple-subdomains');
    }

    // Homograph check
    if (parsed.hostname.includes('xn--')) {
      findings.homographDetected = true;
      try {
        // Use Node's built in punycode decoder. Though marked deprecated, it works natively for now
        findings.punycodeDecoded = punycode.toUnicode(parsed.hostname);
      } catch {
        findings.punycodeDecoded = 'failed-to-decode';
      }
    }

    // Typosquat check
    // We check against the base domain name (without TLD and without subdomains)
    let baseDomain = parsed.hostname;
    // Extremely simplistic: just take the second to last part if it exists (e.g., example in www.example.com)
    if (hostnameParts.length >= 2) {
      // Very naive TLD stripping
      baseDomain = hostnameParts[hostnameParts.length - 2];
    }
    
    let bestMatch: { brand: string, similarity: number } | null = null;

    for (const brand of HIGH_VALUE_BRANDS) {
      if (brand === baseDomain) continue; // exact match, probably legitimate or subdomain spoof
      
      const distance = levenshteinDistance(baseDomain, brand);
      const maxLength = Math.max(baseDomain.length, brand.length);
      const similarityPct = Math.max(0, 100 - (distance / maxLength * 100));

      // If it's more than 70% similar but NOT exact, flag it
      if (similarityPct > 70 && similarityPct < 100) {
        if (!bestMatch || similarityPct > bestMatch.similarity) {
          bestMatch = { brand, similarity: similarityPct };
        }
      }
    }

    if (bestMatch) {
      findings.typosquat = {
        targetBrand: bestMatch.brand,
        similarityPct: bestMatch.similarity
      };
    }

  } catch (error) {
    // If it fails to parse, we return what we have (e.g. length)
  }

  return findings;
}
