import { RedirectChainResult, RedirectHop, KNOWN_URL_SHORTENERS } from '@qr/shared';
import { safeFetch, SafeFetchError } from '../lib/safeFetch';

const META_REFRESH_REGEX = /<meta[^>]+http-equiv=['"]?refresh['"]?[^>]+content=['"]?\d+;\s*url=['"]?([^'"]+)['"]?[^>]*>/i;
const JS_REDIRECT_REGEX = /window\.location(?:\.href|\.replace)?\s*=\s*['"]([^'"]+)['"]/i;

export async function traceRedirects(initialUrl: string): Promise<RedirectChainResult> {
  const chain: RedirectHop[] = [];
  let currentUrl = initialUrl;
  let loopDetected = false;
  let shortenerDetected = false;
  let finalUrl = initialUrl;

  try {
    while (chain.length < 10) {
      let fetchResult;
      try {
        fetchResult = await safeFetch(currentUrl, {
          maxRedirects: 10 - chain.length,
          timeout: 8000,
        });
      } catch (err: any) {
        if (err instanceof SafeFetchError) {
          if (err.redirectChain) {
            chain.push(...err.redirectChain);
          }
          if (err.code === 'ELOOP') {
            loopDetected = true;
          }
        }
        break;
      }

      // Add the HTTP redirects that safeFetch found
      chain.push(...fetchResult.redirectChain);
      currentUrl = fetchResult.url;

      // Now check the body for meta-refresh or JS redirects
      const body = fetchResult.body;
      let nextUrlStr: string | null = null;
      let redirectMethod: 'meta-refresh' | 'javascript' | null = null;

      const metaMatch = body.match(META_REFRESH_REGEX);
      if (metaMatch && metaMatch[1]) {
        nextUrlStr = metaMatch[1];
        redirectMethod = 'meta-refresh';
      } else {
        const jsMatch = body.match(JS_REDIRECT_REGEX);
        if (jsMatch && jsMatch[1]) {
          nextUrlStr = jsMatch[1];
          redirectMethod = 'javascript';
        }
      }

      if (nextUrlStr && redirectMethod) {
        try {
          const nextUrl = new URL(nextUrlStr, currentUrl).toString();
          
          if (chain.some(hop => hop.url === nextUrl)) {
            loopDetected = true;
            break;
          }

          chain.push({
            hop: 0, // We'll re-index at the end
            url: currentUrl,
            statusCode: 200,
            method: redirectMethod,
          });
          currentUrl = nextUrl;
          continue;
        } catch {
          // Invalid URL in meta refresh / JS redirect
          break;
        }
      } else {
        // No more redirects found
        break;
      }
    }
  } catch {
    // Unexpected error, just return what we have
  }

  // Final cleanup and formatting
  finalUrl = currentUrl;
  
  if (chain.length > 0 && finalUrl !== chain[chain.length - 1].url) {
    // We landed on finalUrl
    const lastHop = chain[chain.length - 1];
    // if the last hop in chain was an HTTP redirect, it points to finalUrl
    // if we want to ensure the final URL is recorded... actually the chain records Hops (where we departed from)
  }

  // Re-index hops
  const formattedChain = chain.map((hop, i) => ({
    ...hop,
    hop: i + 1,
  }));

  // Check for shorteners in any of the visited URLs
  const allUrls = [initialUrl, ...formattedChain.map(h => h.url), finalUrl];
  for (const u of allUrls) {
    try {
      const hostname = new URL(u).hostname.replace(/^www\./, '');
      if (KNOWN_URL_SHORTENERS.includes(hostname)) {
        shortenerDetected = true;
        break;
      }
    } catch {
      // ignore parsing errors
    }
  }

  return {
    redirectCount: formattedChain.length,
    chain: formattedChain,
    finalUrl,
    loopDetected,
    shortenerDetected,
  };
}
