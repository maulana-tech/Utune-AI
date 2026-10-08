/**
 * Turns a template's plain-text body into a designed HTML email, styled after the
 * Using site (site-using.vercel.app): cream page, serif headline with an italic
 * accent, mono uppercase labels, orange square-cornered CTA, numbered rows.
 *
 * Markup, one block per line, everything else is a paragraph:
 *   ::Label                 small mono eyebrow ("■ LABEL")
 *   # Headline _italic_     serif headline; _words_ render in italic
 *   - item                  numbered row (01, 02, …)
 *   [Button text](https://…) orange call-to-action button
 *   ---                     thin divider
 * Blank lines separate paragraphs. Pure functions, no DOM: used by the mailer at
 * send time and by the web preview, so both render identically.
 *
 * Email-client rules followed: table layout, inline styles only, 600px max,
 * web fonts with safe fallbacks (Gmail strips @font-face, so Georgia/Helvetica/Menlo
 * show there), no SVG, no background images.
 */
export interface EmailBrand {
  /** Wordmark in the header, e.g. "Using". */
  name: string;
  /** Accent for the CTA, labels and numbering. */
  accent?: string;
  /** Link on the wordmark and in the footer. */
  url?: string;
  /** One line under the wordmark in the footer (tagline / address). */
  footer?: string;
  /** Where {{cta_url}} buttons point (booking link). Falls back to `url`. */
  ctaUrl?: string;
}

/**
 * Fill {{cta_url}} from the brand; with no URL at all, drop the button line rather
 * than send a broken "[Book a call]({{cta_url}})".
 */
export function resolveCta(body: string, brand: EmailBrand): string {
  const url = brand.ctaUrl || brand.url;
  return url
    ? body.replace(/{{\s*cta_url\s*}}/gi, url)
    : body.split('\n').filter((l) => !/{{\s*cta_url\s*}}/i.test(l)).join('\n');
}

const C = {
  page: '#F5F4F1',
  card: '#FFFFFF',
  ink: '#0B0A09',
  body: '#3A3835',
  muted: '#8A8780',
  rule: '#E4E1DB',
};
const SERIF = "'Source Serif 4', 'Source Serif Pro', Georgia, 'Times New Roman', serif";
const SANS = "Geist, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "'Geist Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

type Block =
  | { kind: 'label'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'item'; text: string }
  | { kind: 'cta'; text: string; href: string }
  | { kind: 'rule' }
  | { kind: 'para'; lines: string[] };

const CTA_RE = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/;

export function parseBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ kind: 'para', lines: para });
    para = [];
  };
  for (const raw of body.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim();
    const cta = line.match(CTA_RE);
    if (!line) flush();
    else if (line.startsWith('::')) (flush(), blocks.push({ kind: 'label', text: line.slice(2).trim() }));
    else if (line.startsWith('# ')) (flush(), blocks.push({ kind: 'heading', text: line.slice(2).trim() }));
    else if (/^[-•]\s+/.test(line)) (flush(), blocks.push({ kind: 'item', text: line.replace(/^[-•]\s+/, '') }));
    else if (cta) (flush(), blocks.push({ kind: 'cta', text: cta[1], href: cta[2] }));
    else if (/^-{3,}$/.test(line)) (flush(), blocks.push({ kind: 'rule' }));
    else para.push(line);
  }
  flush();
  return blocks;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escape, then allow _italic_ and bare links. */
