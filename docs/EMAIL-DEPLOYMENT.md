# 🚀 Email System - Production Deployment

## Architecture

```
Resend → Webhook → Vercel (optional forwarder) → VPS API → Database
                    OR direct to VPS
```

- **Frontend**: https://utune-ai.vercel.app
- **API**: http://43.129.54.139:3001
- **Resend**: Email delivery service

---

## 📋 Pre-Deployment Checklist

- [x] Phase 1-4 code implemented
- [x] Database migrations applied
- [x] API builds successfully
- [ ] Deploy to VPS
- [ ] Configure Resend webhook
- [ ] Verify domain
- [ ] Test production email

---

## 🚢 Step 1: Deploy to VPS

### 1.1 SSH ke VPS

```bash
ssh ubuntu@43.129.54.139
cd ~/app
```

### 1.2 Pull Latest Code

```bash
git pull origin push-dev
```

### 1.3 Install Dependencies

```bash
pnpm install --frozen-lockfile
```

### 1.4 Build

```bash
pnpm turbo build --filter=api --filter=workers
```

### 1.5 Update .env

Make sure `.env` has:

```bash
RESEND_API_KEY="re_YOUR_API_KEY_HERE"
RESEND_FROM_EMAIL="hello@yourdomain.com"
```

### 1.6 Restart Services

```bash
DOTENV_CONFIG_PATH=/home/ubuntu/app/.env pm2 restart all
```

### 1.7 Verify API

```bash
pm2 logs api --lines 20
curl http://localhost:3001/
```

Expected: `{"statusCode":404,...}` (means API is running)

---

## 🔌 Step 2: Configure Resend Webhook

### Option A: Direct to VPS (Recommended)

**Webhook URL:**
```
http://43.129.54.139:3001/webhooks/resend
```

**Steps:**

1. Login to https://resend.com/webhooks
2. Click "Add Endpoint"
3. Enter URL: `http://43.129.54.139:3001/webhooks/resend`
4. Select events:
   - ✅ email.sent
   - ✅ email.delivered
   - ✅ email.opened
   - ✅ email.clicked
   - ✅ email.bounced
5. Click "Save"

**Pros:**
- ✅ Simple
- ✅ Direct connection
- ✅ Lower latency

**Cons:**
- ❌ HTTP only (not HTTPS)
- ❌ VPS IP exposed

---

### Option B: Via Vercel Forwarder (HTTPS)

**Webhook URL:**
```
https://utune-ai.vercel.app/api/webhooks/resend
```

**Steps:**

1. Deploy Vercel forwarder (already created in `apps/web/src/app/api/webhooks/resend/route.ts`)
2. Push to main branch → Vercel auto-deploy
3. Configure webhook in Resend with Vercel URL
4. Vercel forwards to VPS API

**Pros:**
- ✅ HTTPS (secure)
- ✅ No VPS IP exposed
- ✅ Vercel edge network

**Cons:**
- ❌ Extra hop (Vercel → VPS)
- ❌ Slightly higher latency

---

## 🌐 Step 3: Verify Domain

### 3.1 Add Domain to Resend

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `yourdomain.com`

### 3.2 Add DNS Records

Resend will provide DNS records. Add to your DNS provider (e.g., Cloudflare):

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Records:**
```
Type: TXT
Name: resend._domainkey
Value: [value from Resend dashboard]
```

**Example (Cloudflare):**

| Type | Name | Content |
|------|------|---------|
| TXT | @ | v=spf1 include:_spf.resend.com ~all |
| TXT | resend._domainkey | k=rsa; p=MIGfMA0GCS... |

### 3.3 Verify

1. Wait 5-10 minutes for DNS propagation
2. Click "Verify" in Resend dashboard
3. Status should show "Verified" ✅

### 3.4 Check DNS (optional)

```bash
dig yourdomain.com TXT
dig resend._domainkey.yourdomain.com TXT
```

---

## 🧪 Step 4: Test Production Email

### 4.1 Get Lead ID

Login to https://utune-ai.vercel.app and:
1. Go to Dashboard
2. Select a lead with email
3. Copy lead ID from URL or inspect

### 4.2 Get Workspace ID

From browser console:
```javascript
localStorage.getItem('workspaceId')
```

### 4.3 Test API Call

Replace `{leadId}` and `{workspaceId}`:

```bash
curl -X POST "http://43.129.54.139:3001/leads/{leadId}/send-email?workspaceId={workspaceId}" \
  -H "Content-Type: application/json" \
  -d '{
    "toEmail": "your-email@gmail.com",
    "subject": "Test Email from Production",
    "body": "<h1>Hello!</h1><p>This is a test email from the system.</p>"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "emailId": "uuid-here"
}
```

### 4.4 Check VPS Logs

```bash
ssh ubuntu@43.129.54.139
pm2 logs api | grep -E "EmailService|Resend"
```

Expected:
```
[EmailService] Email sent successfully
[Resend Webhook] email.sent - Email ID: ...
[Resend Webhook] email.delivered - Email ID: ...
```

### 4.5 Check Resend Dashboard

https://resend.com/emails

Should show:
- Email sent
- Delivery status
- Opens (if you open the email)

---

## 🎯 Step 5: Test via UI

### 5.1 Login to App

