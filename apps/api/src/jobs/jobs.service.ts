import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScrapeJobPayload } from '@repo/shared';
import { db, jobs } from '@repo/db';
import { eq, desc } from 'drizzle-orm';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue('scrape-map') private scrapeQueue: Queue,
    @InjectQueue('orchestrated-ai-queue') private orchestratedAiQueue: Queue,
  ) {}

  async queueMapScrape(payload: ScrapeJobPayload) {
    const [dbJob] = await db
      .insert(jobs)
      .values({ workspaceId: payload.workspaceId, query: payload.query, status: 'pending' })
      .returning();

    await this.scrapeQueue.add('map-scrape-job', { ...payload, jobId: dbJob.id });
    return { jobId: dbJob.id };
  }

  async getJobs(workspaceId: string) {
    return db
      .select()
      .from(jobs)
      .where(eq(jobs.workspaceId, workspaceId))
      .orderBy(desc(jobs.createdAt))
      .limit(100);
  }

  // Alias used by ScrapeSchedulesService (scheduleId-aware path)
  async queueScrape(payload: ScrapeJobPayload) {
    return this.queueMapScrape(payload);
  }

  async queueOrchestratedAI(payload: {
    leadId: string;
    workspaceId: string;
    rawText: string;
    ourProduct: string;
  }) {
    const job = await this.orchestratedAiQueue.add('orchestrated-workflow', payload);
    return { jobId: job.id };
  }
}
