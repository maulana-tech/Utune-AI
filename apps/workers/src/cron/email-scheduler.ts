/**
 * Email Scheduler Cron
 *
 * Every 15 minutes, sends email_outreach drafts whose scheduledFor has passed,
 * through the shared mailer (EMAIL_PROVIDER: gmail via Composio by default,
 * resend, or smtp) with each workspace's own keys.
 */
import { sendDueEmails } from '@repo/db';

async function run() {
  try {
    const { sent, failed } = await sendDueEmails(process.env);
    if (sent || failed) console.log(`[Email Scheduler] sent ${sent}, failed ${failed}`);
  } catch (error) {
    console.error('[Email Scheduler] Error:', error);
  }
}

// Run every 15 minutes
setInterval(run, 15 * 60 * 1000);

// Run immediately on start
run();

export { run };
