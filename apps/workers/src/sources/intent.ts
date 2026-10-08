import type { RawLead } from './types';

/**
 * Keyword search for "butuh jasa bikin aplikasi" also matches every seller's ad
 * ("yang butuh jasa bikin aplikasi, DM kami"). Keep posts that read like someone
 * asking; drop ones that read like someone offering. Regex, not an LLM — scraping
 * stays token-free.
 *
 * ponytail: phrase lists, Indonesian + English. An opt-in LLM intent check per
 * lead would be sharper if these miss too much.
 */
const SELLER =
  /^(tips|cara|panduan|guide|how to)\b|\b(open (order|jasa|po|slot)|jasa kami|kami (melayani|menyediakan|siap|bantu|hadir|adalah)|hubungi (kami|admin)|order (sekarang|via)|harga (mulai|terjangkau|murah)|mulai dari rp|promo|diskon|melayani|siap membantu|fast res(p|pon)|dm (aja|kami|kita|for)|chat admin|whatsapp kami|wa\.me|klik link|link di bio|we offer|our (services|team|agency)|hire us|contact us|i can (build|help|make)|i will (build|create|make)|available for (hire|work|freelance)|portfolio|joki)\b/i;

const BUYER =
  /\b(butuh|membutuhkan|dibutuhkan|cari|nyari|mencari|lagi cari|ada yang bisa|ada yg bisa|rekomendasi|rekomen|recommend|looking for|need (a|an|some|help|someone)|anyone (know|recommend)|who can|can someone|hiring|seeking)\b/i;

/** Post text without links/mentions — a post that is only a t.co link says nothing. */
function words(text: string): string {
  return text.replace(/https?:\/\/\S+/g, ' ').replace(/[@#]\S+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function isBuyerIntent(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = words(text);
  return t.length >= 25 && BUYER.test(t) && !SELLER.test(t);
}

export function keepBuyerIntent(leads: RawLead[]): RawLead[] {
  return leads.filter((l) => isBuyerIntent(l.postText));
}

/** Ask a platform for more than we keep — most matches are ads. */
export const OVERFETCH = 3;

const NEED_WORDS = /^(butuh|membutuhkan|cari|nyari|mencari|lagi cari|need|needs|looking for|seeking)\s+/i;

/**
 * One typed need → the ways buyers actually phrase it. "butuh jasa bikin aplikasi"
 * is rare verbatim; "cari jasa bikin aplikasi" / "ada yang bisa …" / "rekomendasi …"
 * are what people post. Indonesian phrasings when the query reads Indonesian.
 */
export function buyerQueries(query: string): string[] {
  const core = query.trim().replace(NEED_WORDS, '');
  const indonesian = /\b(jasa|bikin|buat|pembuatan|butuh|cari|aplikasi|perusahaan|kantor|untuk|yang)\b/i.test(query);
  const variants = indonesian
    ? [`butuh ${core}`, `cari ${core}`, `rekomendasi ${core}`, `ada yang bisa ${core}`]
    : [`looking for ${core}`, `need ${core}`, `recommend ${core}`, `anyone know ${core}`];
  return [...new Set([query.trim(), ...variants])];
}
