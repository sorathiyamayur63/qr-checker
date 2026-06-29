/**
 * classifyPayload — Inspects a raw decoded QR string and categorises it
 * into one of the expanded payload types. Parses structured fields for
 * WiFi, vCard, Event, Location, SMS, Email, and Payment payloads.
 *
 * Classification order matters: specific prefixes are checked first,
 * with 'text' as the catch-all fallback.
 */

import { QrPayload } from '@qr/shared';

export function classifyPayload(raw: string): QrPayload {
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();

  // ── URL ───────────────────────────────────────────────────────────
  if (/^https?:\/\//i.test(trimmed) || /^ftp:\/\//i.test(trimmed)) {
    return { type: 'url', rawValue: trimmed, parsed: null };
  }

  // ── WiFi ──────────────────────────────────────────────────────────
  // Format: WIFI:T:<enc>;S:<ssid>;P:<pass>;;
  if (upper.startsWith('WIFI:')) {
    const parsed: Record<string, string> = {};
    const ssidMatch = trimmed.match(/S:([^;]*)/i);
    const passMatch = trimmed.match(/P:([^;]*)/i);
    const encMatch = trimmed.match(/T:([^;]*)/i);
    const hiddenMatch = trimmed.match(/H:([^;]*)/i);
    if (ssidMatch) parsed['ssid'] = ssidMatch[1];
    if (passMatch) parsed['password'] = passMatch[1];
    if (encMatch) parsed['encryption'] = encMatch[1];
    if (hiddenMatch) parsed['hidden'] = hiddenMatch[1];
    return { type: 'wifi', rawValue: trimmed, parsed };
  }

  // ── vCard ─────────────────────────────────────────────────────────
  // Format: BEGIN:VCARD ... END:VCARD
  if (upper.startsWith('BEGIN:VCARD')) {
    const parsed: Record<string, string> = {};
    const fnMatch = trimmed.match(/FN:(.+)/im);
    const telMatch = trimmed.match(/TEL[^:]*:(.+)/im);
    const emailMatch = trimmed.match(/EMAIL[^:]*:(.+)/im);
    const orgMatch = trimmed.match(/ORG:(.+)/im);
    const titleMatch = trimmed.match(/TITLE:(.+)/im);
    const urlMatch = trimmed.match(/URL:(.+)/im);
    const adrMatch = trimmed.match(/ADR[^:]*:(.+)/im);
    if (fnMatch) parsed['name'] = fnMatch[1].trim();
    if (telMatch) parsed['phone'] = telMatch[1].trim();
    if (emailMatch) parsed['email'] = emailMatch[1].trim();
    if (orgMatch) parsed['organization'] = orgMatch[1].trim();
    if (titleMatch) parsed['title'] = titleMatch[1].trim();
    if (urlMatch) parsed['url'] = urlMatch[1].trim();
    if (adrMatch) parsed['address'] = adrMatch[1].trim().replace(/;/g, ', ');
    return { type: 'vcard', rawValue: trimmed, parsed };
  }

  // ── Calendar Event ────────────────────────────────────────────────
  // Format: BEGIN:VEVENT ... END:VEVENT
  if (upper.startsWith('BEGIN:VEVENT') || upper.startsWith('BEGIN:VCALENDAR')) {
    const parsed: Record<string, string> = {};
    const summaryMatch = trimmed.match(/SUMMARY:(.+)/im);
    const dtStartMatch = trimmed.match(/DTSTART:(.+)/im);
    const dtEndMatch = trimmed.match(/DTEND:(.+)/im);
    const locationMatch = trimmed.match(/LOCATION:(.+)/im);
    const descMatch = trimmed.match(/DESCRIPTION:(.+)/im);
    if (summaryMatch) parsed['summary'] = summaryMatch[1].trim();
    if (dtStartMatch) parsed['start'] = dtStartMatch[1].trim();
    if (dtEndMatch) parsed['end'] = dtEndMatch[1].trim();
    if (locationMatch) parsed['location'] = locationMatch[1].trim();
    if (descMatch) parsed['description'] = descMatch[1].trim();
    return { type: 'event', rawValue: trimmed, parsed };
  }

  // ── Location (geo:) ───────────────────────────────────────────────
  // Format: geo:<lat>,<long>[,<alt>]
  if (upper.startsWith('GEO:')) {
    const parsed: Record<string, string> = {};
    const coords = trimmed.substring(4).split(',');
    if (coords[0]) parsed['latitude'] = coords[0].trim();
    if (coords[1]) parsed['longitude'] = coords[1].trim();
    if (coords[2]) parsed['altitude'] = coords[2].trim();
    return { type: 'location', rawValue: trimmed, parsed };
  }

  // ── SMS ───────────────────────────────────────────────────────────
  // Format: SMSTO:<number>:<text>  or  sms:<number>?body=<text>
  if (upper.startsWith('SMSTO:') || upper.startsWith('SMS:')) {
    const parsed: Record<string, string> = {};
    if (upper.startsWith('SMSTO:')) {
      const parts = trimmed.substring(6).split(':');
      if (parts[0]) parsed['number'] = parts[0];
      if (parts[1]) parsed['message'] = parts[1];
    } else {
      const parts = trimmed.substring(4).split('?');
      if (parts[0]) parsed['number'] = parts[0];
      if (parts[1]) {
        const bodyMatch = parts[1].match(/body=(.+)/i);
        if (bodyMatch) parsed['message'] = decodeURIComponent(bodyMatch[1]);
      }
    }
    return { type: 'sms', rawValue: trimmed, parsed };
  }

  // ── Email ─────────────────────────────────────────────────────────
  // Format: mailto:<addr>  or  MATMSG:TO:<addr>;SUB:<sub>;BODY:<body>;;
  if (upper.startsWith('MAILTO:')) {
    const parsed: Record<string, string> = {};
    const mailtoUrl = trimmed.substring(7);
    const [addr, qs] = mailtoUrl.split('?');
    if (addr) parsed['to'] = addr;
    if (qs) {
      const params = new URLSearchParams(qs);
      const subject = params.get('subject');
      const body = params.get('body');
      if (subject) parsed['subject'] = subject;
      if (body) parsed['body'] = body;
    }
    return { type: 'email', rawValue: trimmed, parsed };
  }
  if (upper.startsWith('MATMSG:')) {
    const parsed: Record<string, string> = {};
    const toMatch = trimmed.match(/TO:([^;]*)/i);
    const subMatch = trimmed.match(/SUB:([^;]*)/i);
    const bodyMatch = trimmed.match(/BODY:([^;]*)/i);
    if (toMatch) parsed['to'] = toMatch[1];
    if (subMatch) parsed['subject'] = subMatch[1];
    if (bodyMatch) parsed['body'] = bodyMatch[1];
    return { type: 'email', rawValue: trimmed, parsed };
  }

  // ── Phone Call ────────────────────────────────────────────────────
  // Format: tel:<number>
  if (upper.startsWith('TEL:')) {
    return { type: 'tel', rawValue: trimmed, parsed: { number: trimmed.substring(4) } };
  }

  // ── Payment (UPI) ─────────────────────────────────────────────────
  // Format: upi://pay?pa=...&pn=...
  // Note: Full EMVCo TLV parsing is out of scope (per CLAUDE.md Phase 2)
  if (upper.startsWith('UPI://')) {
    const parsed: Record<string, string> = {};
    try {
      const url = new URL(trimmed);
      url.searchParams.forEach((val, key) => { parsed[key] = val; });
    } catch {
      // If URL parsing fails, still flag as payment-like
    }
    return { type: 'payment', rawValue: trimmed, parsed: Object.keys(parsed).length > 0 ? parsed : null };
  }

  // ── Plain Text (fallback) ─────────────────────────────────────────
  return { type: 'text', rawValue: trimmed, parsed: null };
}
