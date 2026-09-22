import { generateObject } from 'ai';
import { defaultModel, fallbackModels } from '../provider';
import { generateObjectWithFallback } from '../fallback';
import { z } from 'zod';

export const ColdEmailSchema = z.object({
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body in plain text'),
  reasoning: z.string().describe('Why this approach was chosen for this lead'),
});

export type ColdEmail = z.infer<typeof ColdEmailSchema>;

export async function generateColdEmail(
  leadData: {
    name: string;
    category: string | null;
    address: string | null;
    website: string | null;
  },
  businessContext: string,
  salesAnalysis: string | null,
): Promise<ColdEmail> {
  const { object } = await generateObjectWithFallback(
    defaultModel,
    fallbackModels.standard,
    {
      schema: ColdEmailSchema,
      prompt: `Anda adalah spesialis email sales B2B. Tulis cold email yang dipersonalisasi.

DATA LEAD:
${JSON.stringify(leadData, null, 2)}

KONTEKS BISNIS KAMI:
${businessContext || 'Perusahaan B2B SaaS'}

${salesAnalysis ? `ANALISIS SALES (untuk referensi):\n${salesAnalysis}` : ''}

TUGAS ANDA:
Tulis email cold yang ringkas dan profesional:
1. Subject line yang menarik perhatian
2. Body yang dipersonalisasi untuk lead (sebutkan kategori/industri mereka)
3. Value proposition yang jelas terkait bisnis kami
4. Call to action yang tidak memaksa

ATURAN KRITIS:
1. TANPA emoji di subject line
2. TANPA sapaan generik — personalisasi
3. Body maksimal 150 kata
4. Tone profesional B2B
5. Format plain text (tanpa HTML)
6. Sertakan CTA yang spesifik dan rendah friction
7. BAHASA: tulis subject + body dalam bahasa bisnis yang dipakai di negara lead
   (lihat address-nya). Indonesia -> Bahasa Indonesia; negara lain -> bahasa lokal
   yang lazim dipakai untuk email bisnis, default English kalau ragu.
   Field "reasoning" tetap Bahasa Indonesia (dibaca tim sales kami).`,
    },
    'standard',
  );

  return object;
}
