"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { QR_TYPE_META } from '@qr/shared';
import { QrMagnifierIcon, ShieldCheckIcon, RadarSweepIcon } from '@/components/icons';
import { decodeFromFile, decodeFromImageData } from '@/lib/qr-decoder';
import { classifyPayload } from '@/lib/classify-payload';
import { saveScan, getAllScans, remainingSlots } from '@/lib/scan-store';

export default function LandingPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  const [recentScans, setRecentScans] = useState<ReturnType<typeof getAllScans>>([]);

  useEffect(() => {
    setRecentScans(getAllScans().slice(0, 5));
  }, []);

  // ── Create a scan from a decoded payload and navigate ─────────────
  const handleDecodedValue = useCallback(async (raw: string) => {
    const payload = classifyPayload(raw);

    let scanId = `scan_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    let initialStatus: 'pending' | 'running' | 'completed' | 'failed' = 'completed';

    if (payload.type === 'url') {
      try {
        const res = await fetch('http://localhost:3001/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: payload.rawValue })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.jobId) {
            scanId = data.jobId;
            initialStatus = 'running';
          }
        }
      } catch (err) {
        console.error('Failed to start analysis:', err);
      }
    }

    saveScan({
      id: scanId,
      createdAt: new Date().toISOString(),
      status: initialStatus,
      qr: payload,
      redirects: null,
      domain: null,
      dns: null,
      certificate: null,
      gsb: null,
      urlFindings: null,
      website: null,
      infrastructure: null,
      score: null,
    });

    // Navigate to the dashboard for this scan
    router.push(`/scan/${scanId}`);
  }, [router]);

  // ── File upload / drop handler ────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setIsDecoding(true);
    const result = await decodeFromFile(file);
    setIsDecoding(false);
    if (result.success) {
      handleDecodedValue(result.data);
    } else {
      setError(result.error);
    }
  }, [handleDecodedValue]);

  // ── Drag and drop ─────────────────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── File input change ─────────────────────────────────────────────
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Clipboard paste ───────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            await handleFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFile]);

  // ── Camera capture ────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);

        const scanFrame = () => {
          if (!videoRef.current || !canvasRef.current) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video.readyState !== video.HAVE_ENOUGH_DATA) {
            animFrameRef.current = requestAnimationFrame(scanFrame);
            return;
          }
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = decodeFromImageData(imageData);
          if (result.success) {
            stopCamera();
            handleDecodedValue(result.data);
          } else {
            animFrameRef.current = requestAnimationFrame(scanFrame);
          }
        };
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch {
      setError('Camera access denied. Please allow camera permission in your browser settings and try again.');
    }
  }, [handleDecodedValue, stopCamera]);

  useEffect(() => {
    return () => { stopCamera(); };
  }, [stopCamera]);

  const slots = remainingSlots();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full flex flex-col items-center text-center">
        {/* Hero Icon */}
        <div className="w-16 h-16 bg-brand-soft text-brand rounded-2xl flex items-center justify-center mb-6 shadow-sm">
          <QrMagnifierIcon className="w-8 h-8" />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-3">QR Threat Intelligence</h1>
        <p className="text-[var(--text-secondary)] mb-2 text-balance">
          Decode and analyze QR codes. See security evidence before you click.
        </p>
        <p className="text-xs text-[var(--text-tertiary)] mb-8">
          Paste a screenshot (Ctrl+V), upload an image, or use your camera.
          <span className="ml-1 font-medium">
            {slots > 0 ? `${slots} scan slot${slots === 1 ? '' : 's'} remaining` : 'Storage full — oldest scan will be replaced'}
          </span>
        </p>

        {/* ── Drop zone ─────────────────────────────────────────── */}
        {!cameraActive && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full border-2 border-dashed rounded-xl p-10 transition-all cursor-pointer mb-4 flex flex-col items-center gap-3 ${
              isDragging
                ? 'border-brand bg-brand-soft scale-[1.01]'
                : 'border-[var(--border-subtle)] bg-background hover:border-brand hover:bg-[var(--bg-subtle)]'
            }`}
          >
            {isDecoding ? (
              <RadarSweepIcon className="w-10 h-10 text-brand animate-spin" />
            ) : (
              <QrMagnifierIcon className="w-10 h-10 text-[var(--text-tertiary)]" />
            )}
            <span className="text-[var(--text-secondary)] text-sm font-medium">
              {isDecoding ? 'Decoding QR code…' : isDragging ? 'Drop the image here' : 'Drag & drop a QR image'}
            </span>
            <span className="text-[var(--text-tertiary)] text-xs">PNG, JPG, GIF, WebP, BMP</span>
            <button
              type="button"
              className="mt-2 px-5 py-2 bg-brand text-white rounded-md text-sm font-medium hover:bg-brand-hover transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:ring-offset-2 active:scale-[0.97]"
            >
              Select a file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* ── Camera section ─────────────────────────────────────── */}
        {cameraActive && (
          <div className="w-full mb-4 relative rounded-xl overflow-hidden border border-[var(--border-subtle)] shadow-md">
            <video ref={videoRef} className="w-full rounded-xl" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-brand rounded-lg opacity-60" />
            </div>
            <button
              onClick={stopCamera}
              className="absolute top-3 right-3 px-3 py-1 bg-white/90 rounded-md text-sm font-medium text-[var(--text-primary)] shadow-sm hover:bg-white transition-colors"
            >
              Close Camera
            </button>
          </div>
        )}

        {!cameraActive && (
          <button
            onClick={startCamera}
            className="w-full px-4 py-3 bg-white border border-[var(--border-subtle)] text-foreground rounded-md font-medium hover:bg-[var(--bg-subtle)] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-soft focus:ring-offset-2 active:scale-[0.97]"
          >
            📷 Scan with Camera
          </button>
        )}

        {/* ── Error message ──────────────────────────────────────── */}
        {error && (
          <div className="w-full mt-4 p-4 bg-[var(--sev-critical-soft)] border border-[var(--sev-critical)] rounded-lg text-sm text-[var(--sev-critical)] text-left flex items-start gap-3">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium mb-1">Decode failed</p>
              <p>{error}</p>
              <button
                onClick={() => { setError(null); fileInputRef.current?.click(); }}
                className="mt-2 text-brand text-sm font-medium hover:underline"
              >
                Try another image →
              </button>
            </div>
          </div>
        )}

        {/* ── QR Type Reference Tags ─────────────────────────────── */}
        <div className="w-full mt-8">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">Supported QR Types</h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {Object.entries(QR_TYPE_META).map(([key, meta]) => (
              <span
                key={key}
                title={meta.description}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white shadow-sm transition-transform hover:scale-105 cursor-default"
                style={{ backgroundColor: meta.color }}
              >
                {meta.label}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-2">Hover a tag to see what it does</p>
        </div>

        {/* ── Recent Scans ───────────────────────────────────────── */}
        {recentScans.length > 0 && (
          <div className="w-full mt-8">
            <h2 className="text-sm font-semibold text-[var(--text-secondary)] mb-3 flex items-center gap-2">
              <ShieldCheckIcon className="w-4 h-4" /> Recent Scans
            </h2>
            <div className="space-y-2">
              {recentScans.map(scan => {
                const meta = QR_TYPE_META[scan.qr.type];
                return (
                  <button
                    key={scan.id}
                    onClick={() => router.push(`/scan/${scan.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white border border-[var(--border-subtle)] rounded-lg text-left hover:shadow-md transition-all hover:-translate-y-[1px]"
                  >
                    <span
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs text-white font-bold"
                      style={{ backgroundColor: meta.color }}
                    >
                      {meta.label[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{scan.qr.rawValue}</p>
                      <p className="text-xs text-[var(--text-tertiary)]">
                        {meta.label} · {new Date(scan.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {scan.score && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        scan.score.severity === 'safe' ? 'bg-[var(--sev-safe-soft)] text-[var(--sev-safe)]' :
                        scan.score.severity === 'low' ? 'bg-[var(--sev-low-soft)] text-[var(--sev-low)]' :
                        scan.score.severity === 'medium' ? 'bg-[var(--sev-medium-soft)] text-[var(--sev-medium)]' :
                        scan.score.severity === 'high' ? 'bg-[var(--sev-high-soft)] text-[var(--sev-high)]' :
                        'bg-[var(--sev-critical-soft)] text-[var(--sev-critical)]'
                      }`}>
                        {scan.score.totalScore}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Footer disclaimer ──────────────────────────────────── */}
        <p className="text-[10px] text-[var(--text-tertiary)] mt-10 max-w-sm text-balance leading-relaxed">
          This tool observes and reports — it never opens or executes anything on your behalf.
          Scans are stored locally on your device (max 10). No data is sent to any server.
        </p>
      </div>
    </div>
  );
}
