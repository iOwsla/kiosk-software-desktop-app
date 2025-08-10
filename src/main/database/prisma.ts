import { PrismaClient } from '@prisma/client';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from '../../../api/utils/logger';

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'kiosk-hub.db');

    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    process.env.DATABASE_URL = `file:${dbPath}`;

    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      datasources: {
        db: {
          url: `file:${dbPath}`
        }
      }
    });

    logger.info('Prisma client initialized', { dbPath });
  }

  return prisma;
}

export async function initializeDatabase(): Promise<void> {
  const prismaClient = getPrismaClient();

  try {
    await prismaClient.$connect();
    logger.info('Database connection established');

  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
}


export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Database disconnected');
  }
}

export type {
  Device
} from '@prisma/client';