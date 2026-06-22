import * as tls from 'node:tls';
import { CertificateInfo } from '@qr/shared';

export async function getTlsIntel(url: string): Promise<CertificateInfo> {
  return new Promise((resolve) => {
    let hostname = url;
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === 'http:') {
        return resolve({
          status: 'error',
          reason: 'Not an HTTPS URL'
        });
      }
      hostname = parsedUrl.hostname;
    } catch {
      // Treat as raw hostname
    }

    const socket = tls.connect({
      host: hostname,
      port: 443,
      servername: hostname, // SNI
      rejectUnauthorized: false // We want to inspect the cert even if invalid
    });

    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({
        status: 'error',
        reason: 'TLS Connection Timeout'
      });
    }, 5000);

    socket.on('secureConnect', () => {
      clearTimeout(timeout);
      const cert = socket.getPeerCertificate();
      
      if (!cert || !cert.subject) {
        socket.destroy();
        return resolve({
          status: 'error',
          reason: 'No peer certificate found'
        });
      }

      const validFrom = new Date(cert.valid_from).toISOString();
      const validTo = new Date(cert.valid_to).toISOString();
      
      // Calculate days until expiry
      const msUntilExpiry = new Date(cert.valid_to).getTime() - Date.now();
      const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

      // Extract subject common name or organization
      const subject = String(cert.subject?.CN || cert.subject?.O || JSON.stringify(cert.subject));
      
      // Extract issuer common name or organization
      const issuer = String(cert.issuer?.CN || cert.issuer?.O || JSON.stringify(cert.issuer));

      const signatureAlgorithm = (cert as any).sigalgs || 'Unknown';
      const isExpired = daysUntilExpiry < 0;
      const isSelfSigned = subject === issuer;
      const hostnameMismatch = !!tls.checkServerIdentity(hostname, cert);

      socket.destroy();

      resolve({
        status: 'ok',
        data: {
          issuer,
          subject,
          validFrom,
          validTo,
          daysUntilExpiry,
          signatureAlgorithm,
          isExpired,
          isSelfSigned,
          hostnameMismatch: !!hostnameMismatch
        }
      });
    });

    socket.on('error', (err) => {
      clearTimeout(timeout);
      resolve({
        status: 'error',
        reason: err.message
      });
    });
  });
}
