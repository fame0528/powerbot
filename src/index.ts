/**
 * Powerbot - Web Game Automation System
 * 
 * @overview Main entry point for the automation system with initialization,
 * lifecycle management, and graceful shutdown handling.
 * 
 * @module index
 */

// Export public API
export { BrowserManager } from './automation/BrowserManager.js';
export { BaseAutomation } from './automation/BaseAutomation.js';
export { GameAutomation } from './automation/GameAutomation.js';

export { BaseScraper } from './scrapers/BaseScraper.js';
export { GameScraper } from './scrapers/GameScraper.js';

export { DatabaseConnection } from './database/connection.js';
export { SessionModel } from './database/models/Session.js';
export { ScrapedDataModel } from './database/models/ScrapedData.js';

export { Logger, logger } from './services/Logger.js';
export { retry, retryWithHandler, sleep, withTimeout, retryBatch, retrySequential } from './utils/retry.js';
export {
  getAutomationConfig,
  getScraperConfig,
  getAppConfig,
  validateConfig,
  requireEnv,
  getEnv,
  getBoolEnv,
  getNumberEnv,
  printConfig,
} from './utils/config.js';

export * from './types/index.js';

/**
 * Main application class
 */
import { BrowserManager } from './automation/BrowserManager.js';
import { DatabaseConnection } from './database/connection.js';
import { initializeSchema } from './database/schema.js';
import { Logger } from './services/Logger.js';
import { getAppConfig, printConfig, validateConfig } from './utils/config.js';

export class Powerbot {
  private browserManager: BrowserManager | null = null;
  private db: DatabaseConnection | null = null;
  private logger: Logger;
  private isInitialized: boolean = false;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Initialize application
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Powerbot already initialized');
      return;
    }

    try {
      this.logger.info('Initializing Powerbot...');

      // Get and validate configuration
      const config = getAppConfig();
      const validation = validateConfig();

      if (!validation.valid) {
        throw new Error(`Configuration validation failed:\n${validation.errors.join('\n')}`);
      }

      printConfig(config);

      // Initialize database
      this.logger.info('Initializing database...');
      this.db = await DatabaseConnection.getInstance(config.database);
      initializeSchema(this.db);
      this.logger.info('Database initialized successfully');

      // Initialize browser manager
      this.logger.info('Initializing browser manager...');
      this.browserManager = BrowserManager.getInstance(config.automation);
      this.logger.info('Browser manager initialized successfully');

      this.isInitialized = true;
      this.logger.info('Powerbot initialization complete');

    } catch (error) {
      this.logger.error('Failed to initialize Powerbot:', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get browser manager instance
   */
  public getBrowserManager(): BrowserManager {
    if (!this.browserManager) {
      throw new Error('BrowserManager not initialized. Call initialize() first.');
    }
    return this.browserManager;
  }

  /**
   * Get database connection
   */
  public getDatabase(): DatabaseConnection {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get logger instance
   */
  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Shutdown application gracefully
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Shutting down Powerbot...');

      // Close browser
      if (this.browserManager) {
        this.logger.info('Closing browser...');
        await this.browserManager.close();
      }

      // Close database
      if (this.db) {
        this.logger.info('Closing database...');
        this.db.close();
      }

      // Close logger
      await this.logger.close();

      this.isInitialized = false;
      console.log('Powerbot shutdown complete');

    } catch (error) {
      console.error('Error during shutdown:', error);
      throw error;
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  public setupShutdownHandlers(): void {
    const shutdownHandler = async (signal: string) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      try {
        await this.shutdown();
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdownHandler('SIGINT'));
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      shutdownHandler('uncaughtException');
    });
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      shutdownHandler('unhandledRejection');
    });
  }

  /**
   * Check if initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}
