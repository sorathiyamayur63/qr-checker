import { getDomain } from 'tldts';
import * as whoiser_pkg from 'whoiser';
const whoiser = (whoiser_pkg as any).default || whoiser_pkg;
import { DomainIntel } from '@qr/shared';

// Cache structure
interface CacheEntry {
  data: DomainIntel;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function parseDateString(dateStr?: string | Date): string | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

export async function getDomainIntel(inputUrlOrDomain: string): Promise<DomainIntel> {
  try {
    let hostname = inputUrlOrDomain;
    try {
      if (inputUrlOrDomain.startsWith('http://') || inputUrlOrDomain.startsWith('https://')) {
        hostname = new URL(inputUrlOrDomain).hostname;
      }
    } catch {
      // Ignore URL parsing error, treat as raw domain
    }

    const rootDomain = getDomain(hostname);
    if (!rootDomain) {
      return { status: 'error', reason: 'Invalid or unsupported domain name' };
    }

    const cached = cache.get(rootDomain);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    // Perform WHOIS lookup
    // whoiser returns a promise resolving to an object of WHOIS server responses
    const rawWhois = await whoiser(rootDomain, { follow: 1 });
    
    let registrationDate: string | null = null;
    let expirationDate: string | null = null;
    let registrar: string | null = null;
    let nameservers: string[] = [];

    // Aggregate data from all whois servers
    for (const server of Object.keys(rawWhois)) {
      const data = (rawWhois as any)[server];
      if (!data) continue;

      if (!registrationDate && (data['Created Date'] || data['Creation Date'] || data['created'])) {
        registrationDate = parseDateString(data['Created Date'] || data['Creation Date'] || data['created']);
      }
      if (!expirationDate && (data['Registry Expiry Date'] || data['Expiry Date'] || data['expires'])) {
        expirationDate = parseDateString(data['Registry Expiry Date'] || data['Expiry Date'] || data['expires']);
      }
      if (!registrar && data['Registrar']) {
        registrar = data['Registrar'];
      }
      if (data['Name Server']) {
        let ns = data['Name Server'];
        if (typeof ns === 'string') {
          ns = ns.split('\n').map(s => s.trim()).filter(Boolean);
        }
        if (Array.isArray(ns)) {
           // Some WHOIS servers return nameservers in varying casing, normalize to lowercase
           nameservers = Array.from(new Set([...nameservers, ...ns.map(s => s.toLowerCase())]));
        }
      }
    }

    // Check for explicit redaction
    const rawText = JSON.stringify(rawWhois).toUpperCase();
    if (rawText.includes('REDACTED FOR PRIVACY') || rawText.includes('DATA REDACTED') || rawText.includes('GDPR MASKED')) {
      registrar = 'Redacted for Privacy';
    }

    let ageInDays: number | null = null;
    if (registrationDate) {
      const diffMs = Date.now() - new Date(registrationDate).getTime();
      ageInDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (ageInDays < 0) ageInDays = 0; // if it was registered in the future somehow
    }

    const resultData: DomainIntel = {
      status: 'ok',
      data: {
        domain: rootDomain,
        tld: rootDomain.split('.').pop() || '',
        registrationDate,
        expirationDate,
        registrar,
        nameservers,
        ageInDays
      }
    };

    cache.set(rootDomain, {
      data: resultData,
      expiresAt: Date.now() + CACHE_TTL_MS
    });

    return resultData;

  } catch (error: any) {
    return {
      status: 'error',
      reason: error.message || 'WHOIS lookup failed'
    };
  }
}
