import mammoth from 'mammoth';
import { marked } from 'marked';
import axios from 'axios';

export async function parseFile(buffer: Buffer, mimetype: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mimetype === 'application/pdf' || ext === 'pdf') {
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);
    return data.text;
  }

  // ── DOCX ─────────────────────────────────────────────────────────────────
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // ── Markdown ──────────────────────────────────────────────────────────────
  if (mimetype === 'text/markdown' || ext === 'md') {
    // Strip HTML tags from marked output → plain text
    const html = await marked(buffer.toString('utf-8'));
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // ── Plain text fallback ───────────────────────────────────────────────────
  return buffer.toString('utf-8');
}

export async function parseUrl(url: string): Promise<string> {
  // Notion public page export → fetch HTML → strip tags
  if (url.includes('notion.so') || url.includes('notion.site')) {
    return parseNotionUrl(url);
  }

  // Google Docs public → convert to plain text export URL
  if (url.includes('docs.google.com')) {
    return parseGoogleDocsUrl(url);
  }

  // Generic URL → fetch and strip HTML
  const { data } = await axios.get(url, {
    headers: { 'User-Agent': 'GDD-to-Issues-Bot/1.0' },
    timeout: 10000,
  });
  return stripHtml(String(data));
}

async function parseNotionUrl(url: string): Promise<string> {
  // Notion doesn't have a public plain-text API, so we fetch and strip HTML
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'text/html',
    },
    timeout: 15000,
  });
  return stripHtml(String(data));
}

async function parseGoogleDocsUrl(url: string): Promise<string> {
  // Convert sharing URL to export URL
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error('Invalid Google Docs URL');
  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
  const { data } = await axios.get(exportUrl, { timeout: 15000 });
  return String(data);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
