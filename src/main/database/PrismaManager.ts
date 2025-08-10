import {
  getPrismaClient,
  Device
} from './prisma';
import { logger } from '../../../api/utils/logger';
import { Prisma } from '@prisma/client';

export class PrismaManager {
  private static instance: PrismaManager;
  private prisma = getPrismaClient();

  private constructor() {
    logger.info('PrismaManager initialized');
  }

  public static getInstance(): PrismaManager {
    if (!PrismaManager.instance) {
      PrismaManager.instance = new PrismaManager();
    }
    return PrismaManager.instance;
  }
}