/**
 * Ready-made B2B email templates, Indonesian + English, written in the email-layout
 * markup (packages/db/src/email-html.ts): `::label`, `# headline _italic_`, `- item`,
 * `[Button](url)`. They send as designed HTML with a plain-text part.
 * {{variables}} fill from the lead, {{cta_url}} from EMAIL_CTA_URL; [bracketed]
 * parts are yours to fill before sending.
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

const SIGN_ID = 'Salam hormat,\n[Nama Anda]\n[Jabatan], [Perusahaan Anda]';
const SIGN_EN = 'Best regards,\n[Your name]\n[Title], [Your company]';

export const TEMPLATE_LIBRARY: LibraryTemplate[] = [
  // ── Perkenalan ────────────────────────────────────────────────────────────
  {
    id: 'intro-id',
    type: 'Perkenalan',
    lang: 'id',
    name: 'Perkenalan singkat',
    subject: 'Ide untuk {{business_name}}',
    body: `::Perkenalan
# Bisnis Anda tumbuh. _Sistemnya_ juga perlu ikut tumbuh.

Yth. Tim {{business_name}},

Saya [Nama Anda] dari [Perusahaan Anda]. Kami membantu perusahaan {{category}} di {{city}} merapikan proses yang masih berjalan lewat spreadsheet, chat, dan kerja manual.

- [Hasil utama 1, mis. laporan proyek otomatis setiap minggu]
- [Hasil utama 2, mis. data penjualan dan stok di satu tempat]
- [Hasil utama 3, mis. harga tetap yang disepakati sebelum mulai]

Kalau topik ini relevan, saya ingin berdiskusi 15 menit untuk memahami kebutuhan {{business_name}}.

[Jadwalkan diskusi 15 menit]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'intro-en',
    type: 'Perkenalan',
    lang: 'en',
    name: 'Intro, short and direct',
    subject: 'An idea for {{business_name}}',
    body: `::Introduction
# Your business has grown. _Your systems_ should too.

Hi {{business_name}} team,

I'm [Your name] from [Your company]. We help {{category}} companies in {{city}} move work out of spreadsheets, chat threads and manual steps.

- [Key outcome 1, e.g. weekly project reports that build themselves]
- [Key outcome 2, e.g. sales and stock in one place]
- [Key outcome 3, e.g. a fixed price agreed before kickoff]

If this is relevant, I'd like a 15-minute call to understand what {{business_name}} needs.

[Book a 15-minute call]({{cta_url}})

${SIGN_EN}`,
  },
  {
    id: 'intro-problem-id',
    type: 'Perkenalan',
    lang: 'id',
    name: 'Perkenalan berbasis masalah',
    subject: 'Masalah yang sering kami lihat di perusahaan {{category}}',
    body: `::Perkenalan
# Masih mengandalkan _laporan manual_?

Yth. Tim {{business_name}},

Banyak perusahaan {{category}} yang kami ajak bicara menghadapi hal yang sama: [masalah umum, mis. laporan proyek disusun manual dan sering terlambat]. Akibatnya [dampak, mis. keputusan diambil dengan data yang sudah basi].

[Perusahaan Anda] menyelesaikan ini dengan [solusi singkat]. Klien kami rata-rata merasakan [hasil terukur] dalam [jangka waktu].

Jika kondisi ini juga terjadi di {{business_name}}, saya bisa menunjukkan caranya dalam panggilan singkat.

[Lihat caranya]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'intro-problem-en',
    type: 'Perkenalan',
    lang: 'en',
    name: 'Intro, problem-led',
    subject: 'Something we keep seeing at {{category}} companies',
    body: `::Introduction
# Still running on _manual reports_?

Hi {{business_name}} team,

Most {{category}} companies we speak with run into the same issue: [common problem, e.g. project reports compiled by hand and often late]. The result is [impact, e.g. decisions made on stale numbers].

[Your company] fixes this with [short solution]. On average our clients see [measurable result] within [timeframe].

If this sounds familiar at {{business_name}}, I can walk you through how it works on a short call.

[See how it works]({{cta_url}})

${SIGN_EN}`,
  },

  // ── Follow-up ─────────────────────────────────────────────────────────────
  {
    id: 'followup1-id',
    type: 'Follow-up',
    lang: 'id',
    name: 'Follow-up 1 (3 hari kemudian)',
    subject: 'Re: Ide untuk {{business_name}}',
    body: `::Tindak lanjut
# Satu pertanyaan _singkat_.

Yth. Tim {{business_name}},

Saya menindaklanjuti email saya sebelumnya. Singkatnya, kami membantu perusahaan {{category}} [hasil utama].

Apakah ini relevan untuk {{business_name}} saat ini? Cukup dibalas "ya" atau "belum sekarang", keduanya sangat membantu saya.

${SIGN_ID}`,
  },
  {
    id: 'followup1-en',
    type: 'Follow-up',
    lang: 'en',
    name: 'Follow-up 1 (after 3 days)',
    subject: 'Re: An idea for {{business_name}}',
    body: `::Follow-up
# One _quick_ question.

Hi {{business_name}} team,

Following up on my last note. In short, we help {{category}} companies [key outcome].

Is this relevant for {{business_name}} right now? A simple "yes" or "not now" helps me a lot.

${SIGN_EN}`,
  },
  {
    id: 'followup2-id',
    type: 'Follow-up',
    lang: 'id',
    name: 'Follow-up 2 (studi kasus)',
    subject: 'Hasil untuk perusahaan {{category}} lain',
    body: `::Studi kasus
# Dari _spreadsheet_ ke sistem yang berjalan sendiri.

Yth. Tim {{business_name}},

Sebagai gambaran, berikut hasil salah satu klien kami di bidang {{category}}:

- Sebelum: [kondisi sebelum]
- Sesudah: [hasil setelah memakai solusi Anda]
- Waktu pengerjaan: [durasi]

Jika ingin melihat apakah hasil serupa memungkinkan untuk {{business_name}}, saya bisa menyiapkan penilaian singkat tanpa biaya.

[Minta penilaian gratis]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'followup2-en',
    type: 'Follow-up',
    lang: 'en',
    name: 'Follow-up 2 (case study)',
    subject: 'What this looked like for another {{category}} company',
    body: `::Case study
# From _spreadsheets_ to a system that runs itself.

Hi {{business_name}} team,

Here's a snapshot from one of our {{category}} clients:

- Before: [situation before]
- After: [result with your solution]
- Time to deliver: [duration]

If you'd like to see whether something similar is possible for {{business_name}}, I can put together a short, no-cost assessment.

[Request a free assessment]({{cta_url}})

${SIGN_EN}`,
  },

  // ── Meeting / Demo ────────────────────────────────────────────────────────
  {
    id: 'meeting-id',
    type: 'Meeting / Demo',
    lang: 'id',
    name: 'Permintaan meeting / demo',
    subject: 'Demo 20 menit untuk {{business_name}}',
    body: `::Demo
# Lihat langsung _cara kerjanya_.

Yth. Tim {{business_name}},

Terima kasih atas ketertarikannya. Dalam demo sekitar 20 menit, kami akan menunjukkan:

- Bagaimana [produk/jasa Anda] menangani kebutuhan {{category}}
- Contoh hasil dari klien dengan skala serupa
- Estimasi waktu dan biaya untuk {{business_name}}

Demo bisa dilakukan online atau di kantor Bapak/Ibu di {{city}}. Silakan pilih waktu yang paling sesuai.

[Pilih jadwal demo]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'meeting-en',
    type: 'Meeting / Demo',
    lang: 'en',
    name: 'Meeting / demo request',
    subject: 'A 20-minute demo for {{business_name}}',
    body: `::Demo
# See _how it works_.

Hi {{business_name}} team,

Thanks for your interest. In a 20-minute demo we'll cover:

- How [your product/service] handles {{category}} workflows
- Results from a client of a similar size
- A time and cost estimate for {{business_name}}

We can do it online or at your office in {{city}}. Pick whatever time suits you.

[Pick a demo slot]({{cta_url}})

${SIGN_EN}`,
  },

  // ── Penawaran ─────────────────────────────────────────────────────────────
  {
    id: 'proposal-id',
    type: 'Penawaran',
    lang: 'id',
    name: 'Kirim penawaran / proposal',
    subject: 'Penawaran untuk {{business_name}}',
    body: `::Penawaran
# Lingkup tetap. _Harga tetap_.

Yth. Tim {{business_name}},

Menindaklanjuti diskusi kita, terlampir penawaran untuk [lingkup pekerjaan]. Ringkasannya:

- Lingkup: [ringkasan lingkup]
- Investasi: [harga atau skema pembayaran]
- Jadwal: [estimasi waktu pengerjaan]
- Berlaku hingga: [tanggal]

Saya siap menjelaskan detailnya atau menyesuaikan penawaran dengan kebutuhan {{business_name}}.

[Jadwalkan pembahasan penawaran]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'proposal-en',
    type: 'Penawaran',
    lang: 'en',
    name: 'Send a proposal',
    subject: 'Our proposal for {{business_name}}',
    body: `::Proposal
# Fixed scope. _Fixed price_.

Hi {{business_name}} team,

Following our conversation, our proposal for [scope] is attached. In short:

- Scope: [summary]
- Investment: [price or payment model]
- Timeline: [estimated delivery]
- Valid until: [date]

Happy to walk through the details or adjust it to fit {{business_name}}.

[Book a review call]({{cta_url}})

${SIGN_EN}`,
  },
  {
    id: 'proposal-followup-id',
    type: 'Penawaran',
    lang: 'id',
    name: 'Follow-up penawaran',
    subject: 'Re: Penawaran untuk {{business_name}}',
    body: `::Penawaran
# Ada yang perlu _disesuaikan_?

Yth. Tim {{business_name}},

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
    subject: 'Ringkasan pertemuan dan langkah selanjutnya',
    body: `::Ringkasan pertemuan
# Terima kasih atas _waktunya_.

Yth. Tim {{business_name}},

Berikut ringkasan pembahasan kita hari ini.

Kebutuhan utama:

- [poin 1]
- [poin 2]

---

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
    subject: 'Recap and next steps',
    body: `::Meeting recap
# Thanks for your _time_ today.

Hi {{business_name}} team,

Here's a quick recap of what we discussed.

Key needs:

- [point 1]
- [point 2]

---

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
    body: `::Insight
# Tiga hal yang membedakan _tim yang cepat_.

Yth. Tim {{business_name}},

Saya baru menyusun [laporan/checklist/artikel] tentang [topik relevan untuk {{category}}], dan rasanya bisa berguna untuk tim {{business_name}}.

- [insight 1]
- [insight 2]
- [insight 3]

Versi lengkapnya bisa dibaca melalui tautan di bawah. Jika ada pertanyaan, silakan balas email ini.

[Baca selengkapnya]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'value-en',
    type: 'Nilai tambah',
    lang: 'en',
    name: 'Share an insight / resource',
    subject: 'Something useful for {{category}} teams',
    body: `::Insight
# Three things _faster teams_ do differently.

Hi {{business_name}} team,

I recently put together a [report/checklist/article] on [topic relevant to {{category}}] and thought it might help your team.

- [insight 1]
- [insight 2]
- [insight 3]

The full version is linked below. If you have questions, just reply to this email.

[Read the full piece]({{cta_url}})

${SIGN_EN}`,
  },

  // ── Re-engagement ─────────────────────────────────────────────────────────
  {
    id: 'reengage-id',
    type: 'Re-engagement',
    lang: 'id',
    name: 'Menghubungi kembali prospek lama',
    subject: 'Pembaruan untuk {{business_name}}',
    body: `::Pembaruan
# Ada yang _berubah_ sejak terakhir kita bicara.

Yth. Tim {{business_name}},

Beberapa waktu lalu kita sempat berdiskusi tentang [topik]. Sejak itu, kami telah:

- [pembaruan 1, mis. meluncurkan fitur baru]
- [pembaruan 2, mis. menurunkan biaya implementasi]

Mengingat kebutuhan {{business_name}} yang sempat dibahas, mungkin ini saat yang tepat untuk berdiskusi lagi.

[Atur ulang diskusi]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'reengage-en',
    type: 'Re-engagement',
    lang: 'en',
    name: 'Re-engage a past prospect',
    subject: 'An update for {{business_name}}',
    body: `::Update
# A few things have _changed_ since we last spoke.

Hi {{business_name}} team,

We spoke a while ago about [topic]. Since then we have:

- [update 1, e.g. launched a new feature]
- [update 2, e.g. lowered implementation cost]

Given what you shared about {{business_name}}'s needs, it may be a good time to pick the conversation back up.

[Reconnect]({{cta_url}})

${SIGN_EN}`,
  },

  // ── Referral ──────────────────────────────────────────────────────────────
  {
    id: 'referral-id',
    type: 'Referral',
    lang: 'id',
    name: 'Menanyakan kontak yang tepat',
    subject: 'Siapa yang menangani [bidang] di {{business_name}}?',
    body: `::Pertanyaan singkat
# Bolehkah saya minta _diarahkan_?

Yth. Tim {{business_name}},

Saya ingin menghubungi pihak yang bertanggung jawab atas [bidang, mis. pengadaan, operasional, atau IT] di {{business_name}}.

Apakah Bapak/Ibu berkenan mengarahkan saya ke orang yang tepat? Terima kasih banyak atas bantuannya.

${SIGN_ID}`,
  },
  {
    id: 'referral-en',
    type: 'Referral',
    lang: 'en',
    name: 'Ask for the right contact',
    subject: 'Who handles [area] at {{business_name}}?',
    body: `::Quick question
# Could you point me in the _right direction_?

Hi {{business_name}} team,

I'm trying to reach whoever looks after [area, e.g. procurement, operations or IT] at {{business_name}}.

Would you mind pointing me to the right person? Thank you.

${SIGN_EN}`,
  },

  // ── Undangan event ────────────────────────────────────────────────────────
  {
    id: 'event-id',
    type: 'Undangan event',
    lang: 'id',
    name: 'Undangan webinar / acara',
    subject: 'Undangan: [nama acara]',
    body: `::Undangan
# [Nama acara]: _[topik utama]_.

Yth. Tim {{business_name}},

Kami mengundang Bapak/Ibu untuk hadir di [webinar/diskusi] tentang [topik], khusus untuk pelaku {{category}}.

- Tanggal: [tanggal]
- Waktu: [jam] WIB
- Tempat: [online atau lokasi di {{city}}]
- Pembicara: [nama dan jabatan]

Pendaftaran tidak dipungut biaya.

[Daftar sekarang]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'event-en',
    type: 'Undangan event',
    lang: 'en',
    name: 'Webinar / event invite',
    subject: 'Invitation: [event name]',
    body: `::Invitation
# [Event name]: _[main topic]_.

Hi {{business_name}} team,

We'd like to invite you to a [webinar/roundtable] on [topic] for {{category}} teams.

- Date: [date]
- Time: [time]
- Where: [online or venue in {{city}}]
- Speaker: [name and title]

Registration is free.

[Register]({{cta_url}})

${SIGN_EN}`,
  },

  // ── Kemitraan ─────────────────────────────────────────────────────────────
  {
    id: 'partner-id',
    type: 'Kemitraan',
    lang: 'id',
    name: 'Ajakan kemitraan / kerja sama',
    subject: 'Peluang kemitraan dengan {{business_name}}',
    body: `::Kemitraan
# Pelanggan yang sama. _Produk yang saling melengkapi_.

Yth. Tim {{business_name}},

[Perusahaan Anda] dan {{business_name}} melayani pelanggan yang serupa di sektor {{category}}. Kami melihat peluang kerja sama dalam beberapa bentuk:

- [Model 1, mis. saling merujuk klien]
- [Model 2, mis. paket layanan gabungan]
- [Model 3, mis. kampanye pemasaran bersama]

Apakah Bapak/Ibu terbuka untuk diskusi awal? Saya bisa menyiapkan gambaran model kerja samanya terlebih dahulu.

[Atur diskusi awal]({{cta_url}})

${SIGN_ID}`,
  },
  {
    id: 'partner-en',
    type: 'Kemitraan',
    lang: 'en',
    name: 'Partnership proposal',
    subject: 'A partnership idea for {{business_name}}',
    body: `::Partnership
# Same customers. _Complementary products_.

Hi {{business_name}} team,

[Your company] and {{business_name}} serve similar {{category}} customers. We see a few ways to work together:

- [Model 1, e.g. client referrals]
- [Model 2, e.g. a bundled offer]
- [Model 3, e.g. joint marketing]

Would you be open to an exploratory chat? I can share a draft of how it could work beforehand.

[Set up a first chat]({{cta_url}})

${SIGN_EN}`,
  },

  // ── Terima kasih ──────────────────────────────────────────────────────────
  {
    id: 'thanks-id',
    type: 'Terima kasih',
    lang: 'id',
    name: 'Terima kasih & onboarding klien baru',
    subject: 'Selamat bergabung, {{business_name}}',
    body: `::Selamat bergabung
# Terima kasih atas _kepercayaannya_.

Yth. Tim {{business_name}},

Terima kasih telah mempercayakan [proyek/layanan] kepada [Perusahaan Anda]. Berikut langkah awal kita:

- [Langkah 1, mis. kick-off meeting pada tanggal tertentu]
- [Langkah 2]
- [Langkah 3]

Kontak utama Bapak/Ibu adalah [nama PIC] ([email/telepon]). Jangan ragu menghubungi kami kapan saja.

${SIGN_ID}`,
  },
  {
    id: 'thanks-en',
    type: 'Terima kasih',
    lang: 'en',
    name: 'Thank you & onboarding',
    subject: 'Welcome aboard, {{business_name}}',
    body: `::Welcome aboard
# Thank you for your _trust_.

Hi {{business_name}} team,

Thank you for choosing [Your company] for [project/service]. Here's how we'll get started:

- [Step 1, e.g. kick-off call on a set date]
- [Step 2]
- [Step 3]

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
    body: `::Penutup
# Email _terakhir_ dari saya.

Yth. Tim {{business_name}},

Saya belum mendapat kabar, jadi saya asumsikan topik ini belum menjadi prioritas saat ini, dan itu sangat wajar.

Ini email terakhir saya agar tidak mengganggu. Jika di kemudian hari {{business_name}} membutuhkan [solusi Anda], saya siap membantu kapan saja.

${SIGN_ID}`,
  },
  {
    id: 'breakup-en',
    type: 'Penutup',
    lang: 'en',
    name: 'Breakup email',
    subject: 'Should I close your file?',
    body: `::Closing the loop
# My _last_ note on this.

Hi {{business_name}} team,

I haven't heard back, so I'll assume this isn't a priority right now, which is completely understandable.

This is my last note so I don't crowd your inbox. If {{business_name}} ever needs [your solution], I'm one reply away.

${SIGN_EN}`,
  },
];

/** What a new workspace starts with: a short Indonesian outreach sequence. */
export const LIBRARY_STARTERS = ['intro-id', 'followup1-id', 'meeting-id', 'proposal-id', 'breakup-id'].map((id) => {
  const t = TEMPLATE_LIBRARY.find((x) => x.id === id)!;
  return { name: t.name, subject: t.subject, body: t.body };
});
