# 🔧 Resend Setup Guide

## Quick Start Checklist

- [x] API Key configured: `re_YOUR_API_KEY_HERE`
- [x] From email: `hello@yourdomain.com`
- [ ] Domain verification
- [ ] DNS records (SPF, DKIM)
- [ ] Webhook configuration

---

## 1. Verify Domain

### Steps:

1. **Login to Resend**: https://resend.com/domains

2. **Add Domain**: `yourdomain.com`

3. **Add DNS Records** (from Resend dashboard):

   **SPF Record:**
   ```
   Type: TXT
   Name: @
   Value: v=spf1 include:_spf.resend.com ~all
   ```

   **DKIM Record (example):**
   ```
   Type: TXT
   Name: resend._domainkey
   Value: [value provided by Resend]
   ```

4. **Verify**: Click "Verify" button in Resend dashboard

### Check Verification:

```bash
# Check SPF
dig yourdomain.com TXT

# Check DKIM
dig resend._domainkey.yourdomain.com TXT
```

---

## 2. Configure Webhook

### Production Webhook URL:

```
https://api.yourdomain.com/webhooks/resend
```

**Or if deployed separately:**
```
https://your-api-domain.com/webhooks/resend
```

### Setup Steps:

1. **Go to Webhooks**: https://resend.com/webhooks

2. **Add Endpoint**: Click "Add Endpoint"

3. **Enter URL**: `https://api.yourdomain.com/webhooks/resend`

4. **Select Events**:
   - ✅ email.sent
   - ✅ email.delivered
   - ✅ email.delivery_delayed
   - ✅ email.opened
   - ✅ email.clicked
   - ✅ email.bounced
   - ✅ email.complained

5. **Save**: Resend will send a test webhook

### Test Webhook Locally:

If testing locally, use ngrok:

```bash
# Terminal 1: Start API
cd apps/api
pnpm dev

# Terminal 2: Start ngrok
ngrok http 3001

# Use ngrok URL in Resend webhook config
https://abc123.ngrok.io/webhooks/resend
```

---

## 3. Test Email Sending

### Via API:

```bash
# Replace {leadId} and {workspaceId} with actual values
curl -X POST "http://localhost:3001/leads/{leadId}/send-email?workspaceId={workspaceId}" \
  -H "Content-Type: application/json" \
  -d '{
    "toEmail": "test@example.com",
    "subject": "Test Email",
    "body": "<p>This is a test email from the system.</p>"
  }'
```

### Expected Response:

```json
{
  "success": true,
  "emailId": "uuid-here"
}
```

### Check Logs:

```bash
# API logs should show:
[EmailService] Email sent successfully
[Resend Webhook] email.sent - Email ID: ...
[Resend Webhook] email.delivered - Email ID: ...
[Resend Webhook] email.opened - Email ID: ... (if opened)
```

---

## 4. Monitor Delivery

### Check Email Status:

```bash
# Get email history for a lead
curl "http://localhost:3001/leads/{leadId}/emails"
```

### Response:

```json
[
  {
    "id": "uuid",
    "toEmail": "test@example.com",
    "subject": "Test Email",
    "status": "delivered",
    "sentAt": "2024-06-02T12:00:00Z",
    "openedAt": "2024-06-02T12:05:00Z",
    "clickedAt": null
  }
]
```

### Resend Dashboard:

View detailed analytics at: https://resend.com/emails

---

## 5. Troubleshooting

### Email Not Sending

**Check 1: API Key**
```bash
# Verify in .env
grep RESEND_API_KEY .env
```

**Check 2: Domain Verification**
```bash
# Check DNS records
dig yourdomain.com TXT
```

**Check 3: From Email**
```bash
# Must match verified domain
# hello@yourdomain.com ✅
# hello@gmail.com ❌
grep RESEND_FROM_EMAIL .env
```

### Webhook Not Receiving

**Check 1: Webhook URL**
- Must be publicly accessible
- Use ngrok for local testing

**Check 2: API Logs**
```bash
# Check if webhook endpoint is hit
grep "Resend Webhook" apps/api/logs/*.log
```

**Check 3: Resend Dashboard**
- Go to https://resend.com/webhooks
- Click on your webhook
- View recent deliveries

### Emails Going to Spam

**Solutions:**
1. ✅ Verify domain with SPF/DKIM
2. ✅ Use verified from email
3. ✅ Avoid spam trigger words
4. ✅ Include unsubscribe link
5. ✅ Warm up sending (start slow)

---

## 6. Sending Limits

### Resend Free Tier:
- **3,000 emails/month**
- All features included
- Webhook support
- $0/month

### When to Upgrade:

| Plan | Price | Emails/Month |
|------|-------|--------------|
| Free | $0 | 3,000 |
| Pro | $20 | 50,000 |
| Business | $250 | 1,000,000 |

---

## 7. Best Practices

### Email Content

✅ **Do:**
- Personalize with lead data
- Keep subject under 50 chars
- Include clear CTA
- Test on mobile
- Add unsubscribe link

❌ **Don't:**
- Use ALL CAPS
- Overuse exclamation marks!!!
- Send without testing
- Ignore bounce rates
- Send too frequently

### Sending Strategy

**Start Slow:**
- Day 1-7: 10-50 emails/day
- Week 2-4: 100-500 emails/day
- Month 2+: Scale up gradually

**Monitor Metrics:**
- Open rate: Target 20-30%
- Click rate: Target 2-5%
- Bounce rate: Keep <2%
- Complaint rate: Keep <0.1%

---

## 8. Quick Reference

### Environment Variables:
```bash
RESEND_API_KEY="re_YOUR_API_KEY_HERE"
RESEND_FROM_EMAIL="hello@yourdomain.com"
```

### Key Endpoints:
- Send: `POST /leads/:id/send-email`
- History: `GET /leads/:id/emails`
- Webhook: `POST /webhooks/resend`
- Templates: `GET /email/templates`
- Sequences: `GET /email/sequences`

### Webhook Events:
- `email.sent` → Update status to 'sent'
- `email.delivered` → Update status to 'delivered'
- `email.opened` → Log openedAt, move to "Engaged"
- `email.clicked` → Log clickedAt
- `email.bounced` → Update status to 'bounced'

---

## ✅ Setup Complete!

Once all steps above are done:
1. Domain verified ✅
2. DNS records configured ✅
3. Webhook configured ✅
4. Test email sent ✅

**System is ready for production email sending! 🚀**

---

## 📞 Support

- **Resend Docs**: https://resend.com/docs
- **API Reference**: https://resend.com/docs/api-reference
- **Status Page**: https://status.resend.com
