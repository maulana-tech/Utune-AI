import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { EmailService } from './email.service';

interface ResendWebhookPayload {
  type: string;
  created_at: string;
  data: {
    created_at: string;
    email_id: string;
    from: string;
    to: string[];
    subject?: string;
  };
}

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly emailService: EmailService) {}

  // Signature (Svix) is verified by the web route that receives Resend's call
  // (apps/web/src/app/api/webhooks/resend); it forwards here with API_SECRET.
  @Post('resend')
  @HttpCode(200)
  async handleResendWebhook(
    @Body() payload: ResendWebhookPayload,
  ) {
    const { type, data } = payload;

    console.log(`[Resend Webhook] ${type} - Email ID: ${data.email_id}`);

    try {
      switch (type) {
        case 'email.sent':
          await this.emailService.updateEmailStatus(data.email_id, 'sent');
          break;

        case 'email.delivered':
          await this.emailService.updateEmailStatus(data.email_id, 'delivered');
          break;

        case 'email.delivery_delayed':
          // Keep status as 'sent', just log the delay
          console.log(`[Resend Webhook] Delivery delayed for ${data.email_id}`);
          break;

        case 'email.complained':
        case 'email.bounced':
          await this.emailService.updateEmailStatus(data.email_id, 'bounced');
          break;

        case 'email.opened':
          await this.emailService.markEmailOpened(data.email_id);
          break;

        case 'email.clicked':
          await this.emailService.markEmailClicked(data.email_id);
          break;

        default:
          console.log(`[Resend Webhook] Unhandled event type: ${type}`);
      }

      return { success: true };
    } catch (error) {
      console.error('[Resend Webhook] Error processing webhook:', error);
      // Return 200 anyway to prevent Resend from retrying
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
