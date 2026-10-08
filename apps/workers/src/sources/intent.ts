
const NEED_WORDS = /^(butuh|membutuhkan|cari|nyari|mencari|lagi cari|need|needs|looking for|seeking)\s+/i;

/**
 * One typed need → the ways buyers actually phrase it. "butuh jasa bikin aplikasi"
 * is rare verbatim; "cari jasa bikin aplikasi" / "ada yang bisa …" / "rekomendasi …"
 * are what people post. Indonesian phrasings when the query reads Indonesian.
 */
/** "butuh jasa bikin aplikasi" → "jasa bikin aplikasi": the thing needed, without the asking verb. */
export function coreNeed(query: string): string {
  return query.trim().replace(NEED_WORDS, '');
}

export function buyerQueries(query: string): string[] {
  const core = coreNeed(query);
  const indonesian = /\b(jasa|bikin|buat|pembuatan|butuh|cari|aplikasi|perusahaan|kantor|untuk|yang)\b/i.test(query);
  const variants = indonesian
    ? [`butuh ${core}`, `cari ${core}`, `rekomendasi ${core}`, `ada yang bisa ${core}`]
    : [`looking for ${core}`, `need ${core}`, `recommend ${core}`, `anyone know ${core}`];
  return [...new Set([query.trim(), ...variants])];
}
