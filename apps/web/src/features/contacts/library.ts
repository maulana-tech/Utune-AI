/**
 * Ready-made B2B email templates, Indonesian + English. {{variables}} fill from the
 * lead (see TEMPLATE_VARS); [bracketed] parts are yours to fill before sending.
 * Workspaces start with LIBRARY_STARTERS; the rest are added from the Library panel.
 */
export interface LibraryTemplate {
  id: string;
  type: TemplateType;
  lang: 'id' | 'en';
  name: string;
  subject: string;
  body: string;
}

export const TEMPLATE_TYPES = [
  'Perkenalan',
  'Follow-up',
  'Meeting / Demo',
  'Penawaran',
  'Pasca-meeting',
  'Nilai tambah',
  'Re-engagement',
  'Referral',
  'Undangan event',
  'Kemitraan',
  'Terima kasih',
  'Penutup',
] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

const SIGN_ID = 'Salam hormat,\n[Nama Anda]\n[Jabatan], [Perusahaan Anda]\n[No. telepon]';
const SIGN_EN = 'Best regards,\n[Your name]\n[Title], [Your company]\n[Phone]';

export const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  // ── Perkenalan ────────────────────────────────────────────────────────────
  {
    id: 'intro-id',
    type: 'Perkenalan',
    lang: 'id',
    name: 'Perkenalan singkat',
    subject: 'Kolaborasi dengan {{business_name}}',
    body: `Yth. Tim {{business_name}},

Perkenalkan, saya [Nama Anda] dari [Perusahaan Anda]. Kami membantu perusahaan {{category}} seperti {{business_name}} untuk [hasil utama, mis. mempercepat proses pengadaan hingga 30%].

Beberapa klien kami di {{city}} memakai [produk/jasa Anda] untuk [manfaat spesifik]. Saya rasa pendekatan serupa bisa relevan untuk {{business_name}}.

Apakah Bapak/Ibu bersedia berdiskusi 15 menit minggu ini? Saya fleksibel menyesuaikan jadwal.

${SIGN_ID}`,
  },
  {
    id: 'intro-en',
    type: 'Perkenalan',
    lang: 'en',
    name: 'Intro, short and direct',
    subject: 'Quick idea for {{business_name}}',
    body: `Hi {{business_name}} team,

I'm [Your name] from [Your company]. We help {{category}} companies like {{business_name}} [key outcome, e.g. cut procurement time by 30%].

A few teams in {{city}} use [your product/service] to [specific benefit], and I think a similar approach could work for you.

Would you be open to a 15-minute call this week? Happy to work around your schedule.

${SIGN_EN}`,
  },
  {
    id: 'intro-problem-id',
    type: 'Perkenalan',
    lang: 'id',
    name: 'Perkenalan berbasis masalah',
    subject: '[Masalah umum] di perusahaan {{category}}',
    body: `Yth. Tim {{business_name}},

Banyak perusahaan {{category}} yang kami ajak bicara menghadapi tantangan yang sama: [masalah umum, mis. laporan proyek yang masih manual dan sering terlambat].

[Perusahaan Anda] membantu menyelesaikan hal ini dengan [solusi singkat]. Hasilnya, klien kami rata-rata [hasil terukur].

Jika hal ini juga dialami {{business_name}}, saya ingin berbagi bagaimana kami melakukannya. Apakah ada waktu untuk panggilan singkat?

${SIGN_ID}`,
  },
  {
    id: 'intro-problem-en',
    type: 'Perkenalan',
    lang: 'en',
    name: 'Intro, problem-led',
    subject: '[Common problem] at {{category}} companies',
    body: `Hi {{business_name}} team,

Most {{category}} companies we speak with run into the same issue: [common problem, e.g. project reports still compiled by hand and often late].

[Your company] fixes this with [short solution]. On average our clients see [measurable result].

If this sounds familiar at {{business_name}}, I'd be glad to show how we do it. Do you have time for a short call?

${SIGN_EN}`,
  },

  // ── Follow-up ─────────────────────────────────────────────────────────────
  {
    id: 'followup1-id',
    type: 'Follow-up',
    lang: 'id',
    name: 'Follow-up 1 (3 hari kemudian)',
    subject: 'Re: Kolaborasi dengan {{business_name}}',
    body: `Yth. Tim {{business_name}},

Saya ingin menindaklanjuti email saya sebelumnya. Singkatnya, kami membantu perusahaan {{category}} [hasil utama].

Apakah topik ini relevan untuk {{business_name}} saat ini? Cukup dibalas "ya" atau "tidak sekarang", keduanya sangat membantu saya.

${SIGN_ID}`,
  },
  {
    id: 'followup1-en',
    type: 'Follow-up',
    lang: 'en',
    name: 'Follow-up 1 (after 3 days)',
    subject: 'Re: Quick idea for {{business_name}}',
    body: `Hi {{business_name}} team,

Following up on my last note. In short, we help {{category}} companies [key outcome].

Is this relevant for {{business_name}} right now? A simple "yes" or "not now" helps me a lot.

${SIGN_EN}`,
  },
  {
    id: 'followup2-id',
    type: 'Follow-up',
    lang: 'id',
    name: 'Follow-up 2 (studi kasus)',
    subject: 'Contoh hasil untuk perusahaan {{category}}',
    body: `Yth. Tim {{business_name}},

Sebagai gambaran, berikut hasil salah satu klien kami di bidang {{category}}:
- Sebelum: [kondisi sebelum]
- Sesudah: [hasil setelah memakai solusi Anda]
- Waktu implementasi: [durasi]

Jika Bapak/Ibu tertarik melihat apakah hasil serupa memungkinkan untuk {{business_name}}, saya bisa menyiapkan simulasi singkat tanpa biaya.

${SIGN_ID}`,
  },
  {
    id: 'followup2-en',
    type: 'Follow-up',
    lang: 'en',
    name: 'Follow-up 2 (case study)',
    subject: 'What this looked like for another {{category}} company',
    body: `Hi {{business_name}} team,

Here's a quick snapshot from one of our {{category}} clients:
- Before: [situation before]
- After: [result with your solution]
- Time to value: [duration]

If you'd like to see whether something similar is possible for {{business_name}}, I can put together a short, no-cost assessment.

${SIGN_EN}`,
  },

  // ── Meeting / Demo ────────────────────────────────────────────────────────
  {
    id: 'meeting-id',
    type: 'Meeting / Demo',
    lang: 'id',
    name: 'Permintaan meeting / demo',
    subject: 'Jadwal demo 20 menit untuk {{business_name}}',
    body: `Yth. Tim {{business_name}},

Terima kasih atas ketertarikannya. Saya ingin mengajak Bapak/Ibu mengikuti demo singkat sekitar 20 menit untuk melihat langsung bagaimana [produk/jasa Anda] bekerja untuk kebutuhan {{category}}.

Pilihan waktu yang tersedia:
- [Hari, tanggal, jam]
- [Hari, tanggal, jam]
- [Hari, tanggal, jam]

Silakan pilih yang paling sesuai, atau sarankan waktu lain. Demo bisa dilakukan online maupun di kantor Bapak/Ibu di {{city}}.

${SIGN_ID}`,
  },
  {
    id: 'meeting-en',
    type: 'Meeting / Demo',
    lang: 'en',
    name: 'Meeting / demo request',
    subject: '20-minute demo for {{business_name}}',
    body: `Hi {{business_name}} team,

Thanks for your interest. I'd like to walk you through a short 20-minute demo of how [your product/service] works for {{category}} teams.

A few times that work on my side:
- [Day, date, time]
- [Day, date, time]
- [Day, date, time]

Pick whichever suits you, or suggest another slot. Happy to do it online or at your office in {{city}}.

${SIGN_EN}`,
  },

  // ── Penawaran ─────────────────────────────────────────────────────────────
  {
    id: 'proposal-id',
    type: 'Penawaran',
    lang: 'id',
    name: 'Kirim penawaran / proposal',
    subject: 'Penawaran [produk/jasa] untuk {{business_name}}',
    body: `Yth. Tim {{business_name}},

Menindaklanjuti diskusi kita, terlampir penawaran untuk [lingkup pekerjaan]. Ringkasannya:

- Lingkup: [ringkasan lingkup]
- Investasi: [harga / skema]
- Jadwal: [estimasi waktu pengerjaan]
- Berlaku hingga: [tanggal]

Saya siap menjelaskan detailnya atau menyesuaikan penawaran dengan kebutuhan {{business_name}}. Apakah ada waktu untuk membahasnya minggu ini?

${SIGN_ID}`,
  },
  {
    id: 'proposal-en',
    type: 'Penawaran',
    lang: 'en',
    name: 'Send a proposal',
    subject: '[Product/service] proposal for {{business_name}}',
    body: `Hi {{business_name}} team,

Following our conversation, please find attached our proposal for [scope]. In short:

- Scope: [summary]
- Investment: [price / model]
- Timeline: [estimated delivery]
- Valid until: [date]

I'm happy to walk through the details or adjust it to fit {{business_name}}'s needs. Would you have time to review it together this week?

${SIGN_EN}`,
  },
  {
    id: 'proposal-followup-id',
    type: 'Penawaran',
    lang: 'id',
    name: 'Follow-up penawaran',
    subject: 'Re: Penawaran untuk {{business_name}}',
    body: `Yth. Tim {{business_name}},

Saya ingin memastikan penawaran yang kami kirim pada [tanggal] sudah diterima. Apakah ada bagian yang perlu kami jelaskan atau sesuaikan, misalnya lingkup, harga, atau jadwal?

Jika keputusan masih menunggu pihak lain, saya dengan senang hati menyiapkan ringkasan satu halaman untuk mempermudah proses internal.

${SIGN_ID}`,
  },

  // ── Pasca-meeting ─────────────────────────────────────────────────────────
  {
    id: 'recap-id',
    type: 'Pasca-meeting',
    lang: 'id',
    name: 'Ringkasan setelah meeting',
    subject: 'Ringkasan pertemuan dan langkah selanjutnya, {{business_name}}',
    body: `Yth. Tim {{business_name}},

Terima kasih atas waktunya hari ini. Berikut ringkasan pembahasan kita:

Kebutuhan utama:
- [poin 1]
- [poin 2]

Langkah selanjutnya:
- [Perusahaan Anda]: [tindakan], tenggat [tanggal]
- {{business_name}}: [tindakan], tenggat [tanggal]

Mohon dikoreksi jika ada yang terlewat. Saya akan menghubungi kembali pada [tanggal].

${SIGN_ID}`,
  },
  {
    id: 'recap-en',
    type: 'Pasca-meeting',
    lang: 'en',
    name: 'Meeting recap and next steps',
    subject: 'Recap and next steps, {{business_name}}',
    body: `Hi {{business_name}} team,

Thanks for your time today. Here's a quick recap:

Key needs:
- [point 1]
- [point 2]

Next steps:
- [Your company]: [action], due [date]
- {{business_name}}: [action], due [date]

Let me know if I missed anything. I'll follow up on [date].

${SIGN_EN}`,
  },

  // ── Nilai tambah ──────────────────────────────────────────────────────────
  {
    id: 'value-id',
    type: 'Nilai tambah',
    lang: 'id',
    name: 'Berbagi insight / resource',
    subject: 'Insight untuk industri {{category}}',
    body: `Yth. Tim {{business_name}},

Saya baru menyusun [laporan/checklist/artikel] tentang [topik relevan untuk {{category}}], dan rasanya bisa berguna untuk tim {{business_name}}.

Beberapa poin pentingnya:
- [insight 1]
- [insight 2]

Dokumennya bisa dibaca di sini: [link]. Jika ada pertanyaan, silakan hubungi saya.

${SIGN_ID}`,
  },
  {
    id: 'value-en',
    type: 'Nilai tambah',
    lang: 'en',
    name: 'Share an insight / resource',
    subject: 'Something useful for {{category}} teams',
    body: `Hi {{business_name}} team,

I recently put together a [report/checklist/article] on [topic relevant to {{category}}] and thought it might help your team.

A few takeaways:
- [insight 1]
- [insight 2]

You can read it here: [link]. Let me know if you have questions.

${SIGN_EN}`,
  },

  // ── Re-engagement ─────────────────────────────────────────────────────────
  {
    id: 'reengage-id',
    type: 'Re-engagement',
    lang: 'id',
    name: 'Menghubungi kembali prospek lama',
    subject: 'Ada pembaruan untuk {{business_name}}',
    body: `Yth. Tim {{business_name}},

Beberapa waktu lalu kita sempat berdiskusi tentang [topik]. Sejak itu, kami telah [pembaruan penting, mis. meluncurkan fitur baru / menurunkan biaya implementasi].

Mengingat kebutuhan {{business_name}} yang sempat dibahas, saya rasa ini layak dipertimbangkan kembali. Apakah waktunya sudah tepat untuk berdiskusi lagi?

${SIGN_ID}`,
  },
  {
    id: 'reengage-en',
    type: 'Re-engagement',
    lang: 'en',
    name: 'Re-engage a past prospect',
    subject: 'An update worth a second look, {{business_name}}',
    body: `Hi {{business_name}} team,

We spoke a while ago about [topic]. Since then we've [key update, e.g. launched a new feature / lowered implementation cost].

Given what you shared about {{business_name}}'s needs, it may be worth revisiting. Is now a better time to reconnect?

${SIGN_EN}`,
  },

  // ── Referral ──────────────────────────────────────────────────────────────
  {
    id: 'referral-id',
    type: 'Referral',
    lang: 'id',
    name: 'Menanyakan kontak yang tepat',
    subject: 'Siapa yang menangani [bidang] di {{business_name}}?',
    body: `Yth. Tim {{business_name}},

Saya ingin menghubungi pihak yang bertanggung jawab atas [bidang, mis. pengadaan / operasional / IT] di {{business_name}}.

Apakah Bapak/Ibu berkenan mengarahkan saya ke orang yang tepat? Terima kasih banyak atas bantuannya.

${SIGN_ID}`,
  },
  {
    id: 'referral-en',
    type: 'Referral',
    lang: 'en',
    name: 'Ask for the right contact',
    subject: 'Who handles [area] at {{business_name}}?',
    body: `Hi {{business_name}} team,

I'm trying to reach whoever looks after [area, e.g. procurement / operations / IT] at {{business_name}}.

Would you mind pointing me to the right person? Thank you.

${SIGN_EN}`,
  },

  // ── Undangan event ────────────────────────────────────────────────────────
  {
    id: 'event-id',
    type: 'Undangan event',
    lang: 'id',
    name: 'Undangan webinar / acara',
    subject: 'Undangan: [nama acara] untuk pelaku {{category}}',
    body: `Yth. Tim {{business_name}},

Kami mengundang Bapak/Ibu untuk hadir di [nama acara], [webinar/diskusi] tentang [topik] khusus untuk pelaku {{category}}.

- Tanggal: [tanggal]
- Waktu: [jam] WIB
- Tempat: [online / lokasi di {{city}}]
- Pembicara: [nama & jabatan]

Pendaftaran gratis melalui: [link]

${SIGN_ID}`,
  },
  {
    id: 'event-en',
    type: 'Undangan event',
    lang: 'en',
    name: 'Webinar / event invite',
    subject: 'Invitation: [event name] for {{category}} leaders',
    body: `Hi {{business_name}} team,

We'd like to invite you to [event name], a [webinar/roundtable] on [topic] for {{category}} teams.

- Date: [date]
- Time: [time]
- Where: [online / venue in {{city}}]
- Speaker: [name & title]

Registration is free: [link]

${SIGN_EN}`,
  },

  // ── Kemitraan ─────────────────────────────────────────────────────────────
  {
    id: 'partner-id',
    type: 'Kemitraan',
    lang: 'id',
    name: 'Ajakan kemitraan / kerja sama',
    subject: 'Peluang kemitraan antara {{business_name}} dan [Perusahaan Anda]',
    body: `Yth. Tim {{business_name}},

[Perusahaan Anda] dan {{business_name}} melayani pelanggan yang serupa di sektor {{category}}, namun dengan produk yang saling melengkapi.

Kami melihat peluang kerja sama dalam bentuk [mis. referral, bundling, co-marketing], yang dapat [manfaat bagi kedua pihak].

Apakah Bapak/Ibu terbuka untuk diskusi awal? Saya bisa menyiapkan gambaran model kerja samanya terlebih dahulu.

${SIGN_ID}`,
  },
  {
    id: 'partner-en',
    type: 'Kemitraan',
    lang: 'en',
    name: 'Partnership proposal',
    subject: 'Partnership idea: {{business_name}} and [Your company]',
    body: `Hi {{business_name}} team,

[Your company] and {{business_name}} serve similar {{category}} customers with complementary offerings.

We see an opportunity to work together through [e.g. referrals, bundling, co-marketing], which could [benefit for both sides].

Would you be open to an exploratory chat? I can share a draft of how the partnership could work beforehand.

${SIGN_EN}`,
  },

  // ── Terima kasih ──────────────────────────────────────────────────────────
  {
    id: 'thanks-id',
    type: 'Terima kasih',
    lang: 'id',
    name: 'Terima kasih & onboarding klien baru',
    subject: 'Selamat bergabung, {{business_name}}',
    body: `Yth. Tim {{business_name}},

Terima kasih telah mempercayakan [proyek/layanan] kepada [Perusahaan Anda].

Langkah awal kita:
1. [Langkah 1, mis. kick-off meeting pada tanggal …]
2. [Langkah 2]
3. [Langkah 3]

Kontak utama Bapak/Ibu adalah [nama PIC] ([email/telepon]). Jangan ragu menghubungi kami kapan saja.

${SIGN_ID}`,
  },
  {
    id: 'thanks-en',
    type: 'Terima kasih',
    lang: 'en',
    name: 'Thank you & onboarding',
    subject: 'Welcome aboard, {{business_name}}',
    body: `Hi {{business_name}} team,

Thank you for choosing [Your company] for [project/service]. We look forward to working with you.

Here's how we'll get started:
1. [Step 1, e.g. kick-off call on …]
2. [Step 2]
3. [Step 3]

Your main point of contact is [name] ([email/phone]). Reach out anytime.

${SIGN_EN}`,
  },

  // ── Penutup ───────────────────────────────────────────────────────────────
  {
    id: 'breakup-id',
    type: 'Penutup',
    lang: 'id',
    name: 'Email penutup (breakup)',
    subject: 'Haruskah saya menutup percakapan ini?',
    body: `Yth. Tim {{business_name}},

Saya belum mendapat kabar, jadi saya asumsikan topik ini belum menjadi prioritas saat ini, dan itu sangat wajar.

Ini email terakhir saya agar tidak mengganggu. Jika di kemudian hari {{business_name}} membutuhkan [solusi Anda], saya siap membantu kapan saja.

Terima kasih.

${SIGN_ID}`,
  },
  {
    id: 'breakup-en',
    type: 'Penutup',
    lang: 'en',
    name: 'Breakup email',
    subject: 'Should I close your file?',
    body: `Hi {{business_name}} team,

I haven't heard back, so I'll assume this isn't a priority right now, which is completely understandable.

This is my last note so I don't crowd your inbox. If {{business_name}} ever needs [your solution], I'm one reply away.

All the best.

${SIGN_EN}`,
  },
];

/** What a new workspace starts with: a short Indonesian outreach sequence. */
export const LIBRARY_STARTERS = ['intro-id', 'followup1-id', 'meeting-id', 'proposal-id', 'breakup-id'].map((id) => {
  const t = TEMPLATE_LIBRARY.find((x) => x.id === id)!;
  return { name: t.name, subject: t.subject, body: t.body };
});
