"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { QR_TYPE_META } from '@qr/shared';
import type { ScanResult, RedirectChainResult, DomainIntel, DnsResult, CertificateInfo, GsbResult, UrlSecurityFindings, WebsiteSignals, InfrastructureInfo, ThreatScoreBreakdown } from '@qr/shared';
import type { Socket } from 'socket.io-client';
import { Card } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity-badge';
import { RiskGauge } from '@/components/ui/risk-gauge';
import { ScanStepper, StepItem } from '@/components/ui/scan-stepper';
import { RedirectChainDiagram } from '@/components/ui/redirect-chain-diagram';
import { DataUnavailableState } from '@/components/ui/data-unavailable-state';
import {
  LinkChainIcon, GlobeLockIcon, CertificateRibbonIcon,
  FingerprintIcon, ServerStackIcon, ShieldCheckIcon, ShieldAlertIcon,
  QrMagnifierIcon
} from '@/components/icons';
import { getScanById } from '@/lib/scan-store';

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const scanId = params.id as string;

  const [result, setResult] = useState<ScanResult | null>(null);

  useEffect(() => {
    let socket: Socket;

    const stored = getScanById(scanId);
    if (stored) {
      setResult(stored);
      
      if (stored.status === 'running' || stored.status === 'pending') {
        import('socket.io-client').then(({ io }) => {
          socket = io('http://localhost:3001');
          socket.on('connect', () => {
            socket.emit('subscribe', scanId);
          });

          socket.on('module:redirects:done', (payload: { data: RedirectChainResult }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, redirects: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:redirects:error', (payload: { error: string }) => {
            console.error('Module redirects error:', payload.error);
          });

          socket.on('module:domain:done', (payload: { data: DomainIntel }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, domain: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:domain:error', (payload: { error: string }) => {
            console.error('Module domain error:', payload.error);
          });

          socket.on('module:dns:done', (payload: { data: DnsResult }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, dns: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:dns:error', (payload: { error: string }) => {
            console.error('Module dns error:', payload.error);
          });

          socket.on('module:tls:done', (payload: { data: CertificateInfo }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, tls: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:tls:error', (payload: { error: string }) => {
            console.error('Module tls error:', payload.error);
          });

          socket.on('module:gsb:done', (payload: { data: GsbResult }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, gsb: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:gsb:error', (payload: { error: string }) => {
            console.error('Module gsb error:', payload.error);
          });

          socket.on('module:url:done', (payload: { data: UrlSecurityFindings }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, urlFindings: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:url:error', (payload: { error: string }) => {
            console.error('Module url error:', payload.error);
          });

          socket.on('module:website:done', (payload: { data: WebsiteSignals }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, website: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:website:error', (payload: { error: string }) => {
            console.error('Module website error:', payload.error);
          });

          socket.on('module:infrastructure:done', (payload: { data: InfrastructureInfo }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, infrastructure: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:infrastructure:error', (payload: { error: string }) => {
            console.error('Module infrastructure error:', payload.error);
          });

          socket.on('module:score:done', (payload: { data: ThreatScoreBreakdown }) => {
            setResult(prev => {
              if (!prev) return prev;
              const next = { ...prev, score: payload.data };
              import('@/lib/scan-store').then(({ saveScan }) => saveScan(next));
              return next;
            });
          });

          socket.on('module:score:error', (payload: { error: string }) => {
            console.error('Module score error:', payload.error);
          });
        });
      }
    } else {
      router.push('/');
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [scanId, router]);

  if (!result) {
    return (
      <div className="min-h-screen bg-[var(--bg-subtle)] flex items-center justify-center">
        <div className="text-center">
          <QrMagnifierIcon className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4 animate-pulse" />
          <p className="text-[var(--text-secondary)]">Loading scan data...</p>
        </div>
      </div>
    );
  }

  const qrMeta = QR_TYPE_META[result.qr.type];

  const steps: StepItem[] = [
    { id: '2', label: 'Redirect Investigation', status: result.redirects ? 'done' : 'pending', icon: <LinkChainIcon className="w-4 h-4" /> },
    { id: '3', label: 'Domain Intelligence', status: result.domain ? 'done' : 'pending', icon: <GlobeLockIcon className="w-4 h-4" /> },
    { id: '4', label: 'DNS Investigation', status: result.dns ? 'done' : 'pending', icon: <ServerStackIcon className="w-4 h-4" /> },
    { id: '5', label: 'SSL/TLS Investigation', status: result.certificate ? 'done' : 'pending', icon: <CertificateRibbonIcon className="w-4 h-4" /> },
    { id: '6', label: 'URL Security & Typosquatting', status: result.urlFindings ? 'done' : 'pending', icon: <ShieldAlertIcon className="w-4 h-4" /> },
    { id: '8', label: 'Website & Fingerprinting', status: result.website ? 'done' : 'pending', icon: <FingerprintIcon className="w-4 h-4" /> },
    { id: '10', label: 'Infrastructure', status: result.infrastructure ? 'done' : 'pending', icon: <ServerStackIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)] p-4 sm:p-8">
      <div className="max-w-[1280px] mx-auto">

        {/* ── Header ──────────────────────────────────────────────── */}
        <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-[var(--text-tertiary)] hover:text-foreground transition-colors">
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheckIcon className="w-6 h-6 text-brand" />
              Scan Report
            </h1>
          </div>
        </header>

        {/* ── QR Payload Card ─────────────────────────────────────── */}
        <Card className="mb-6">
          <div className="flex flex-wrap items-start gap-4">
            <span
              className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: qrMeta.color }}
            >
              {qrMeta.label[0]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: qrMeta.color }}
                >
                  {qrMeta.label}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">{qrMeta.description}</span>
              </div>
              <p className="text-sm font-mono text-foreground break-all">{result.qr.rawValue}</p>
              {result.qr.parsed && (
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1">
                  {Object.entries(result.qr.parsed).map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-[var(--text-tertiary)] capitalize">{key}: </span>
                      <span className="text-foreground font-mono">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left Column: Summary & Stepper ────────────────────── */}
          <div className="col-span-1 lg:col-span-4 flex flex-col gap-6">
            <Card className="flex flex-col items-center py-8">
              <h2 className="text-lg font-semibold mb-6">Threat Score</h2>
              <RiskGauge
                score={result.score?.totalScore ?? 0}
                severity={result.score?.severity ?? 'safe'}
              />
              {result.score && result.score.indicators && result.score.indicators.length > 0 && (
                <div className="mt-6 w-full space-y-2">
                  {result.score.indicators.filter(i => i.triggered).map((ind, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">{ind.name}</span>
                      <span className="font-mono text-sev-critical">+{ind.points}</span>
                    </div>
                  ))}
                </div>
              )}
              {!result.score && (
                <p className="text-sm text-[var(--text-tertiary)] mt-4">Analyzing threat levels...</p>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-semibold mb-4">Pipeline Status</h2>
              <ScanStepper steps={steps} />
            </Card>
          </div>

          {/* ── Right Column: Detailed Modules ────────────────────── */}
          <div className="col-span-1 lg:col-span-8 flex flex-col gap-6">

            <Card>
              <h2 className="text-lg font-semibold mb-4">Redirect Investigation</h2>
              {result.redirects ? (
                <RedirectChainDiagram hops={result.redirects.chain} finalUrl={result.redirects.finalUrl} />
              ) : (
                <div className="h-24 bg-[var(--bg-muted)] animate-pulse rounded-md" />
              )}
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <h2 className="text-lg font-semibold mb-4">Domain Intelligence</h2>
                {result.domain && result.domain.status === 'ok' ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Domain</span><span className="font-mono font-medium">{result.domain.data.domain}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Registrar</span><span>{result.domain.data.registrar}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Age</span><span>{result.domain.data.ageInDays} days</span></div>
                  </div>
                ) : result.domain && result.domain.status === 'error' ? (
                  <DataUnavailableState reason="Domain information unavailable" />
                ) : (
                  <div className="h-32 bg-[var(--bg-muted)] animate-pulse rounded-md" />
                )}
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-4">SSL / TLS</h2>
                {result.certificate && result.certificate.status === 'ok' ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Issuer</span><span className="truncate max-w-[150px]">{result.certificate.data.issuer}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Valid until</span><span>{result.certificate.data.daysUntilExpiry} days</span></div>
                    <div className="flex justify-between mt-2">
                      <span className="text-[var(--text-tertiary)]">Status</span>
                      <SeverityBadge severity={result.certificate.data.isExpired ? 'critical' : 'safe'} label={result.certificate.data.isExpired ? 'Expired' : 'Valid'} />
                    </div>
                  </div>
                ) : result.certificate && result.certificate.status === 'error' ? (
                  <DataUnavailableState reason="No certificate found" />
                ) : (
                  <div className="h-32 bg-[var(--bg-muted)] animate-pulse rounded-md" />
                )}
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-4">URL Security</h2>
                {result.urlFindings ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Length</span><span>{result.urlFindings.length} chars</span></div>
                    {result.urlFindings.typosquat && (
                      <div className="flex justify-between mt-2">
                        <span className="text-[var(--text-tertiary)]">Typosquat Match</span>
                        <SeverityBadge severity="high" label={`${result.urlFindings.typosquat.targetBrand} (${result.urlFindings.typosquat.similarityPct}%)`} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-32 bg-[var(--bg-muted)] animate-pulse rounded-md" />
                )}
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-4">Website Signals</h2>
                {result.website && result.website.status === 'ok' ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Login Form</span><SeverityBadge severity={result.website.data.hasLoginForm ? 'high' : 'safe'} label={result.website.data.hasLoginForm ? 'Detected' : 'None'} /></div>
                    <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Password Field</span><SeverityBadge severity={result.website.data.hasPasswordField ? 'high' : 'safe'} label={result.website.data.hasPasswordField ? 'Detected' : 'None'} /></div>
                  </div>
                ) : result.website && result.website.status === 'error' ? (
                  <DataUnavailableState reason="Website analysis failed" />
                ) : (
                  <div className="h-32 bg-[var(--bg-muted)] animate-pulse rounded-md" />
                )}
              </Card>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
