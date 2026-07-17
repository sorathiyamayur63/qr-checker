# QR Threat Intel

A real-time, streaming intelligence pipeline for analyzing and scoring malicious QR codes.

## Overview

This monorepo contains a full-stack Next.js and Express application designed to ingest scanned URLs, unravel their redirect chains, and aggressively profile their infrastructure. As QR codes increasingly bypass traditional email-filtering pipelines, this tool provides instant threat analytics to analysts.

## Architecture

The project leverages a modern web stack:/-

- **Monorepo:** Turborepo managing `@qr/api`, `@qr/web`, and `@qr/shared` packages.
- **Frontend:** Next.js 14 (App Router) using React Server Components, TailwindCSS, and Radix UI primitives.
- **Backend:** Express.js REST API feeding into a Socket.IO real-time event pipeline.
- **Data Exchange:** A shared typescript library for strict data schema definitions across the mono-repo.

### Analysis Pipeline--

Upon submission, the server initiates an asynchronous intelligence pipeline. Rather than forcing the client to await a massive monolithic HTTP response, the API leverages **Socket.IO** to continuously emit findings from 10 distinct modules to the Next.js frontend as they conclude:

1. **Redirect Tracing:** Unrolls any URL shorteners (e.g. `bit.ly`) or tracking chains to find the true destination URL.
2. **Domain Intelligence:** Performs WHOIS lookups to discover domain age, expiration, and registrar. Domains under 30 days old are flagged.
3. **DNS Records:** Ingests `A`, `AAAA`, `MX`, `TXT`, and `NS` records. Automatically detects missing DMARC configs.
4. **TLS/SSL Certificates:** Verifies certificate validity, checks for self-signed issuance, and extracts issuer organizations (e.g. Let's Encrypt).
5. **Google Safe Browsing:** Cross-references the destination URL against Google's live Threat Intelligence API.
6. **URL Security:** Checks string heuristics like excessive path length, homograph characters, and calculates brand typosquatting (Levenshtein distance matching).
7. **Website Fingerprinting:** Downloads the HTML safely to detect login forms, password inputs, and fingerprint underlying frameworks (React, WordPress, etc.).
8. **Infrastructure OSINT:** Geolocates the origin IP, checks the ASN, and flags hosting providers commonly utilized by threat actors.
9. **Final Scoring Heuristic:** A custom threat-scoring engine aggregates all signals into a weighted Critical/High/Medium/Low/Safe `ThreatScoreBreakdown` to aid analyst triage.

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Local Installation

1. Install dependencies:
```bash
pnpm install
```

2. Environment Variables:
Create `.env` inside `apps/api/` with your Google Safe Browsing API key (Optional):
```
GOOGLE_SAFE_BROWSING_API_KEY=your-api-key
PORT=3001
```

3. Start Development Servers:
```bash
pnpm run dev
```
This automatically boots the Express server on `:3001` and Next.js frontend on `:3000`.

4. Navigate to [http://localhost:3000](http://localhost:3000) to submit a QR Code.

### Building for Production

To build all apps and packages:-()
```bash
pnpm run build
```

start the production instances:
```bash
pnpm run start
```
