import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import { db, leads } from '@repo/db';
import { TemplatesService } from './templates.service';
import { MailService } from './mail.service';

@Controller('email/templates')
export class TemplatesController {
  constructor(
    private readonly templates: TemplatesService,
    private readonly email: MailService,
  ) {}

  @Get()
  list(@Query('workspaceId') workspaceId: string) {
    return this.templates.list(workspaceId);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.templates.getById(id, workspaceId);
  }

  @Post()
  create(
    @Body() body: { name: string; subject: string; body: string; variables?: string[] },
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.templates.create(body, workspaceId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; subject?: string; body?: string; variables?: string[] },
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.templates.update(id, body, workspaceId);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.templates.delete(id, workspaceId);
  }

  @Post(':id/render')
  async renderTemplate(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() body: { leadId: string },
  ) {
    return this.templates.renderTemplate(id, body.leadId, workspaceId);
  }

  @Post('batch-send')
  async batchSend(
    @Query('workspaceId') workspaceId: string,
    @Body() body: {
      leadIds: string[];
      templateId?: string;
      subject: string;
      body: string;
    },
  ) {
    const results = [];

    for (const leadId of body.leadIds) {
      try {
        // If templateId provided, render it first
        let subject = body.subject;
        let emailBody = body.body;

        if (body.templateId) {
          const rendered = await this.templates.renderTemplate(body.templateId, leadId, workspaceId);
          subject = rendered.subject;
          emailBody = rendered.body;
        }

        // Get lead email
        const [lead] = await db
          .select()
          .from(leads)
          .where(and(eq(leads.id, leadId), eq(leads.workspaceId, workspaceId)))
          .limit(1);

        if (!lead || !lead.emails || lead.emails.length === 0) {
          results.push({ leadId, success: false, error: 'No email address' });
          continue;
        }

        const result = await this.email.sendEmail({
          leadId,
          workspaceId,
          toEmail: lead.emails[0],
          subject,
          body: emailBody,
        });

        results.push({ leadId, success: true, emailId: result.emailId });
      } catch (error) {
        results.push({
          leadId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { results };
  }
}
