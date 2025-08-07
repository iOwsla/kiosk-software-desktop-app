import { LogEntry } from '../../shared/types';

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;

  private createLogEntry(level: LogEntry['level'], message: string, metadata?: Record<string, any>): LogEntry {
    return {
      id: this.generateId(),
      level,
      message,
      metadata,
      createdAt: new Date()
    };
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private addLog(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    const timestamp = entry.createdAt.toISOString();
    const metadataStr = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : '';
    
    switch (entry.level) {
      case 'error':
        console.error(`[${timestamp}] ERROR: ${entry.message}${metadataStr}`);
        break;
      case 'warn':
        console.warn(`[${timestamp}] WARN: ${entry.message}${metadataStr}`);
        break;
      case 'debug':
        console.debug(`[${timestamp}] DEBUG: ${entry.message}${metadataStr}`);
        break;
      default:
        console.log(`[${timestamp}] INFO: ${entry.message}${metadataStr}`);
    }
  }

  public info(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, metadata);
    this.addLog(entry);
  }

  public warn(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, metadata);
    this.addLog(entry);
  }

  public error(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('error', message, metadata);
    this.addLog(entry);
  }

  public debug(message: string, metadata?: Record<string, any>): void {
    const entry = this.createLogEntry('debug', message, metadata);
    this.addLog(entry);
  }

  public getLogs(level?: LogEntry['level'], limit?: number): LogEntry[] {
    let filteredLogs = level ? this.logs.filter(log => log.level === level) : this.logs;
    
    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }
    
    return filteredLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public clearLogs(): void {
    this.logs = [];
  }
}

export const logger = new Logger();