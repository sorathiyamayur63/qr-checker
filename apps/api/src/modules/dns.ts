import { promises as dns } from 'node:dns';
import { getDomain } from 'tldts';
import { DnsResult } from '@qr/shared';

export async function getDnsIntel(inputUrlOrDomain: string): Promise<DnsResult> {
  let hostname = inputUrlOrDomain;
  try {
    if (inputUrlOrDomain.startsWith('http://') || inputUrlOrDomain.startsWith('https://')) {
      hostname = new URL(inputUrlOrDomain).hostname;
    }
  } catch {
    // Ignore URL parsing error, treat as raw domain
  }

  const rootDomain = getDomain(hostname) || hostname;

  const a: string[] = [];
  const aaaa: string[] = [];
  const mx: string[] = [];
  const txt: string[] = [];
  const ns: string[] = [];

  const safeResolve = async <T>(resolver: () => Promise<T>): Promise<T | null> => {
    try {
      return await resolver();
    } catch {
      return null;
    }
  };

  const [resA, resAaaa, resMx, resTxt, resNs, resDmarcTxt] = await Promise.all([
    safeResolve(() => dns.resolve4(hostname)),
    safeResolve(() => dns.resolve6(hostname)),
    safeResolve(() => dns.resolveMx(rootDomain)),
    safeResolve(() => dns.resolveTxt(rootDomain)),
    safeResolve(() => dns.resolveNs(rootDomain)),
    safeResolve(() => dns.resolveTxt(`_dmarc.${rootDomain}`)),
  ]);

  if (resA) a.push(...resA);
  if (resAaaa) aaaa.push(...resAaaa);
  if (resMx) {
    // Sort by priority and format as "priority exchange"
    const sortedMx = resMx.sort((a, b) => a.priority - b.priority);
    mx.push(...sortedMx.map(record => `${record.priority} ${record.exchange}`));
  }
  if (resTxt) {
    txt.push(...resTxt.map(t => t.join(' ')));
  }
  if (resNs) ns.push(...resNs);
  
  if (resDmarcTxt) {
    txt.push(...resDmarcTxt.map(t => t.join(' ')));
  }

  const missingRecordsFlag = a.length === 0 && aaaa.length === 0;
  const suspiciousHostingFlag = false; // We can check against DYNAMIC_DNS_PROVIDERS or bad subnets later if needed

  return {
    status: 'ok',
    data: {
      a,
      aaaa,
      mx,
      txt,
      ns,
      missingRecordsFlag,
      suspiciousHostingFlag,
    }
  };
}
