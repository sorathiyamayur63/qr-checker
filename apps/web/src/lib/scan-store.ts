/**
 * scan-store.ts — Browser-local scan storage using localStorage.
 *
 * Stores up to MAX_SCANS (10) scan results. When the limit is exceeded,
 * the oldest scan is evicted automatically.
 *
 * This replaces the Prisma/server DB for Phase 2, per user request.
 * All data stays entirely on the user's device.
 */

import { ScanResult } from '@qr/shared';

const STORAGE_KEY = 'qr_threat_intel_scans';
const MAX_SCANS = 10;

/** Retrieve all stored scans, newest first */
export function getAllScans(): ScanResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const scans: ScanResult[] = JSON.parse(raw);
    return scans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch {
    return [];
  }
}

/** Retrieve a single scan by its id, or null if not found */
export function getScanById(id: string): ScanResult | null {
  const scans = getAllScans();
  return scans.find(s => s.id === id) ?? null;
}

/** Save a new scan. Enforces the 10-scan cap by evicting the oldest. */
export function saveScan(scan: ScanResult): void {
  if (typeof window === 'undefined') return;
  const scans = getAllScans();

  // Replace if the same id already exists (update)
  const existing = scans.findIndex(s => s.id === scan.id);
  if (existing !== -1) {
    scans[existing] = scan;
  } else {
    scans.unshift(scan);
  }

  // Evict oldest entries beyond the cap
  while (scans.length > MAX_SCANS) {
    scans.pop();
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
}

/** Update a scan in-place by id */
export function updateScan(id: string, updater: (scan: ScanResult) => ScanResult): void {
  const scan = getScanById(id);
  if (scan) {
    saveScan(updater(scan));
  }
}

/** Delete a scan by id */
export function deleteScan(id: string): void {
  if (typeof window === 'undefined') return;
  const scans = getAllScans().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
}

/** Return how many scans remain before the cap is hit */
export function remainingSlots(): number {
  return Math.max(0, MAX_SCANS - getAllScans().length);
}
