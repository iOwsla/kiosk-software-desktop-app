import { PrismaClient } from '@prisma/client';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from '../../../api/utils/logger';

// Singleton pattern for PrismaClient
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    // Get the user data path
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'kiosk-hub.db');
    
    // Ensure the directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Set the DATABASE_URL environment variable
    process.env.DATABASE_URL = `file:${dbPath}`;

    // Create PrismaClient with logging
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
    // Test the connection
    await prismaClient.$connect();
    logger.info('Database connection established');

    // Run any initial setup if needed
    await seedInitialData();
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw error;
  }
}

async function seedInitialData(): Promise<void> {
  const prismaClient = getPrismaClient();

  try {
    // Check if we have any port configuration
    const portConfig = await prismaClient.portConfiguration.findFirst();
    
    if (!portConfig) {
      // Create default port configuration
      await prismaClient.portConfiguration.create({
        data: {
          portNumber: 3001,
          isActive: true,
          serviceType: 'api'
        }
      });
      logger.info('Default port configuration created');
    }

    // Clean up expired cache entries
    await prismaClient.localCache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

  } catch (error) {
    logger.error('Error seeding initial data', { error });
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Database disconnected');
  }
}

// Export types for use in other files
export type { 
  SyncQueue,
  Transaction,
  Product,
  Customer,
  LocalCache,
  DeviceInfo,
  UserSession,
  LicenseCache,
  AppLog,
  UpdateHistory,
  PortConfiguration
} from '@prisma/client';