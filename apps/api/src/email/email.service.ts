import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db, emailOutreach } from '@repo/db';

/**
 * Resend delivery/open/click webhook bookkeeping. Sending itself lives in the shared
 * mailer (@repo/db `deliverEmail`, EMAIL_PROVIDER=resend); it stores Resend's message
 * id in email_outreach.resendEmailId, which these methods match on.
 */
@Injectable()
export class EmailService {
  async updateEmailStatus(resendEmailId: string, status: string) {
    const result = await db
      .update(emailOutreach)
      .set({ status })
      .where(eq(emailOutreach.resendEmailId, resendEmailId))
      .returning();

    if (result.length === 0) {
      console.warn(`[EmailService] No email found with resendEmailId: ${resendEmailId}`);
    }

    return result[0];
  }

  async markEmailOpened(resendEmailId: string) {
    const result = await db
      .update(emailOutreach)
      .set({
        openedAt: new Date(),
        status: 'delivered', // Ensure status is at least 'delivered' if opened
      })
      .where(eq(emailOutreach.resendEmailId, resendEmailId))
      .returning();

    if (result.length > 0) {
      // Auto-update lead pipeline stage to "Engaged"
      const { db: dbInstance, leads } = await import('@repo/db');
      await dbInstance
        .update(leads)
        .set({ pipelineStage: 'Engaged' })
        .where(eq(leads.id, result[0].leadId));

      console.log(`[EmailService] Lead ${result[0].leadId} moved to "Engaged" stage`);
    }

    return result[0];
  }

  async markEmailClicked(resendEmailId: string) {
    const result = await db
      .update(emailOutreach)
      .set({ clickedAt: new Date() })
      .where(eq(emailOutreach.resendEmailId, resendEmailId))
      .returning();

    return result[0];
  }
}
