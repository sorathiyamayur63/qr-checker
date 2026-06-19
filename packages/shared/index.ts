// Zod schemas would go here for validation
// For Phase 1, we focus on the TS interfaces and Mock Data

export * from './lists';
export type LookupResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'error'; reason: string }
  | { status: 'timeout' }
  | { status: 'not_yet_analyzed' };

export type QrPayloadType =
  | 'url' | 'text' | 'email' | 'tel' | 'wifi' | 'payment'
  | 'location' | 'vcard' | 'sms' | 'event';

export type QrPayload = {
  type: QrPayloadType;
  rawValue: string;
  parsed: Record<string, string> | null;
};

/** Human-readable metadata for each QR payload type — used in tags and cards */
export const QR_TYPE_META: Record<QrPayloadType, { label: string; description: string; color: string }> = {
  url:      { label: 'URL',      description: 'Links to any webpage',                     color: '#2563EB' },
  text:     { label: 'Text',     description: 'Plain text message',                       color: '#64748B' },
  location: { label: 'Location', description: 'GPS coordinates (Google Maps)',             color: '#0D9488' },
  wifi:     { label: 'WiFi',     description: 'Auto-connects to a wireless network',      color: '#8B5CF6' },
  vcard:    { label: 'vCard',    description: 'Digital business card (contact info)',      color: '#EC4899' },
  sms:      { label: 'SMS',      description: 'Opens SMS composer on smartphone',         color: '#F59E0B' },
  tel:      { label: 'Call',     description: 'Starts a phone call directly',             color: '#10B981' },
  event:    { label: 'Event',    description: 'Adds a calendar event',                    color: '#F97316' },
  email:    { label: 'Mail',     description: 'Opens an email draft to a recipient',      color: '#DC2626' },
  payment:  { label: 'Payment',  description: 'Digital payment / UPI transaction',        color: '#6366F1' },
};

export type RedirectHop = { hop: number; url: string; statusCode: number | null; method: 'http' | 'meta-refresh' | 'javascript' };

export type RedirectChainResult = {
  redirectCount: number;
  chain: RedirectHop[];
  finalUrl: string;
  loopDetected: boolean;
  shortenerDetected: boolean;
};

export type DomainIntel = LookupResult<{
  domain: string;
  tld: string;
  registrationDate: string | null;
  expirationDate: string | null;
  registrar: string | null;
  nameservers: string[];
  ageInDays: number | null;
}>;

export type DnsResult = LookupResult<{
  a: string[];
  aaaa: string[];
  mx: string[];
  txt: string[];
  ns: string[];
  suspiciousHostingFlag: boolean;
  missingRecordsFlag: boolean;
}>;

export type CertificateInfo = LookupResult<{
  issuer: string;
  subject: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  signatureAlgorithm: string;
  isExpired: boolean;
  isSelfSigned: boolean;
  hostnameMismatch: boolean;
}>;

export type GsbThreatMatch = {
  threatType: string;
  platformType: string;
  threat: { url: string };
};

export type GsbResult = LookupResult<{
  safe: boolean;
  bypassed: boolean;
  matches?: GsbThreatMatch[];
}>;

export type UrlSecurityFindings = {
  length: number;
  isExcessiveLength: boolean;
  suspiciousChars: string[];
  homographDetected: boolean;
  punycodeDecoded: string | null;
  typosquat: { targetBrand: string; similarityPct: number } | null;
};

export type WebsiteSignals = LookupResult<{
  title: string | null;
  metaDescription: string | null;
  hasLoginForm: boolean;
  hasPasswordField: boolean;
  hasCreditCardField: boolean;
  technologies: { name: string; category: 'frontend' | 'cms' | 'server' }[];
}>;

export type InfrastructureInfo = LookupResult<{
  ip: string;
  asn: string | null;
  hostingProvider: string | null;
  cloudProvider: string | null;
  country: string | null;
}>;

