import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { traceRedirects } from './modules/redirects';
import { getDomainIntel } from './modules/domain';
import { getDnsIntel } from './modules/dns';
import { getTlsIntel } from './modules/tls';
import { checkSafeBrowsing } from './modules/gsb';
import { analyzeUrlSecurity } from './modules/url-analyzer';
import { extractWebsiteIntel } from './modules/website';
import { getInfrastructureIntel } from './modules/infrastructure';
import { calculateThreatScore } from './modules/score';
import { ScanResult } from '@qr/shared';

const app = express();
const port = process.env.PORT || 3001;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/analyze', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  
  res.json({ jobId });

  // Start asynchronous analysis
  (async () => {
    let finalUrl = url;
    const scan: Partial<ScanResult> = {};

    try {
      io.to(jobId).emit('module:redirects:start', { timestamp: new Date().toISOString() });
      scan.redirects = await traceRedirects(url);
      finalUrl = scan.redirects.finalUrl || url;
      io.to(jobId).emit('module:redirects:done', { data: scan.redirects });
    } catch (err: any) {
      console.error(`Error analyzing redirects for ${url}:`, err);
      io.to(jobId).emit('module:redirects:error', { error: err.message });
    }

    try {
      io.to(jobId).emit('module:domain:start', { timestamp: new Date().toISOString() });
      scan.domain = await getDomainIntel(finalUrl);
      io.to(jobId).emit('module:domain:done', { data: scan.domain });
    } catch (err: any) {
      console.error(`Error analyzing domain for ${finalUrl}:`, err);
      io.to(jobId).emit('module:domain:error', { error: err.message });
    }

    try {
      io.to(jobId).emit('module:dns:start', { timestamp: new Date().toISOString() });
      scan.dns = await getDnsIntel(finalUrl);
      io.to(jobId).emit('module:dns:done', { data: scan.dns });
    } catch (err: any) {
      console.error(`Error analyzing DNS for ${finalUrl}:`, err);
      io.to(jobId).emit('module:dns:error', { error: err.message });
    }

    try {
      io.to(jobId).emit('module:tls:start', { timestamp: new Date().toISOString() });
      scan.certificate = await getTlsIntel(finalUrl);
      io.to(jobId).emit('module:tls:done', { data: scan.certificate });
    } catch (err: any) {
      console.error(`Error analyzing TLS for ${finalUrl}:`, err);
      io.to(jobId).emit('module:tls:error', { error: err.message });
    }

    try {
      io.to(jobId).emit('module:gsb:start', { timestamp: new Date().toISOString() });
      scan.gsb = await checkSafeBrowsing(finalUrl);
      io.to(jobId).emit('module:gsb:done', { data: scan.gsb });
    } catch (err: any) {
      console.error(`Error analyzing Safe Browsing for ${finalUrl}:`, err);
      io.to(jobId).emit('module:gsb:error', { error: err.message });
    }

    try {
      io.to(jobId).emit('module:url:start', { timestamp: new Date().toISOString() });
      scan.urlFindings = await analyzeUrlSecurity(finalUrl);
      io.to(jobId).emit('module:url:done', { data: scan.urlFindings });
    } catch (err: any) {
      console.error(`Error analyzing URL for ${finalUrl}:`, err);
      io.to(jobId).emit('module:url:error', { error: err.message });
    }

    try {
      io.to(jobId).emit('module:website:start', { timestamp: new Date().toISOString() });
      scan.website = await extractWebsiteIntel(finalUrl);
      io.to(jobId).emit('module:website:done', { data: scan.website });
    } catch (err: any) {
      console.error(`Error extracting website content for ${finalUrl}:`, err);
      io.to(jobId).emit('module:website:error', { error: err.message });
    }

    try {
      io.to(jobId).emit('module:infrastructure:start', { timestamp: new Date().toISOString() });
      let ipAddress: string | null = null;

      if (scan.dns && scan.dns.status === 'ok' && scan.dns.data.a && scan.dns.data.a.length > 0) {
        ipAddress = scan.dns.data.a[0];
      }

      if (ipAddress) {
        scan.infrastructure = await getInfrastructureIntel(ipAddress);
        io.to(jobId).emit('module:infrastructure:done', { data: scan.infrastructure });
      } else {
        scan.infrastructure = { status: 'error', reason: 'No IP address found from DNS records' };
        io.to(jobId).emit('module:infrastructure:done', { data: scan.infrastructure });
      }
    } catch (err: any) {
      console.error(`Error analyzing infrastructure for ${finalUrl}:`, err);
      io.to(jobId).emit('module:infrastructure:error', { error: err.message });
    }

    try {
      const score = calculateThreatScore(scan);
      io.to(jobId).emit('module:score:done', { data: score });
    } catch (err: any) {
      console.error(`Error calculating threat score for ${finalUrl}:`, err);
      io.to(jobId).emit('module:score:error', { error: err.message });
    }
  })();
});

io.on('connection', (socket) => {
  socket.on('subscribe', (jobId) => {
    socket.join(jobId);
  });
});

httpServer.listen(port, () => {
  console.log(`API running on port ${port}`);
});
