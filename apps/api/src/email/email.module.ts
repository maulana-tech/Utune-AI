import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { SequencesService } from './sequences.service';
import { SequencesController } from './sequences.controller';
import { WebhooksController } from './webhooks.controller';
import { EmailService } from './email.service';

@Module({
  controllers: [TemplatesController, SequencesController, WebhooksController],
  providers: [MailService, EmailService, TemplatesService, SequencesService],
  exports: [MailService, TemplatesService, SequencesService],
})
export class EmailModule {}
