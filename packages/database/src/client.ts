import { PrismaClient } from '@prisma/client';

declare global {
  var __prisma: PrismaClient | undefined;
}

const prismaClientConfig = {
  log: process.env.NODE_ENV === 'development' 
    ? ['query' as const, 'error' as const, 'warn' as const] 
    : ['error' as const],
  errorFormat: 'pretty' as const,
};

export const prisma = global.__prisma ?? new PrismaClient(prismaClientConfig);

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

export const db = {
  async connect(): Promise<void> {
    await prisma.$connect();
  },

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  },

  async isHealthy(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  },

  async transaction<T>(
    fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(fn) as Promise<T>;
  }
};

export default prisma;