https://utune-ai.vercel.app/dashboard

### 5.2 Select Lead

Click on a lead that has an email address

### 5.3 Generate Email

1. Click "Generate Outreach Draft"
2. AI generates email
3. Click "**Send Email**" button (new!)
4. Should see "Email sent successfully!"

### 5.4 Check Email History

Scroll down in lead panel → should see "Email History" section with:
- Subject
- Recipient
- Status badge (green = sent)
- Timestamp

### 5.5 Test Open Tracking

1. Open the email you received
2. Wait 5-10 seconds
3. Refresh lead panel in UI
4. Should see "✓ Opened" indicator

---

## 📊 Step 6: Monitor Production

### Check Logs

```bash
# API logs
ssh ubuntu@43.129.54.139
pm2 logs api --lines 50

# Filter email-related logs
pm2 logs api | grep -E "EmailService|Resend|Webhook"

# Workers logs (for cron jobs)
pm2 logs workers | grep "Email Scheduler"
```

### Check Database

```sql
-- Connect to Supabase
psql $DATABASE_URL

-- Check sent emails
SELECT 
  id, 
  to_email, 
  subject, 
  status, 
  sent_at, 
  opened_at 
FROM email_outreach 
ORDER BY created_at DESC 
LIMIT 10;

-- Check email templates
SELECT id, name, subject 
FROM email_templates;

-- Check active sequences
SELECT id, name, active 
FROM email_sequences;
```

### Resend Dashboard

https://resend.com/dashboard

Metrics to monitor:
- **Delivery rate**: Should be >95%
- **Open rate**: Target 20-30%
- **Bounce rate**: Should be <2%
- **Complaint rate**: Should be <0.1%

---

## 🔄 Step 7: Setup Cron Jobs

Email scheduler cron runs every hour (already in code).

Verify it's running:

```bash
ssh ubuntu@43.129.54.139
pm2 logs workers | grep "Email Scheduler"
```

Expected (every hour):
```
[Email Scheduler] Starting email scheduler cron...
[Email Scheduler] Processing scheduled emails...
[Email Scheduler] Processing sequence steps...
[Email Scheduler] Email scheduler cron completed
```

To manually trigger:

```bash
curl -X POST "http://43.129.54.139:3001/email/sequences/process-due-steps"
```

---

## 🐛 Troubleshooting

### Email Not Sending

**1. Check API Key**
```bash
ssh ubuntu@43.129.54.139
grep RESEND_API_KEY ~/app/.env
```

**2. Check Domain Verification**
```bash
# Should return "Verified"
curl https://api.resend.com/domains \
  -H "Authorization: Bearer re_YOUR_API_KEY_HERE"
```

**3. Check API Logs**
```bash
pm2 logs api | grep -i "error"
```

### Webhook Not Working

**1. Test Webhook Endpoint**
```bash
curl -X POST http://43.129.54.139:3001/webhooks/resend \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.opened",
    "data": {
      "email_id": "test-123",
      "created_at": "2024-01-01T00:00:00Z"
    }
  }'
```

Expected: `{"success":true}`

**2. Check Resend Webhook Deliveries**
- Go to https://resend.com/webhooks
- Click on your webhook
- View recent deliveries
- Check for errors

**3. Check Firewall**
```bash
ssh ubuntu@43.129.54.139
sudo ufw status
```

Make sure port 3001 is open.

### Emails Going to Spam

**Solutions:**

1. ✅ Verify domain with SPF/DKIM
2. ✅ Use proper from email (`hello@yourdomain.com`)
3. ✅ Warm up sending (start with 10-50 emails/day)
4. ✅ Monitor bounce rate
5. ✅ Add unsubscribe link

### High Bounce Rate

**Check:**
- Email validation before sending
- Use only verified email addresses
- Remove bounced emails from list

```sql
-- Get bounced emails
SELECT to_email, error_message 
FROM email_outreach 
WHERE status = 'bounced'
ORDER BY created_at DESC;
```

---

## 📈 Success Metrics

After deployment, monitor:

| Metric | Target | Actual |
|--------|--------|--------|
| Delivery Rate | >95% | Check Resend |
| Open Rate | 20-30% | Check Resend |
| Click Rate | 2-5% | Check Resend |
| Bounce Rate | <2% | Check Resend |
| API Uptime | 99.9% | Check PM2 |

---

## 🔒 Security Checklist

- [x] RESEND_API_KEY in .env (not exposed)
- [x] Webhook endpoint secured
- [x] CORS configured (`ALLOWED_ORIGINS`)
- [x] Firewall rules (only port 3001)
- [ ] Rate limiting (optional)
- [ ] Webhook signature verification (optional)

---

## 🚀 Production Ready!

Once all steps complete:

✅ **Backend deployed to VPS**
✅ **Webhook configured**
✅ **Domain verified**
✅ **Test email sent**
✅ **Monitoring active**

**System is LIVE and ready for production use! 🎉**

---

## 📞 Support

**Resend Issues:**
- Dashboard: https://resend.com
- Docs: https://resend.com/docs
- Status: https://status.resend.com

**VPS Issues:**
```bash
ssh ubuntu@43.129.54.139
pm2 status
pm2 logs
```

**App Issues:**
- GitHub: https://github.com/maulana-tech/finetune-agent/issues