export type ThreatScoreBreakdown = {
  indicators: { name: string; triggered: boolean; points: number }[];
  totalScore: number;
  severity: 'safe' | 'low' | 'medium' | 'high' | 'critical';
};

export type ScanResult = {
  id: string;
  createdAt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  qr: QrPayload;
  redirects: RedirectChainResult | null;
  domain: DomainIntel | null;
  dns: DnsResult | null;
  certificate: CertificateInfo | null;
  gsb: GsbResult | null;
  urlFindings: UrlSecurityFindings | null;
  website: WebsiteSignals | null;
  infrastructure: InfrastructureInfo | null;
  score: ThreatScoreBreakdown | null;
};

export const MOCK_SCAN_RESULT: ScanResult = {
  id: 'scan_123',
  createdAt: new Date().toISOString(),
  status: 'completed',
  qr: {
    type: 'url',
    rawValue: 'http://bit.ly/3xyz',
    parsed: null,
  },
  redirects: {
    redirectCount: 2,
    chain: [
      { hop: 1, url: 'http://bit.ly/3xyz', statusCode: 301, method: 'http' },
      { hop: 2, url: 'https://login-paypa1.com/secure', statusCode: 200, method: 'http' },
    ],
    finalUrl: 'https://login-paypa1.com/secure',
    loopDetected: false,
    shortenerDetected: true,
  },
  domain: {
    status: 'ok',
    data: {
      domain: 'login-paypa1.com',
      tld: 'com',
      registrationDate: '2023-10-01T00:00:00Z',
      expirationDate: '2024-10-01T00:00:00Z',
      registrar: 'Namecheap, Inc.',
      nameservers: ['dns1.registrar-servers.com'],
      ageInDays: 5,
    },
  },
  dns: {
    status: 'ok',
    data: {
      a: ['192.168.1.100'],
      aaaa: [],
      mx: [],
      txt: [],
      ns: ['dns1.registrar-servers.com'],
      suspiciousHostingFlag: true,
      missingRecordsFlag: false,
    },
  },
  certificate: {
    status: 'ok',
    data: {
      issuer: 'Let\'s Encrypt',
      subject: 'login-paypa1.com',
      validFrom: '2023-10-02T00:00:00Z',
      validTo: '2024-01-02T00:00:00Z',
      daysUntilExpiry: 85,
      signatureAlgorithm: 'sha256WithRSAEncryption',
      isExpired: false,
      isSelfSigned: false,
      hostnameMismatch: false,
    }
  },
  gsb: {
    status: 'ok',
    data: {
      safe: false,
      bypassed: false,
      matches: [
        {
          threatType: 'SOCIAL_ENGINEERING',
          platformType: 'ANY_PLATFORM',
          threat: { url: 'https://login-paypa1.com/secure' }
        }
      ]
    }
  },
  urlFindings: {
    length: 31,
    isExcessiveLength: false,
    suspiciousChars: [],
    homographDetected: false,
    punycodeDecoded: null,
    typosquat: { targetBrand: 'paypal', similarityPct: 85 },
  },
  website: {
    status: 'ok',
    data: {
      title: 'Log in to your account',
      metaDescription: 'Secure login portal',
      hasLoginForm: true,
      hasPasswordField: true,
      hasCreditCardField: false,
      technologies: [
        { name: 'React', category: 'frontend' },
      ],
    },
  },
  infrastructure: {
    status: 'ok',
    data: {
      ip: '192.168.1.100',
      asn: 'AS12345',
      hostingProvider: 'SuspiciousHost LLC',
      cloudProvider: null,
      country: 'RU',
    },
  },
  score: {
    totalScore: 75,
    severity: 'high',
    indicators: [
      { name: 'Domain age < 7 days', triggered: true, points: 30 },
      { name: 'URL shortener detected in chain', triggered: true, points: 10 },
      { name: 'Typosquatting match (similarity >= 85%)', triggered: true, points: 40 },
      { name: 'Login form present', triggered: true, points: 20 },
    ],
  },
};

