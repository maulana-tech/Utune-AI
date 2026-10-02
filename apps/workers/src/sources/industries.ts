/**
 * B2B industry vocabulary shared by the keyless sources. Users type "gas",
 * "kontraktor" or "brand"; Wikidata wants industry items ("petroleum industry")
 * and OSM wants tags (industrial=oil). This table bridges the two.
 *
 * ponytail: hand-kept list. Add a row when users search an industry that comes
 * back empty on the keyless sources — paid sources don't need it.
 */
export interface Industry {
  /** Search terms for Wikidata industry items (P452). */
  wikidata: string[];
  /** OSM [key, value] tags marking businesses in this industry. */
  osm: [string, string][];
}

const INDUSTRIES: Record<string, Industry> = {
  construction: {
    wikidata: ['construction', 'civil engineering', 'building materials'],
    osm: [['craft', 'builder'], ['office', 'construction_company'], ['office', 'architect'], ['shop', 'trade']],
  },
  'oil and gas': {
    wikidata: ['petroleum industry', 'natural gas industry', 'oil and gas industry'],
    osm: [['industrial', 'oil'], ['industrial', 'gas'], ['office', 'energy_supplier'], ['shop', 'gas']],
  },
  energy: {
    wikidata: ['energy industry', 'electric power industry', 'renewable energy'],
    osm: [['office', 'energy_supplier'], ['power', 'plant']],
  },
  mining: {
    wikidata: ['mining', 'coal mining'],
    osm: [['industrial', 'mine'], ['office', 'mining_company']],
  },
  manufacturing: {
    wikidata: ['manufacturing', 'industrial machinery', 'chemical industry'],
    osm: [['man_made', 'works'], ['industrial', 'factory'], ['craft', 'metal_construction']],
  },
  logistics: {
    wikidata: ['logistics', 'transport', 'shipping'],
    osm: [['office', 'logistics'], ['industrial', 'warehouse'], ['office', 'courier'], ['amenity', 'courier']],
  },
  'consumer brands': {
    wikidata: ['consumer goods', 'fast-moving consumer goods', 'cosmetics industry', 'food industry'],
    osm: [['office', 'company']],
  },
  'food and beverage': {
    wikidata: ['food industry', 'beverage industry', 'food processing'],
    osm: [['industrial', 'food_industry'], ['craft', 'brewery'], ['shop', 'wholesale']],
  },
  'real estate': {
    wikidata: ['real estate', 'property development'],
    osm: [['office', 'estate_agent']],
  },
  technology: {
    wikidata: ['software industry', 'information technology', 'telecommunications'],
    osm: [['office', 'it'], ['office', 'telecommunication']],
  },
  finance: {
    wikidata: ['financial services', 'banking', 'insurance'],
    osm: [['office', 'financial'], ['office', 'insurance'], ['amenity', 'bank']],
  },
  agriculture: {
    wikidata: ['agriculture', 'palm oil', 'agribusiness'],
    osm: [['office', 'agriculture'], ['industrial', 'agriculture']],
  },
  automotive: {
    wikidata: ['automotive industry'],
    osm: [['shop', 'car'], ['shop', 'car_repair'], ['shop', 'car_parts']],
  },
  textile: {
    wikidata: ['textile industry', 'clothing industry'],
    osm: [['industrial', 'textile'], ['craft', 'tailor']],
  },
};

/** Words people type → INDUSTRIES key. English + Indonesian. */
const ALIASES: Record<string, string> = {
  construction: 'construction', contractor: 'construction', kontraktor: 'construction', konstruksi: 'construction',
  builder: 'construction', 'civil engineering': 'construction', 'building material': 'construction', 'bahan bangunan': 'construction',
  gas: 'oil and gas', oil: 'oil and gas', petroleum: 'oil and gas', migas: 'oil and gas', minyak: 'oil and gas', lpg: 'oil and gas',
  energy: 'energy', energi: 'energy', power: 'energy', listrik: 'energy', solar: 'energy',
  mining: 'mining', tambang: 'mining', pertambangan: 'mining', coal: 'mining', batubara: 'mining', nikel: 'mining', nickel: 'mining',
  manufacturing: 'manufacturing', manufaktur: 'manufacturing', factory: 'manufacturing', pabrik: 'manufacturing', industri: 'manufacturing', chemical: 'manufacturing', kimia: 'manufacturing',
  logistics: 'logistics', logistik: 'logistics', shipping: 'logistics', freight: 'logistics', ekspedisi: 'logistics', cargo: 'logistics', warehouse: 'logistics', gudang: 'logistics', transport: 'logistics',
  brand: 'consumer brands', brands: 'consumer brands', fmcg: 'consumer brands', 'consumer goods': 'consumer brands', cosmetics: 'consumer brands', kosmetik: 'consumer brands',
  'food and beverage': 'food and beverage', 'f&b': 'food and beverage', makanan: 'food and beverage', minuman: 'food and beverage', beverage: 'food and beverage', distributor: 'food and beverage',
  'real estate': 'real estate', property: 'real estate', properti: 'real estate', developer: 'real estate',
  software: 'technology', technology: 'technology', teknologi: 'technology', it: 'technology', saas: 'technology', telecom: 'technology', telekomunikasi: 'technology',
  finance: 'finance', bank: 'finance', banking: 'finance', insurance: 'finance', asuransi: 'finance', fintech: 'finance', keuangan: 'finance',
  agriculture: 'agriculture', pertanian: 'agriculture', perkebunan: 'agriculture', plantation: 'agriculture', 'palm oil': 'agriculture', sawit: 'agriculture',
  automotive: 'automotive', otomotif: 'automotive', 'car dealer': 'automotive', dealer: 'automotive',
  textile: 'textile', tekstil: 'textile', garment: 'textile', garmen: 'textile', apparel: 'textile', konveksi: 'textile',
};

/** "kontraktor jalan" → construction; "cafe" → undefined. Longest alias wins ("palm oil" over "oil"). */
export function industryOf(what: string): (Industry & { name: string }) | undefined {
  const text = ` ${what.toLowerCase().replace(/[^a-z0-9&\s]/g, ' ').replace(/\s+/g, ' ')} `;
  const hit = Object.keys(ALIASES)
    .filter((alias) => text.includes(` ${alias} `))
    .sort((a, b) => b.length - a.length)[0];
  if (!hit) return undefined;
  const name = ALIASES[hit];
  return { name, ...INDUSTRIES[name] };
}
