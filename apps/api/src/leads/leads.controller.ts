import { Controller, Get, Post, Put, Delete, Param, Query, Body } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { MailService } from '../email/mail.service';

@Controller('leads')
export class LeadsController {
  constructor(
    private readonly leads: LeadsService,
    private readonly email: MailService,
  ) {}

  @Get()
  list(@Query('workspaceId') workspaceId: string) {
    return this.leads.list(workspaceId);
  }

  @Get('scores')
  scores(@Query('workspaceId') workspaceId: string) {
    return this.leads.scores(workspaceId);
  }

  @Get('search')
  search(
    @Query('workspaceId') workspaceId: string,
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ) {
    return this.leads.search(workspaceId, q ?? '', limit ? parseInt(limit, 10) : 20);
  }

  @Get(':id')
  getById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.leads.getById(id, workspaceId);
  }

  @Post(':id/analyze')
  analyze(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.leads.analyze(id, workspaceId);
  }

  @Post(':id/email')
  generateEmail(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.leads.generateEmail(id, workspaceId);
  }

  @Post(':id/send-email')
  async sendEmail(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() body: {
      toEmail: string;
      subject: string;
      body: string;
      scheduledFor?: string; // ISO date string
    },
  ) {
    return this.email.sendEmail({
      leadId: id,
      workspaceId,
      toEmail: body.toEmail,
      subject: body.subject,
      body: body.body,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    });
  }

  @Get(':id/emails')
  getEmailHistory(@Param('id') id: string) {
    return this.email.getEmailHistory(id);
  }

  @Get(':id/insights')
  getInsights(@Param('id') id: string) {
    return this.leads.getInsights(id);
  }

  @Get(':id/notes')
  getNotes(@Param('id') id: string) {
    return this.leads.getNotes(id);
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() body: { content: string; author: string },
  ) {
    return this.leads.addNote(id, workspaceId, body.content, body.author);
  }

  @Delete('note/:noteId')
  deleteNote(
    @Param('noteId') noteId: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.leads.deleteNote(noteId, workspaceId);
  }

  @Post()
  create(
    @Body() body: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.leads.create(body, workspaceId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.leads.update(id, body, workspaceId);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.leads.delete(id, workspaceId);
  }
}
