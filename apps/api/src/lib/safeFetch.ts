import dns from 'node:dns';
import { request, Dispatcher } from 'undici';
import ipaddr from 'ipaddr.js';

export class SafeFetchError extends Error {
  public redirectChain: { hop: number; url: string; statusCode: number; method: 'http' }[];
  constructor(
    message: string,
    public code?: string,
    redirectChain: { hop: number; url: string; statusCode: number; method: 'http' }[] = []
  ) {
    super(message);
    this.name = 'SafeFetchError';
    this.redirectChain = redirectChain;
  }
}

const FORBIDDEN_IPV4_RANGES = [
  '127.0.0.0/8',      // Loopback
  '10.0.0.0/8',       // RFC1918
  '172.16.0.0/12',    // RFC1918
  '192.168.0.0/16',   // RFC1918
  '169.254.0.0/16',   // Link-local (Cloud metadata)
  '0.0.0.0/8',        // Current network
];

const FORBIDDEN_IPV6_RANGES = [
  '::1/128',          // Loopback
  'fc00::/7',         // Unique local
  'fe80::/10',        // Link-local
];

function isIpForbidden(ipStr: string): boolean {
  let ip: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    ip = ipaddr.parse(ipStr);
  } catch {
    return false; // Not a valid IP string? Fall back
  }

  if (ip.kind() === 'ipv4') {
    const ipv4 = ip as ipaddr.IPv4;
    return FORBIDDEN_IPV4_RANGES.some(range => {
      return ipv4.match(ipaddr.parseCIDR(range) as [ipaddr.IPv4, number]);
    });
  } else {
    const ipv6 = ip as ipaddr.IPv6;
    if (ipv6.isIPv4MappedAddress()) {
      const ipv4 = ipv6.toIPv4Address();
      return FORBIDDEN_IPV4_RANGES.some(range => {
        return ipv4.match(ipaddr.parseCIDR(range) as [ipaddr.IPv4, number]);
      });
    }
    return FORBIDDEN_IPV6_RANGES.some(range => {
      return ipv6.match(ipaddr.parseCIDR(range) as [ipaddr.IPv6, number]);
    });
  }
}

async function resolveAndValidate(hostname: string): Promise<void> {
  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true });
  } catch (err: any) {
    throw new SafeFetchError(`DNS lookup failed for ${hostname}: ${err.message}`, 'ENOTFOUND');
  }

  for (const record of addresses) {
    if (isIpForbidden(record.address)) {
      throw new SafeFetchError(`Access to resolved IP ${record.address} is forbidden.`, 'EFORBIDDENIP');
    }
  }
}

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  maxRedirects?: number;
  timeout?: number;
  maxResponseSize?: number;
}

export interface SafeFetchResponse {
  url: string;
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  redirectChain: { hop: number; url: string; statusCode: number; method: 'http' }[];
}

export async function safeFetch(
  targetUrl: string,
  opts: SafeFetchOptions = {}
): Promise<SafeFetchResponse> {
  const maxRedirects = opts.maxRedirects ?? 10;
  const timeoutMs = opts.timeout ?? 8000;
  const maxResponseSize = opts.maxResponseSize ?? 2 * 1024 * 1024; // 2MB

  let currentUrl = targetUrl;
  let redirectsCount = 0;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);
  const redirectChain: { hop: number; url: string; statusCode: number; method: 'http' }[] = [];

  try {
    while (true) {
      if (redirectsCount > maxRedirects) {
        throw new SafeFetchError('Too many redirects', 'EMAXREDIRECTS');
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(currentUrl);
      } catch {
        throw new SafeFetchError(`Invalid URL: ${currentUrl}`, 'EINVALIDURL');
      }

      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new SafeFetchError(`Unsupported protocol: ${parsedUrl.protocol}`, 'EPROTOCOL');
      }

      await resolveAndValidate(parsedUrl.hostname);

      const requestOptions: any = {
        method: opts.method || 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...opts.headers,
        },
        signal: abortController.signal as any,
      };

      if (opts.body && requestOptions.method !== 'GET' && requestOptions.method !== 'HEAD') {
        requestOptions.body = opts.body;
      }

      const res = await request(currentUrl, requestOptions);

      const headersRecord: Record<string, string> = {};
      for (const [key, value] of Object.entries(res.headers)) {
          if(Array.isArray(value)) {
              headersRecord[key as string] = value.join(', ');
          } else if (value) {
              headersRecord[key as string] = value as string;
          }
      }

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        await res.body.text();
        redirectChain.push({ hop: 0, url: currentUrl, statusCode: res.statusCode, method: 'http' });
        
        const location = Array.isArray(res.headers.location) ? res.headers.location[0] : res.headers.location;
        const nextUrl = new URL(location, currentUrl).toString();
        
        if (redirectChain.some(hop => hop.url === nextUrl)) {
          // Loop detected!
          throw new SafeFetchError('Redirect loop detected', 'ELOOP', redirectChain);
        }
        
        currentUrl = nextUrl;
        redirectsCount++;
        continue;
      }

      let bodyString = '';
      let bytesRead = 0;

      for await (const chunk of res.body) {
        bytesRead += chunk.length;
        if (bytesRead > maxResponseSize) {
            abortController.abort();
            throw new SafeFetchError('Response too large', 'ETOOLARGE');
        }
        bodyString += chunk.toString();
      }

      return {
        url: currentUrl,
        statusCode: res.statusCode,
        headers: headersRecord,
        body: bodyString,
        redirectChain,
      };
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new SafeFetchError('Request timed out', 'ETIMEDOUT');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
