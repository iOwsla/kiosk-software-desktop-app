import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { portRouter } from './routes/port';
import { updateRouter } from './routes/update';
import { printerRouter } from './routes/printer';
import { pavoRouter } from './routes/pavo';
import { licenseRouter } from './routes/license';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

export class APIServer {
  private app: express.Application;
  private server: any;
  private port: number;

  constructor(port: number = 3001) {
    this.app = express();
    this.port = port;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      crossOriginResourcePolicy: false,
    }));
    this.app.use(cors({
      origin: true, // Allow all origins in development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Logging middleware
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    this.app.use('/hub/port', portRouter);
    this.app.use('/hub/update', updateRouter);
    this.app.use('/hub/printer', printerRouter);
    this.app.use('/hub/pavo', pavoRouter);
    this.app.use('/api/license', licenseRouter);

    this.app.use('*', (req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, () => {
          logger.info(`API Server started on port ${this.port}`);
          resolve();
        });
      } catch (error) {
        logger.error('Failed to start API server', { error });
        reject(error);
      }
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('API Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getApp(): express.Application {
    return this.app;
  }
}