import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { IJobQueueService, JobOptions, JobResult } from '../../application/ports/IJobQueueService';

export interface JobProcessor<T = any> {
  process(data: T): Promise<void>;
}

export class JobQueueService implements IJobQueueService {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();

  constructor(private connection: Redis) {}

  async createQueue(name: string): Promise<void> {
    if (this.queues.has(name)) {
      return;
    }

    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 7 days
        },
      },
    });

    const queueEvents = new QueueEvents(name, {
      connection: this.connection,
    });

    this.queues.set(name, queue);
    this.queueEvents.set(name, queueEvents);
  }

  async addJob<T>(
    queueName: string,
    jobType: string,
    data: T,
    options?: JobOptions
  ): Promise<string> {
    const queue = await this.getQueue(queueName);
    
    const job = await queue.add(jobType, data, {
      priority: options?.priority,
      delay: options?.delay,
      attempts: options?.attempts || 3,
      backoff: options?.backoff || {
        type: 'exponential',
        delay: 2000,
      },
    });

    return job.id;
  }

  async registerProcessor<T>(
    queueName: string,
    jobType: string,
    processor: JobProcessor<T>
  ): Promise<void> {
    const workerKey = `${queueName}:${jobType}`;
    
    if (this.workers.has(workerKey)) {
      return;
    }

    const worker = new Worker(
      queueName,
      async (job: Job) => {
        if (job.name === jobType) {
          await processor.process(job.data as T);
        }
      },
      {
        connection: this.connection,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000, // per second
        },
      }
    );

    // Add event handlers
    worker.on('completed', (job: Job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`Job ${job?.id} failed:`, err);
    });

    worker.on('error', (err: Error) => {
      console.error('Worker error:', err);
    });

    this.workers.set(workerKey, worker);
  }

  async getJobStatus(queueName: string, jobId: string): Promise<JobResult> {
    const queue = await this.getQueue(queueName);
    const job = await queue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      status: state,
      progress: typeof progress === 'number' ? progress : undefined,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }

  async pauseQueue(queueName: string): Promise<void> {
    const queue = await this.getQueue(queueName);
    await queue.pause();
  }

  async resumeQueue(queueName: string): Promise<void> {
    const queue = await this.getQueue(queueName);
    await queue.resume();
  }

  async getQueueMetrics(queueName: string): Promise<any> {
    const queue = await this.getQueue(queueName);
    
    const [
      waitingCount,
      activeCount,
      completedCount,
      failedCount,
      delayedCount,
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting: waitingCount,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
      delayed: delayedCount,
    };
  }

  private async getQueue(name: string): Promise<Queue> {
    if (!this.queues.has(name)) {
      await this.createQueue(name);
    }
    return this.queues.get(name)!;
  }

  async shutdown(): Promise<void> {
    // Close all workers
    for (const worker of this.workers.values()) {
      await worker.close();
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close();
    }

    // Close all queue events
    for (const queueEvents of this.queueEvents.values()) {
      await queueEvents.close();
    }

    this.workers.clear();
    this.queues.clear();
    this.queueEvents.clear();
  }
}
