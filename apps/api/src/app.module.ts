import { Module, Controller, Get } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JobsModule } from './jobs/jobs.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ScrapeSchedulesModule } from './scrape-schedules/scrape-schedules.module';
import { LeadsModule } from './leads/leads.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { AssistantModule } from './assistant/assistant.module';
import { AiModule } from './ai/ai.module';

@Controller()
class HealthController {
  @Get('health')
  check() {
    return { status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() };
  }
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    }),
    JobsModule,
    WorkflowsModule,
    ScrapeSchedulesModule,
    LeadsModule,
    WorkspacesModule,
    AssistantModule,
    AiModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
