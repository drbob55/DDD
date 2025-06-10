// packages/database/src/config/database.config.ts
/**
 * Database Configuration
 * Part of the Infrastructure Layer
 * 
 * This configuration allows for different database providers
 * based on the environment, following DDD's infrastructure flexibility
 */

export interface DatabaseConfig {
  provider: 'sqlite' | 'postgresql' | 'mysql';
  url: string;
  logging: boolean;
}

export function getDatabaseConfig(): DatabaseConfig {
  const env = process.env.NODE_ENV || 'development';
  
  // Development: Use SQLite for simplicity
  if (env === 'development') {
    return {
      provider: 'sqlite',
      url: process.env.DATABASE_URL || 'file:./dev.db',
      logging: true
    };
  }
  
  // Production: Use PostgreSQL for scalability
  return {
    provider: 'postgresql',
    url: process.env.DATABASE_URL || '',
    logging: false
  };
}

export const dbConfig = getDatabaseConfig();