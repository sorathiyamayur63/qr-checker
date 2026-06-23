import { ScanResult, ThreatScoreBreakdown } from '@qr/shared';

export function calculateThreatScore(scan: Partial<ScanResult>): ThreatScoreBreakdown {
  let totalScore = 0;
  const indicators: { name: string; triggered: boolean; points: number }[] = [];

  // Google Safe Browsing
  if (scan.gsb?.status === 'ok' && !scan.gsb.data.safe) {
    totalScore += 100;
    const threats = scan.gsb.data.matches?.map(m => m.threatType).join(', ') || 'Unknown';
    indicators.push({ name: `Flagged by Google Safe Browsing as: ${threats}`, triggered: true, points: 100 });
  }

  // URL Lexical Security (Typosquatting & Homograph)
  if (scan.urlFindings) {
    const urlData = scan.urlFindings;
    if (urlData.typosquat) {
      totalScore += 40;
      indicators.push({ name: `Domain mimics high-value target (${urlData.typosquat.targetBrand})`, triggered: true, points: 40 });
    }
    if (urlData.homographDetected) {
      totalScore += 40;
      indicators.push({ name: 'Domain uses Punycode (Homograph attack possible)', triggered: true, points: 40 });
    }
    if (urlData.isExcessiveLength) {
      totalScore += 10;
      indicators.push({ name: 'URL is unusually long (potential path obfuscation)', triggered: true, points: 10 });
    }
  }

  // Website & Content Analysis
  if (scan.website?.status === 'ok') {
    const webData = scan.website.data;
    if (webData.hasLoginForm || webData.hasPasswordField || webData.hasCreditCardField) {
      // Check if TLS is missing or self-signed
      let tlsMissingOrBad = true;
      if (scan.certificate?.status === 'ok') {
        const tlsData = scan.certificate.data;
        tlsMissingOrBad = !tlsData || tlsData.isSelfSigned || tlsData.isExpired;
      }
      
      if (tlsMissingOrBad) {
        totalScore += 30;
        indicators.push({ name: 'Page asks for sensitive credentials without valid TLS encryption', triggered: true, points: 30 });
      }
    }
  }

  // Domain Age
  if (scan.domain?.status === 'ok') {
    const domainData = scan.domain.data;
    if (domainData.ageInDays !== null && domainData.ageInDays < 30) {
      totalScore += 25;
      indicators.push({ name: `Domain registered recently (${domainData.ageInDays} days ago)`, triggered: true, points: 25 });
    }
  }

  // Infrastructure Intelligence
  if (scan.infrastructure?.status === 'ok') {
    const infraData = scan.infrastructure.data;
    const provider = infraData.cloudProvider?.toLowerCase() || infraData.hostingProvider?.toLowerCase() || '';
    
    // Cloudflare is heavily used by phishing to mask origin
    if (provider.includes('cloudflare')) {
      totalScore += 20;
      indicators.push({ name: 'Origin IP masked by Cloudflare', triggered: true, points: 20 });
    }
    
    // High-abuse free or cheap hosts (just heuristics)
    const highAbuse = ['hostinger', 'namecheap', 'digitalocean', 'freenom'];
    if (highAbuse.some(h => provider.includes(h))) {
      totalScore += 15;
      indicators.push({ name: `Hosted on network with elevated abuse rates (${infraData.hostingProvider || infraData.cloudProvider})`, triggered: true, points: 15 });
    }
  }

  // DNS Intelligence (SPF / DMARC)
  if (scan.dns?.status === 'ok') {
    const dnsData = scan.dns.data;
    const spfEnabled = dnsData.txt.some(r => r.includes('v=spf1'));
    const dmarcEnabled = dnsData.txt.some(r => r.includes('v=DMARC1'));
    if (!spfEnabled || !dmarcEnabled) {
      totalScore += 10;
      indicators.push({ name: 'Domain lacks strict email sender authentication (SPF/DMARC)', triggered: true, points: 10 });
    }
  }

  // Redirect Chains
  if (scan.redirects) {
    const redirData = scan.redirects;
    if (redirData.chain.length > 3 || redirData.shortenerDetected) {
      totalScore += 15;
      indicators.push({ name: 'Excessive redirects or URL shortener used (evasion tactic)', triggered: true, points: 15 });
    }
  }

  // TLS Expiration
  if (scan.certificate?.status === 'ok') {
    const tlsData = scan.certificate.data;
    if (tlsData.daysUntilExpiry !== null && tlsData.daysUntilExpiry < 30) {
      totalScore += 10;
      indicators.push({ name: `TLS certificate expires soon (${tlsData.daysUntilExpiry} days)`, triggered: true, points: 10 });
    }
    if (tlsData.isSelfSigned) {
      totalScore += 20;
      indicators.push({ name: 'TLS certificate is self-signed', triggered: true, points: 20 });
    }
  }

  // Cap at 100
  totalScore = Math.min(totalScore, 100);

  let severity: 'safe' | 'low' | 'medium' | 'high' | 'critical' = 'safe';
  if (totalScore >= 90) severity = 'critical';
  else if (totalScore >= 70) severity = 'high';
  else if (totalScore >= 40) severity = 'medium';
  else if (totalScore >= 16) severity = 'low';

  return {
    totalScore,
    severity,
    indicators
  };
}
