import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { SequencesService } from './sequences.service';
import { SequencesController } from './sequences.controller';

@Module({
  controllers: [TemplatesController, SequencesController],
  providers: [MailService, TemplatesService, SequencesService],
  exports: [MailService, TemplatesService, SequencesService],
})
export class EmailModule {}
