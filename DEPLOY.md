# Deploy

Web di **Vercel**, backend (API + worker) di **VPS** lewat PM2. Database Supabase, Redis Upstash atau Redis di VPS.

```
Browser ──HTTPS──► Vercel (Next.js)
                    ├─ server components / server actions ──► Supabase Postgres
                    └─ /api/backend/* (proxy, cek login) ──HTTPS + API_SECRET──► VPS: Caddy ► NestJS API :3001
                                                                                  VPS: worker (BullMQ, cron, Python) ──► Redis, Postgres
Resend ──webhook──► Vercel /api/webhooks/resend (cek tanda tangan Svix) ──► API
```

- Browser **tidak pernah** memanggil API langsung. Semua lewat proxy `apps/web/src/app/api/backend`, yang mengecek sesi Supabase, mengunci `workspaceId` ke workspace user, lalu meneruskan dengan `API_SECRET`.
- API menolak semua request tanpa `API_SECRET` yang benar (kecuali `/health`). Di produksi, tanpa `API_SECRET` API menolak semuanya.

---

## 0. Urutan singkat

1. Siapkan VPS dengan `deploy/setup-vps.sh` (bagian 1).
2. Isi GitHub Secrets untuk deploy otomatis (bagian 2).
3. Isi env Vercel dari `deploy/env.vercel.example` (bagian 3). **Sebelum** merge ke `main`, karena web versi baru butuh `API_URL`, `API_SECRET`, dan `SECRETS_KEY`.
4. Merge ke `main`. GitHub Actions men-deploy backend, Vercel men-deploy web.
5. Daftarkan webhook Resend dan URL Supabase (bagian 4).

## 1. VPS (sekali saja)

Ubuntu 22.04/24.04, minimal 2 GB RAM (4 GB kalau camofox ikut jalan). Siapkan dulu A record subdomain API (mis. `api.domainmu.com`) yang mengarah ke IP VPS.

```bash
# di VPS, sebagai user biasa yang bisa sudo (bukan root)
curl -fsSL https://raw.githubusercontent.com/maulana-tech/Utune-AI/main/deploy/setup-vps.sh -o setup-vps.sh

bash setup-vps.sh --domain api.domainmu.com            # Redis pakai Upstash
# atau
bash setup-vps.sh --domain api.domainmu.com --redis    # Redis di VPS ini
```

Jalankan pertama kali: script memasang Node 22, pnpm, PM2, Python, meng-clone repo ke `~/app`, membuat `~/app/.env` dari `deploy/env.vps.example`, lalu berhenti. Isi `.env` (`nano ~/app/.env`), lalu jalankan perintah yang sama sekali lagi. Run kedua: install dependency, venv Python, build, `db push`, start PM2 (plus auto-start saat reboot), pasang Caddy dengan HTTPS untuk domainnya, dan menyalakan firewall (hanya SSH, 80, 443 yang terbuka).

Script aman dijalankan ulang. Kalau SSH tidak di port 22, buka port itu dulu (`sudo ufw allow <port>/tcp`) sebelum menjalankan script, supaya tidak terkunci.

<details><summary>Manual, tanpa script</summary>

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs python3 python3-venv git
sudo npm i -g pnpm@9.15.0 pm2

