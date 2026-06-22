import { WebsiteSignals } from '@qr/shared';
import * as cheerio from 'cheerio';
import { safeFetch } from '../lib/safeFetch';

export async function extractWebsiteIntel(url: string): Promise<WebsiteSignals> {
  try {
    const { body: html } = await safeFetch(url);
    const $ = cheerio.load(html || '');

    const title = $('title').text().trim() || null;
    const metaDescription = $('meta[name="description"]').attr('content')?.trim() || null;

    // Check for standard password fields
    const hasPasswordField = $('input[type="password"]').length > 0;

    // Check for login forms (any form containing a password field or "login" in action/id/class)
    let hasLoginForm = hasPasswordField;
    if (!hasLoginForm) {
      $('form').each((_, el) => {
        const action = $(el).attr('action') || '';
        const id = $(el).attr('id') || '';
        const cls = $(el).attr('class') || '';
        const combined = `${action} ${id} ${cls}`.toLowerCase();
        if (combined.includes('login') || combined.includes('signin')) {
          hasLoginForm = true;
        }
      });
    }

    // Check for credit card fields
    let hasCreditCardField = false;
    $('input').each((_, el) => {
      const autocomplete = $(el).attr('autocomplete')?.toLowerCase() || '';
      const name = $(el).attr('name')?.toLowerCase() || '';
      const id = $(el).attr('id')?.toLowerCase() || '';

      if (
        autocomplete.includes('cc-number') ||
        autocomplete.includes('cc-csc') ||
        name.includes('cardnumber') ||
        name.includes('ccnum') ||
        id.includes('cc-number') ||
        id.includes('card-number')
      ) {
        hasCreditCardField = true;
      }
    });

    // Detect technologies
    const technologies: { name: string; category: 'frontend' | 'cms' | 'server' }[] = [];

    // Simple WP detection
    if (
      $('meta[name="generator"]').attr('content')?.toLowerCase().includes('wordpress') ||
      html.includes('wp-content') ||
      html.includes('wp-includes')
    ) {
      technologies.push({ name: 'WordPress', category: 'cms' });
    }

    // Simple Shopify detection
    if (html.includes('Shopify.shop') || html.includes('cdn.shopify.com')) {
      technologies.push({ name: 'Shopify', category: 'cms' });
    }

    // React detection
    if ($('[data-reactroot]').length > 0 || html.includes('_reactRootContainer')) {
      technologies.push({ name: 'React', category: 'frontend' });
    }

    // Next.js detection
    if ($('#__next').length > 0 || html.includes('_next/static')) {
      technologies.push({ name: 'Next.js', category: 'frontend' });
    }

    return {
      status: 'ok',
      data: {
        title,
        metaDescription,
        hasLoginForm,
        hasPasswordField,
        hasCreditCardField,
        technologies
      }
    };
  } catch (err: any) {
    return {
      status: 'error',
      reason: err.message || 'Failed to extract website content'
    };
  }
}
