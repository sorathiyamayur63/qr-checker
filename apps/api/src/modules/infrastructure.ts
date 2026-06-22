import { InfrastructureInfo } from '@qr/shared';

const CLOUD_PROVIDERS = [
  'cloudflare',
  'amazon',
  'aws',
  'google',
  'gcp',
  'azure',
  'microsoft',
  'digitalocean',
  'hostinger',
  'namecheap',
  'linode',
  'akamai',
  'fastly'
];

export async function getInfrastructureIntel(ip: string): Promise<InfrastructureInfo> {
  try {
    // ip-api.com limits free tier to 45 requests per minute, which is plenty for our use case.
    const url = `http://ip-api.com/json/${ip}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`ip-api.com returned status ${response.status}`);
    }

    const data = await response.json();

    if (data.status !== 'success') {
      throw new Error(`ip-api.com lookup failed: ${data.message || 'unknown error'}`);
    }

    const asn = data.as || null;
    const hostingProvider = data.isp || data.org || null;
    const country = data.country || null;

    let cloudProvider: string | null = null;
    
    // Parse cloud provider heuristically
    const combinedStr = `${asn || ''} ${hostingProvider || ''}`.toLowerCase();
    for (const provider of CLOUD_PROVIDERS) {
      if (combinedStr.includes(provider)) {
        // Capitalize first letter or use proper names
        cloudProvider = provider.charAt(0).toUpperCase() + provider.slice(1);
        if (cloudProvider === 'Aws') cloudProvider = 'AWS';
        if (cloudProvider === 'Gcp') cloudProvider = 'GCP';
        break;
      }
    }

    return {
      status: 'ok',
      data: {
        ip,
        asn,
        hostingProvider,
        cloudProvider,
        country
      }
    };
  } catch (err: any) {
    return {
      status: 'error',
      reason: err.message || 'Infrastructure lookup failed'
    };
  }
}