function inline(s: string, accent: string): string {
  return esc(s)
    .replace(/(^|[\s(])_([^_]+)_(?=[\s.,!?;:)]|$)/g, '$1<em style="font-style:italic;">$2</em>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, `<a href="$1" style="color:${accent};text-decoration:underline;">$1</a>`);
}

export function renderEmailHtml(body: string, brand: EmailBrand, subject = ''): string {
  const accent = brand.accent || '#E4572E';
  body = resolveCta(body, brand);
  const blocks = parseBlocks(body);
  let n = 0;
  const rows = blocks
    .map((b) => {
      if (b.kind !== 'item') n = 0; // each list numbers from 01
      switch (b.kind) {
        case 'label':
          return `<tr><td style="padding:0 0 18px;font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.ink};"><span style="display:inline-block;border:1px solid ${C.rule};padding:5px 9px;"><span style="color:${accent};">&#9632;</span>&nbsp; ${esc(b.text)}</span></td></tr>`;
        case 'heading':
          return `<tr><td style="padding:0 0 22px;font-family:${SERIF};font-size:34px;line-height:40px;font-weight:300;letter-spacing:-0.6px;color:${C.ink};">${inline(b.text, accent)}</td></tr>`;
        case 'item':
          n += 1;
          return `<tr><td style="padding:0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.rule};"><tr><td width="44" valign="top" style="padding:13px 0;font-family:${MONO};font-size:12px;color:${accent};">${String(n).padStart(2, '0')}</td><td style="padding:12px 0;font-family:${SANS};font-size:15px;line-height:23px;color:${C.ink};">${inline(b.text, accent)}</td></tr></table></td></tr>`;
        case 'cta':
          return `<tr><td style="padding:12px 0 26px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${accent};"><a href="${esc(b.href)}" style="display:inline-block;padding:14px 22px;font-family:${MONO};font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#FFFFFF;text-decoration:none;">${esc(b.text)}&nbsp;&nbsp;&rarr;</a></td></tr></table></td></tr>`;
        case 'rule':
          return `<tr><td style="padding:6px 0 22px;"><div style="border-top:1px solid ${C.ink};font-size:0;line-height:0;">&nbsp;</div></td></tr>`;
        case 'para':
          return `<tr><td style="padding:0 0 18px;font-family:${SANS};font-size:15px;line-height:24px;color:${C.body};">${b.lines.map((l) => inline(l, accent)).join('<br>')}</td></tr>`;
      }
    })
    // close a run of numbered rows with a bottom rule
    .map((html, i) => (blocks[i].kind === 'item' && blocks[i + 1]?.kind !== 'item' ? `${html}<tr><td style="border-top:1px solid ${C.rule};padding:0 0 22px;font-size:0;line-height:0;">&nbsp;</td></tr>` : html))
    .join('');

  const wordmark = `${esc(brand.name)}<span style="color:${accent};">.</span>`;
  const home = brand.url ? esc(brand.url) : '';
  const preheader = esc(plainTextFromMarkup(body).replace(/\s+/g, ' ').slice(0, 140));

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono&family=Source+Serif+4:ital,wght@0,300;1,300&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.page};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
  <tr><td style="padding:0 4px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-family:${SERIF};font-size:22px;color:${C.ink};">${home ? `<a href="${home}" style="color:${C.ink};text-decoration:none;">${wordmark}</a>` : wordmark}</td>
      ${home ? `<td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:2px;text-transform:uppercase;"><a href="${home}" style="color:${C.muted};text-decoration:none;">${esc(home.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></td>` : ''}
    </tr></table>
  </td></tr>
  <tr><td style="border-top:1px solid ${C.ink};font-size:0;line-height:0;">&nbsp;</td></tr>
  <tr><td style="background:${C.card};border:1px solid ${C.rule};border-top:0;padding:32px 28px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
  </td></tr>
  <tr><td style="padding:22px 4px 0;font-family:${MONO};font-size:10px;line-height:17px;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};">
    ${esc(brand.name)}${brand.footer ? ` &middot; ${esc(brand.footer)}` : ''}<br>
    <span style="text-transform:none;letter-spacing:0;font-family:${SANS};font-size:12px;">Tidak ingin menerima email seperti ini lagi? Balas email ini dengan kata &ldquo;stop&rdquo;.</span>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

/** The text/plain part: markup stripped, links kept readable. */
export function plainTextFromMarkup(body: string, brand?: EmailBrand): string {
  let n = 0;
  return parseBlocks(brand ? resolveCta(body, brand) : body)
    .map((b) => {
      if (b.kind !== 'item') n = 0;
      switch (b.kind) {
        case 'label':
          return b.text.toUpperCase();
        case 'heading':
          return b.text.replace(/_([^_]+)_/g, '$1');
        case 'item':
          n += 1;
          return `${String(n).padStart(2, '0')}  ${b.text}`;
        case 'cta':
          return `${b.text}: ${b.href}`;
        case 'rule':
          return '';
        case 'para':
          return b.lines.join('\n');
      }
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Brand from the server env, falling back to the workspace name. */
export function brandFromEnv(env: Record<string, string | undefined>, fallbackName = 'Our team'): EmailBrand {
  return {
    name: env.EMAIL_BRAND_NAME || fallbackName,
    accent: env.EMAIL_BRAND_ACCENT || '#E4572E',
    url: env.EMAIL_BRAND_URL || undefined,
    footer: env.EMAIL_BRAND_FOOTER || undefined,
    ctaUrl: env.EMAIL_CTA_URL || undefined,
  };
}
