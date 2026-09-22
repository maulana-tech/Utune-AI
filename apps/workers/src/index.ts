import { startScrapeWorker } from './queues/scrape.worker';
import { startAiWorker } from './queues/ai.worker';
import { startOrchestratedAiWorker } from './queues/orchestrated-ai.worker';
import { startScrapeScheduler } from './cron/scrape-scheduler';
import { run as startEmailScheduler } from './cron/email-scheduler';

console.log('Starting BullMQ Workers...');
startScrapeWorker();
startAiWorker(); // Legacy — kept for backward compat
startOrchestratedAiWorker();
startScrapeScheduler();
startEmailScheduler();
