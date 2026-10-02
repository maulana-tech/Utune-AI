/** Fields a follow-up template can reference as {{variable}}. */
export interface TemplateLead {
  name: string;
  category: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
}

export const TEMPLATE_VARS = ['business_name', 'category', 'city', 'address', 'phone', 'website'] as const;

/** Second-to-last address part — "street, city, country" → city. */
function cityOf(address: string | null): string {
  const parts = (address ?? '').split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : (parts[0] ?? '');
}

/** Replace {{var}} with lead data. Unknown variables are left as-is so typos stay visible. */
export function renderTemplate(text: string, lead: TemplateLead): string {
  const values: Record<string, string> = {
    business_name: lead.name,
    company_name: lead.name, // alias used by the email templates API
    category: lead.category ?? '',
    city: cityOf(lead.address),
    address: lead.address ?? '',
    phone: lead.phone ?? '',
    website: lead.website ?? '',
  };
  return text.replace(/{{\s*(\w+)\s*}}/g, (match, key: string) =>
    key.toLowerCase() in values ? values[key.toLowerCase()] : match,
  );
}

/**
 * Phone → digits wa.me accepts (country code, no '+', no leading 0).
 * ponytail: a local "08..." number is assumed Indonesian (+62) — store E.164 on leads
 * if non-Indonesian local numbers start showing up.
 */
export function waNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

/** Seeded into a workspace the first time it opens Contacts with no templates. */
export const STARTER_TEMPLATES = [
  {
    name: 'Perkenalan',
    subject: 'Kerja sama dengan {{business_name}}',
    body:
      'Halo tim {{business_name}},\n\nSaya menemukan bisnis Anda di {{city}} dan tertarik untuk berdiskusi singkat soal bagaimana kami bisa membantu {{category}} seperti Anda mendapat lebih banyak pelanggan.\n\nApakah ada waktu 10 menit minggu ini?\n\nTerima kasih!',
  },
  {
    name: 'Follow-up 1 (3 hari)',
    subject: 'Menindaklanjuti pesan saya, {{business_name}}',
    body:
      'Halo lagi tim {{business_name}},\n\nSekadar menindaklanjuti pesan saya beberapa hari lalu. Kalau sekarang belum waktu yang pas, tidak masalah — boleh kabari kapan sebaiknya saya hubungi kembali?\n\nSalam.',
  },
  {
    name: 'Follow-up terakhir',
    subject: 'Pesan terakhir dari saya',
    body:
      'Halo tim {{business_name}},\n\nIni pesan terakhir saya agar tidak mengganggu. Kalau suatu saat butuh bantuan untuk bisnis {{category}} Anda, saya siap membantu.\n\nSukses selalu!',
  },
];
