# Setup Supabase

Aplikasi ini memakai Supabase untuk dua hal:

| Dipakai untuk | Lewat | Siapa yang memakai |
|---|---|---|
| **Login** (email + password) | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web (Vercel) |
| **Database Postgres** (semua data aplikasi) | `DATABASE_URL`, koneksi langsung dengan Drizzle | Web (Vercel) dan API + worker (VPS) |

Aplikasi **tidak** memakai Supabase Data API (REST/`supabase.from(...)`), Storage, maupun Realtime. Karena itu Data API dikunci (bagian 5), supaya anon key yang publik tidak bisa dipakai membaca data.

User dan workspace tidak disimpan di tabel bawaan Supabase. Saat seseorang login pertama kali, aplikasi otomatis membuat baris `workspaces` dan `users` di database sendiri, dicocokkan lewat email (`apps/web/src/lib/get-workspace.ts`, `apps/web/src/app/auth/callback/route.ts`).

---

## 1. Buat project

1. Masuk ke [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Isi:
   - **Name:** bebas, mis. `utune-prod`.
   - **Database password:** buat yang kuat, **simpan** (dipakai di `DATABASE_URL`). Hindari karakter `@ : / ? #` supaya tidak perlu di-encode di URL.
   - **Region:** **Southeast Asia (Singapore)**, paling dekat dengan Indonesia. Region tidak bisa diganti setelah dibuat.
3. Tunggu sampai status project **Healthy** (1–2 menit).

Untuk dev dan produksi sebaiknya dua project terpisah, supaya data uji tidak bercampur.

## 2. Ambil kredensial

### URL dan key untuk login

**Project Settings → API Keys** (atau tombol **Connect** di atas dashboard):

| Ambil | Masuk ke |
|---|---|
| Project URL (`https://<ref>.supabase.co`) | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / **publishable** key (`eyJ…` atau `sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

Jangan pernah memakai `service_role` / **secret** key di aplikasi ini. Aplikasi tidak membutuhkannya, dan key itu melewati semua aturan keamanan.

### Connection string database

Klik **Connect** → tab **Connection string** → pilih **URI**. Ada tiga jenis, pakai yang sesuai:

| Jenis | Port | Pakai untuk | Kenapa |
|---|---|---|---|
| **Session pooler** | 5432 | **VPS** (`.env` di server) dan menjalankan `db push` | Proses yang hidup terus; mendukung semua perintah, termasuk perubahan schema |
| **Transaction pooler** | 6543 | **Vercel** | Fungsi serverless membuka banyak koneksi singkat; pooler ini yang dirancang untuk itu |
| Direct connection | 5432 | Tidak dipakai | Hanya lewat IPv6 (kebanyakan VPS dan Vercel butuh IPv4, kecuali beli add-on IPv4) |

Bentuknya:

```
# Session pooler (VPS)
postgresql://postgres.<ref>:<PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
# Transaction pooler (Vercel)
postgresql://postgres.<ref>:<PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
```

Ganti `<PASSWORD>` dengan password database dari langkah 1. Username pooler memang `postgres.<ref>`, bukan `postgres` saja.

## 3. Isi environment variables

| Variabel | Lokal (`.env`) | VPS (`~/app/.env`) | Vercel |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✓ | | ✓ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✓ | | ✓ |
| `DATABASE_URL` | session pooler, atau Postgres lokal (Docker) | **session pooler** | **transaction pooler** |

Untuk dev lokal boleh memakai Supabase untuk login tapi database Postgres lokal (Docker): data user dicocokkan lewat email, jadi keduanya tidak harus di tempat yang sama.

Di Vercel, setelah menambah atau mengubah variabel, lakukan **Redeploy** karena `NEXT_PUBLIC_*` dibaca saat build.

## 4. Buat tabel

Tabel dibuat dari kode (`packages/db/src/schema/`) dengan `drizzle-kit push`, tidak ada file migrasi.

- **Otomatis:** `deploy/setup-vps.sh` dan setiap deploy GitHub Actions menjalankan `db push` lalu `rls` memakai `DATABASE_URL` di VPS.
- **Manual** (pertama kali, atau dari laptop), dengan `DATABASE_URL` session pooler di `.env`:

  ```bash
  pnpm --filter @repo/db push   # buat / perbarui tabel
  pnpm --filter @repo/db rls    # kunci Data API (bagian 5)
  ```

Cek di **Table Editor**: harus ada 15 tabel, antara lain `workspaces`, `users`, `leads`, `jobs`, `email_templates`, `email_outreach`, `workspace_api_keys`.

`db push` aman untuk perubahan yang menambah tabel atau kolom. Kalau sebuah perubahan akan menghapus atau mengganti kolom, drizzle berhenti dan meminta konfirmasi. Jalankan manual setelah memastikan datanya aman.

## 5. Kunci Data API (wajib)

Anon key ikut terkirim ke browser (`NEXT_PUBLIC_…`). Tanpa pengamanan, siapa pun yang memegangnya bisa membaca dan mengubah semua tabel lewat `https://<ref>.supabase.co/rest/v1/...`, karena tabel buatan Drizzle tidak punya Row Level Security (RLS).

1. **Nyalakan RLS di semua tabel:** `pnpm --filter @repo/db rls` (sudah otomatis di setiap deploy). RLS menyala tanpa policy berarti Data API tidak melihat baris apa pun. Aplikasi tidak terpengaruh, karena terhubung sebagai role `postgres` yang tidak terkena RLS.
2. **Opsional, lebih ketat:** **Project Settings → Data API**, matikan Data API atau hapus `public` dari **Exposed schemas**. Aplikasi tidak memakainya.
3. **Cek:**

   ```bash
   curl "https://<ref>.supabase.co/rest/v1/leads?select=*" \
     -H "apikey: <anon key>" -H "Authorization: Bearer <anon key>"
   ```

   Hasil yang benar: `[]` atau error. Kalau muncul data lead, RLS belum menyala; jalankan langkah 1 lagi.

**Security Advisor** di dashboard (Advisors → Security) juga akan memberi peringatan "RLS disabled" kalau ada tabel yang terlewat.

## 6. Setup login (Authentication)

### Provider email

**Authentication → Sign In / Providers → Email**:

- **Enable Email provider:** on.
- **Confirm email:** on (disarankan). User baru harus mengklik link di email sebelum bisa login.
- **Secure password change / minimum password length:** sesuaikan; minimal 8 karakter disarankan.

Kalau aplikasinya hanya untuk tim internal, matikan **Allow new users to sign up** (Authentication → Sign In / Providers), lalu buat akun lewat **Authentication → Users → Add user → Create new user** (isi email + password, centang **Auto Confirm User**).

### URL Configuration

**Authentication → URL Configuration**:

- **Site URL:** domain web produksi, mis. `https://utune-ai.vercel.app`.
- **Redirect URLs** (tambahkan semuanya):

  ```
  https://utune-ai.vercel.app/auth/callback
  https://*-<tim-vercel>.vercel.app/auth/callback   # preview deployment, opsional
  http://localhost:3000/auth/callback               # dev lokal
  ```

Link konfirmasi email diarahkan ke `/auth/callback`, yang menukar kode menjadi session lalu membuka `/dashboard`. Kalau URL itu tidak ada di daftar, Supabase mengalihkan ke Site URL dan user tidak ikut login.

### SMTP untuk email login (penting untuk produksi)

Pengirim email bawaan Supabase hanya untuk uji coba: kuotanya sangat kecil per jam dan hanya mengirim ke anggota tim project. Untuk email konfirmasi user sungguhan, pakai SMTP sendiri. Resend paling mudah karena sudah dipakai aplikasi ini:

**Project Settings → Authentication → SMTP Settings → Enable custom SMTP**:

| Field | Isi |
|---|---|
| Sender email | alamat di domain yang sudah diverifikasi di Resend, mis. `halo@using-it.tech` |
| Sender name | nama brand, mis. `Using` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | API key Resend (`re_…`) |

Setelah itu naikkan **Rate limit for sending emails** di **Authentication → Rate Limits** sesuai kebutuhan.

### Template email (opsional)

**Authentication → Emails → Templates → Confirm signup**: teks boleh diubah, tapi link harus tetap memakai `{{ .ConfirmationURL }}`.

## 7. Cek akhir

1. Buka web → **Sign up** dengan email asli → email konfirmasi masuk (cek Spam).
2. Klik link → harus langsung masuk ke `/dashboard`.
3. Di **Table Editor**, tabel `users` dan `workspaces` masing-masing punya satu baris baru untuk email itu.
4. Logout lalu login lagi dengan password yang sama.
5. Jalankan cek Data API di bagian 5.

## 8. Catatan paket Free

- Project **di-pause otomatis** setelah sekitar seminggu tanpa aktivitas. Buka dashboard → **Restore** untuk menyalakan lagi. Untuk produksi, pakai paket Pro.
- Database 500 MB, tanpa backup harian (backup harian ada di Pro). Untuk cadangan manual: `pg_dump "<session pooler URL>" > backup.sql`.
- Jumlah koneksi pooler terbatas. Satu VPS + Vercel aman untuk pemakaian normal.

## 9. Kalau ada masalah

| Gejala | Penyebab dan solusi |
|---|---|
| Login: **Failed to fetch** | `NEXT_PUBLIC_SUPABASE_URL` salah atau masih placeholder. Di Vercel: perbaiki lalu redeploy. Di lokal: restart dev server |
| Login: **Invalid login credentials** | Password salah, atau akun belum ada |
| Login: **Email not confirmed** | Klik link di email konfirmasi, atau di dashboard: Users → user → Confirm email |
| Email konfirmasi tidak datang | SMTP bawaan sudah habis kuotanya atau penerima bukan anggota tim. Pasang custom SMTP (bagian 6) |
| Klik link konfirmasi tapi tidak ikut login | `/auth/callback` belum ada di Redirect URLs |
| Database: **Tenant or user not found** | Username pooler harus `postgres.<ref>`, bukan `postgres` |
| Database: **password authentication failed** | Password salah, atau ada karakter khusus yang belum di-encode (`@` → `%40`, `#` → `%23`, `/` → `%2F`). Bisa juga reset di Project Settings → Database |
| Database: **self-signed certificate in certificate chain** | SSL enforcement dinyalakan di Supabase. Tambahkan `?sslmode=no-verify` di akhir `DATABASE_URL` |
| Database: **prepared statement … already exists** | Muncul di transaction pooler (6543). Pakai session pooler (5432) untuk proses yang terkena |
| `db push` timeout atau gagal di Vercel/CI | Jalankan `db push` memakai session pooler, bukan transaction pooler |

## Belum tersedia

- **Lupa password:** tombol "Forgot password?" di halaman login belum punya aksi. Sementara ini reset lewat dashboard: **Authentication → Users → user → Send password recovery** atau ubah langsung.
- Login dengan Google / magic link belum diaktifkan di aplikasi.
