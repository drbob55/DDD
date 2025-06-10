// Environment Configuration
// Centralized configuration management

export interface Config {
  env: 'development' | 'staging' | 'production';
  api: {
    port: number;
    baseUrl: string;
  };
  database: {
    url: string;
  };
  redis: {
    url: string;
  };
  aws: {
    region: string;
    s3: {
      bucket: string;
    };
  };
  auth: {
    jwtSecret: string;
    jwtExpiresIn: string;
    refreshTokenExpiresIn: string;
  };
  email: {
    provider: 'sendgrid' | 'smtp';
    from: string;
    sendgridApiKey?: string;
    smtp?: {
      host: string;
      port: number;
      user: string;
      pass: string;
    };
  };
}

export const config: Config = {
  env: (process.env.NODE_ENV as Config['env']) || 'development',
  api: {
    port: parseInt(process.env.PORT || '3000', 10),
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    s3: {
      bucket: process.env.S3_BUCKET || '',
    },
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  email: {
    provider: (process.env.EMAIL_PROVIDER as Config['email']['provider']) || 'smtp',
    from: process.env.EMAIL_FROM || 'noreply@dental-platform.com',
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    smtp: {
      host: process.env.SMTP_HOST || '',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  },
};
