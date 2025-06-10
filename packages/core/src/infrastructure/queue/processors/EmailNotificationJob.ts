import { JobProcessor } from '../JobQueueService';

export interface EmailNotificationData {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

export class EmailNotificationJob implements JobProcessor<EmailNotificationData> {
  async process(data: EmailNotificationData): Promise<void> {
    console.log(`Sending email to ${data.to}: ${data.subject}`);
    // Email sending logic here
  }
}
