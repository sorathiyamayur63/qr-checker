import { GsbResult, GsbThreatMatch } from '@qr/shared';

export async function checkSafeBrowsing(url: string): Promise<GsbResult> {
  const apiKey = process.env.GSB_API_KEY;

  if (!apiKey) {
    return {
      status: 'ok',
      data: {
        safe: true,
        bypassed: true
      }
    };
  }

  try {
    const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client: {
          clientId: 'qr-threat-intel',
          clientVersion: '1.0.0'
        },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }]
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google Safe Browsing API responded with status: ${response.status}`);
    }

    const json = await response.json() as { matches?: GsbThreatMatch[] };

    if (json.matches && json.matches.length > 0) {
      return {
        status: 'ok',
        data: {
          safe: false,
          bypassed: false,
          matches: json.matches
        }
      };
    }

    return {
      status: 'ok',
      data: {
        safe: true,
        bypassed: false
      }
    };
  } catch (error: any) {
    return {
      status: 'error',
      reason: error.message || 'Unknown error during Safe Browsing check'
    };
  }
}
