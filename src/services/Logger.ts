/**
 * Logger Service
 * 
 * @overview Winston-based logging service with file and console transports,
 * log rotation, and structured logging support.
 * 
 * @module services/Logger
 */

import winston from 'winston';
import path from 'path';
import { LogLevel } from '../types/index.js';

/**
 * Logger service for application-wide logging
 */
export class Logger {
  private logger: winston.Logger;
  private static instance: Logger;

  private constructor(logLevel: LogLevel = 'info', logDir: string = './logs') {
    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    // Define console format
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        
        // Add metadata if present
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        
        return msg;
      })
    );

    // Create logger instance
    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat,
        }),
        // File transport for all logs
        new winston.transports.File({
          filename: path.join(logDir, 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        // File transport for errors only
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      ],
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(logLevel?: LogLevel, logDir?: string): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(logLevel, logDir);
    }
    return Logger.instance;
  }

  /**
   * Log debug message
   */
  public debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log info message
   */
  public info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log warning message
   */
  public warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log error message
   */
  public error(message: string, meta?: Record<string, unknown> | Error): void {
    if (meta instanceof Error) {
      this.logger.error(message, { error: meta.message, stack: meta.stack });
    } else {
      this.logger.error(message, meta);
    }
  }

  /**
   * Log with custom level
   */
  public log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    this.logger.log(level, message, meta);
  }

  /**
   * Change log level
   */
  public setLevel(level: LogLevel): void {
    this.logger.level = level;
  }

  /**
   * Get current log level
   */
  public getLevel(): string {
    return this.logger.level;
  }

  /**
   * Create child logger with default metadata
   */
  public child(defaultMeta: Record<string, unknown>): winston.Logger {
    return this.logger.child(defaultMeta);
  }

  /**
   * Close logger and flush pending logs
   */
  public close(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.close();
      resolve();
    });
  }
}

// Export default instance
export const logger = Logger.getInstance();