git clone https://github.com/maulana-tech/Utune-AI.git ~/app && cd ~/app
cp deploy/env.vps.example .env && nano .env && chmod 600 .env
pnpm install --frozen-lockfile
python3 -m venv apps/workers/.venv
apps/workers/.venv/bin/pip install -r apps/workers/requirements.txt
pnpm turbo build --filter=api --filter=workers
pnpm --filter @repo/db push
pm2 start ecosystem.config.js && pm2 save && pm2 startup
```

HTTPS: pasang [Caddy](https://caddyserver.com/docs/install), salin `deploy/Caddyfile` ke `/etc/caddy/Caddyfile`, ganti domainnya, `sudo systemctl reload caddy`. Redis lokal: `sudo apt-get install -y redis-server`.
</details>

## 2. Deploy otomatis (GitHub Actions)

`.github/workflows/ci-cd.yml`: setiap push ke `main` → build check → SSH ke VPS → `git pull`, `pnpm install`, update venv Python, build, `db push`, `pm2 startOrReload`.

Isi di GitHub → Settings → Secrets and variables → Actions:

- `VPS_HOST`: IP VPS
- `VPS_USERNAME`: user yang menjalankan `setup-vps.sh`
- `VPS_SSH_KEY`: private key SSH yang public key-nya ada di `~/.ssh/authorized_keys` user itu. Buat khusus untuk deploy: `ssh-keygen -t ed25519 -f deploy_key -N ""`, tambahkan `deploy_key.pub` ke VPS, isi secret dengan isi `deploy_key`.

`db push` hanya aman untuk perubahan schema yang menambah (tabel/kolom baru). Kalau perubahan menghapus atau mengganti kolom, drizzle akan berhenti dan minta konfirmasi: jalankan manual di VPS.

## 3. Environment variables

Template lengkap: `deploy/env.vps.example` (VPS) dan `deploy/env.vercel.example` (Vercel). `SECRETS_KEY` dan `API_SECRET` **harus sama persis** di keduanya. Buat sekali: `openssl rand -base64 36`.

| Variabel | VPS (`.env`) | Vercel | Keterangan |
|---|:-:|:-:|---|
| `DATABASE_URL` | ✓ | ✓ | Supabase, pakai connection pooler |
| `REDIS_URL` | ✓ | | |
| `SECRETS_KEY` | ✓ | ✓ | Enkripsi API key BYOK di Settings. Jangan diganti setelah dipakai |
| `API_SECRET` | ✓ | ✓ | Rahasia bersama web → API |
| `API_URL` | | ✓ | `https://api.domainmu.com` (hanya server, bukan `NEXT_PUBLIC_`) |
| `ALLOWED_ORIGINS` | ✓ | | Domain web Vercel |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | | ✓ | Login |
| `EMAIL_PROVIDER` | ✓ | ✓ | `resend`, `gmail`, atau `smtp` |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | ✓ | ✓ | Kalau pakai Resend |
| `RESEND_WEBHOOK_SECRET` | | ✓ | `whsec_…` dari Resend → Webhooks. Tanpa ini webhook ditolak di produksi |
| `GMAIL_COMPOSIO_API_KEY` | ✓ | ✓ | Kalau pakai Gmail (Composio project berisi Gmail pengirim) |
| `EMAIL_BRAND_NAME`, `EMAIL_BRAND_URL`, `EMAIL_BRAND_FOOTER`, `EMAIL_CTA_URL` | ✓ | ✓ | Tampilan email |
| `COMPOSIO_API_KEY` | ✓ | | Apollo, Reddit |
| `APIFY_TOKEN`, `FIRECRAWL_API_KEY`, `SGAI_API_KEY`, `GOOGLE_MAPS_API_KEY`, dst. | ✓ | | Sumber lead & pencari kontak (bisa juga per workspace di Settings) |
| `NVIDIA_API_KEY` | ✓ | | AI (draft email, analisis lead, AI Query) |
| `CAMOFOX_URL` | ✓ | | Opsional, `http://localhost:9377` kalau camofox di PM2 |

Kenapa Vercel butuh variabel email & database: halaman web membaca database langsung, dan tombol **Send email** di Contacts dijalankan oleh server Vercel.

Setelah mengubah `.env` di VPS: `pm2 reload ecosystem.config.js --update-env`. Di Vercel: redeploy.

## 4. Setelah deploy

- **Resend webhook:** Resend → Webhooks → endpoint `https://<domain-web>/api/webhooks/resend`, event `email.*`. Salin signing secret ke `RESEND_WEBHOOK_SECRET` di Vercel.
- **Supabase Auth:** Authentication → URL Configuration → Site URL = domain web, tambahkan `https://<domain-web>/auth/callback` ke Redirect URLs.
- **Cek:** `curl https://api.domainmu.com/health` → 200; `curl https://api.domainmu.com/leads/search` → 401 (artinya API terkunci); login di web lalu jalankan satu scrape.
- **Log:** `pm2 logs workers`, `pm2 logs api`.
