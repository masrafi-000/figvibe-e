import { Worker, type Job } from 'bullmq';
import { logger } from '../../config/logger';
import { mailService } from '../services/mail.service';
import { redisConnection } from './bullmq.config';
import { EMAIL_QUEUE_NAME } from './email.queue';

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const emailWorker = new Worker(
  EMAIL_QUEUE_NAME,
  async (job: Job<EmailJobData>) => {
    logger.info(
      { jobId: job.id, name: job.name, to: job.data.to },
      'Processing background email job',
    );

    await mailService.sendMail({
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.html,
      text: job.data.text,
    });
  },
  {
    connection: redisConnection,
    concurrency: 5,
  },
);

emailWorker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Email background job completed');
});

emailWorker.on('failed', (job, err) => {
  logger.error(
    { jobId: job?.id, err: err.message },
    'Email job failed after retries',
  );
});

emailWorker.on('error', (err) => {
  logger.error({ err: err.message }, 'Email worker error');
});
