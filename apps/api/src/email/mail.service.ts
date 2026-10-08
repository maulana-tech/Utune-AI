import { BadRequestException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, emailOutreach, getWorkspaceKeys, sendAndRecord } from '@repo/db';

interface SendEmailParams {
  leadId: string;
  workspaceId: string;
  toEmail: string;
  subject: string;
  body: string;
  scheduledFor?: Date;
}

/**
 * Thin Nest wrapper around the shared mailer (@repo/db `sendAndRecord`), which picks
 * Gmail (Composio) / Resend / SMTP from EMAIL_PROVIDER and records email_outreach.
 */
@Injectable()
export class MailService {
  async sendEmail(params: SendEmailParams) {
    const env = { ...process.env, ...(await getWorkspaceKeys(params.workspaceId)) };
    try {
      const result = await sendAndRecord(
        {
          workspaceId: params.workspaceId,
          leadId: params.leadId,
          to: params.toEmail,
          subject: params.subject,
          body: params.body,
          scheduledFor: params.scheduledFor,
        },
        env,
      );
      return { success: true, ...result };
    } catch (err) {
      throw new BadRequestException(`Failed to send email: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async getEmailHistory(leadId: string) {
    return db.select().from(emailOutreach).where(eq(emailOutreach.leadId, leadId)).orderBy(emailOutreach.createdAt);
  }
}
