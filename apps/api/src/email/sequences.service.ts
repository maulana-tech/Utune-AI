import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, lt } from 'drizzle-orm';
import { db, emailSequences, sequenceEnrollments, leads, emailOutreach } from '@repo/db';
import { MailService } from './mail.service';
import { TemplatesService } from './templates.service';

interface CreateSequenceDto {
  name: string;
  description?: string;
  steps: Array<{
    day: number;
    templateId: string;
    condition?: 'always' | 'not_opened' | 'opened_no_reply' | 'not_replied';
  }>;
}

@Injectable()
export class SequencesService {
  constructor(
    private readonly emailService: MailService,
    private readonly templatesService: TemplatesService,
  ) {}

  async list(workspaceId: string) {
    return db
      .select()
      .from(emailSequences)
      .where(eq(emailSequences.workspaceId, workspaceId))
      .orderBy(emailSequences.createdAt);
  }

  async getById(id: string, workspaceId: string) {
    const [sequence] = await db
      .select()
      .from(emailSequences)
      .where(and(eq(emailSequences.id, id), eq(emailSequences.workspaceId, workspaceId)))
      .limit(1);

    if (!sequence) throw new NotFoundException('Sequence not found');
    return sequence;
  }

  async create(dto: CreateSequenceDto, workspaceId: string) {
    const [sequence] = await db
      .insert(emailSequences)
      .values({
        workspaceId,
        name: dto.name,
        description: dto.description,
        steps: dto.steps,
        active: 'true',
      })
      .returning();

    return sequence;
  }

  async update(id: string, dto: Partial<CreateSequenceDto>, workspaceId: string) {
    const [sequence] = await db
      .update(emailSequences)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(and(eq(emailSequences.id, id), eq(emailSequences.workspaceId, workspaceId)))
      .returning();

    if (!sequence) throw new NotFoundException('Sequence not found');
    return sequence;
  }

  async delete(id: string, workspaceId: string) {
    const [sequence] = await db
      .delete(emailSequences)
      .where(and(eq(emailSequences.id, id), eq(emailSequences.workspaceId, workspaceId)))
      .returning();

    if (!sequence) throw new NotFoundException('Sequence not found');
    return sequence;
  }

  async enrollLead(sequenceId: string, leadId: string, workspaceId: string) {
    const [enrollment] = await db
      .insert(sequenceEnrollments)
      .values({
        sequenceId,
        leadId,
        workspaceId,
        currentStep: 0,
        status: 'active',
      })
      .returning();

    // Immediately trigger step 0 (day 0)
    await this.processEnrollment(enrollment.id);

    return enrollment;
  }

  async pauseEnrollment(enrollmentId: string, workspaceId: string) {
    const [enrollment] = await db
      .update(sequenceEnrollments)
      .set({ status: 'paused' })
      .where(and(eq(sequenceEnrollments.id, enrollmentId), eq(sequenceEnrollments.workspaceId, workspaceId)))
      .returning();

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async resumeEnrollment(enrollmentId: string, workspaceId: string) {
    const [enrollment] = await db
      .update(sequenceEnrollments)
      .set({ status: 'active' })
      .where(and(eq(sequenceEnrollments.id, enrollmentId), eq(sequenceEnrollments.workspaceId, workspaceId)))
      .returning();

    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return enrollment;
  }

  async getEnrollments(sequenceId: string, workspaceId: string) {
    return db
      .select()
      .from(sequenceEnrollments)
      .where(and(eq(sequenceEnrollments.sequenceId, sequenceId), eq(sequenceEnrollments.workspaceId, workspaceId)))
      .orderBy(sequenceEnrollments.enrolledAt);
  }

  /**
   * Process a single enrollment step
   */
  async processEnrollment(enrollmentId: string) {
    const [enrollment] = await db
      .select()
      .from(sequenceEnrollments)
      .where(eq(sequenceEnrollments.id, enrollmentId))
      .limit(1);

    if (!enrollment || enrollment.status !== 'active') return;

    const [sequence] = await db
      .select()
      .from(emailSequences)
      .where(eq(emailSequences.id, enrollment.sequenceId))
      .limit(1);

    if (!sequence || sequence.active !== 'true') return;

    const steps = sequence.steps as Array<{
      day: number;
      templateId: string;
      condition?: string;
    }>;

    const currentStepConfig = steps[enrollment.currentStep];
    if (!currentStepConfig) {
      // Sequence completed
      await db
        .update(sequenceEnrollments)
        .set({ status: 'completed', completedAt: new Date() })
        .where(eq(sequenceEnrollments.id, enrollmentId));
      return;
    }

    // Check if we should send based on condition
    const shouldSend = await this.checkCondition(enrollment.leadId, currentStepConfig.condition);

    if (shouldSend) {
      // Render template and send
      const rendered = await this.templatesService.renderTemplate(
        currentStepConfig.templateId,
        enrollment.leadId,
        enrollment.workspaceId,
      );

      const [lead] = await db
        .select()
        .from(leads)
        .where(eq(leads.id, enrollment.leadId))
        .limit(1);

      if (lead && lead.emails && lead.emails.length > 0) {
        await this.emailService.sendEmail({
          leadId: enrollment.leadId,
          workspaceId: enrollment.workspaceId,
          toEmail: lead.emails[0],
          subject: rendered.subject,
          body: rendered.body,
        });
      }
    }

    // Move to next step
    const nextStep = enrollment.currentStep + 1;
    await db
      .update(sequenceEnrollments)
      .set({ currentStep: nextStep })
      .where(eq(sequenceEnrollments.id, enrollmentId));
  }

  /**
   * Check if condition is met for sending
   */
  private async checkCondition(leadId: string, condition?: string): Promise<boolean> {
    if (!condition || condition === 'always') return true;

    // Get latest email sent to this lead
    const [latestEmail] = await db
      .select()
      .from(emailOutreach)
      .where(eq(emailOutreach.leadId, leadId))
      .orderBy(emailOutreach.sentAt)
      .limit(1);

    if (!latestEmail) return true; // No email sent yet, always send

    switch (condition) {
      case 'not_opened':
        return !latestEmail.openedAt;
      case 'opened_no_reply':
        return !!latestEmail.openedAt && !latestEmail.repliedAt;
      case 'not_replied':
        return !latestEmail.repliedAt;
      default:
        return true;
    }
  }

  /**
   * Cron job to process due sequence steps
   * Should be called periodically (e.g., every hour)
   */
  async processDueSteps() {
    const activeEnrollments = await db
      .select()
      .from(sequenceEnrollments)
      .where(eq(sequenceEnrollments.status, 'active'));

    for (const enrollment of activeEnrollments) {
      const [sequence] = await db
        .select()
        .from(emailSequences)
        .where(eq(emailSequences.id, enrollment.sequenceId))
        .limit(1);

      if (!sequence || sequence.active !== 'true') continue;

      const steps = sequence.steps as Array<{ day: number; templateId: string }>;
      const currentStepConfig = steps[enrollment.currentStep];

      if (!currentStepConfig) continue;

      // Check if it's time to send this step
      const daysSinceEnrollment = Math.floor(
        (Date.now() - new Date(enrollment.enrolledAt).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysSinceEnrollment >= currentStepConfig.day) {
        await this.processEnrollment(enrollment.id);
      }
    }
  }
}
