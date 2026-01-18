/**
 * Game Automation
 * 
 * @overview Concrete implementation of game automation with login,
 * gameplay loop, and session management capabilities.
 * 
 * @module automation/GameAutomation
 */

import { Page } from 'playwright';
import { BaseAutomation } from './BaseAutomation.js';
import { BrowserManager } from './BrowserManager.js';
import { DatabaseConnection } from '../database/connection.js';
import { AutomationConfig } from '../types/index.js';

/**
 * Game automation implementation
 */
export class GameAutomation extends BaseAutomation {
  private page: Page | null = null;
  private contextId: string;
  private isRunning: boolean = false;

  constructor(
    browserManager: BrowserManager,
    db: DatabaseConnection,
    config: AutomationConfig,
    contextId: string = 'game-automation'
  ) {
    super(browserManager, db, config);
    this.contextId = contextId;
  }

  /**
   * Run game automation
   */
  public async run(): Promise<void> {
    try {
      this.isRunning = true;

      // Launch browser if not running
      if (!this.browserManager.isRunning()) {
        await this.browserManager.launch(this.config.browser);
      }

      // Create context and page
      await this.browserManager.createContext(this.contextId, this.config.browser);
      this.page = await this.browserManager.getPage(this.contextId);

      // Start session
      const session = await this.startSession(this.contextId);
      console.log(`Started automation session: ${session.sessionId}`);

      // Update session to active
      await this.updateSessionStatus('active');

      // Navigate to game URL
      if (this.config.game.url) {
        await this.navigate(this.page, this.config.game.url);
        console.log(`Navigated to: ${this.config.game.url}`);
      }

      // Check if login is required
      if (this.config.game.requiresLogin) {
        await this.handleLogin();
      }

      // Run main game loop
      await this.runGameLoop();

      // Update session to completed
      await this.updateSessionStatus('completed');
      console.log('Automation completed successfully');

    } catch (error) {
      await this.handleError(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Stop automation
   */
  public async stop(): Promise<void> {
    this.isRunning = false;

    if (this.currentSession) {
      await this.updateSessionStatus('completed');
    }

    if (this.page) {
      await this.browserManager.closePage(this.contextId);
      this.page = null;
    }

    await this.browserManager.closeContext(this.contextId);
  }

  /**
   * Handle game login
   */
  private async handleLogin(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    console.log('Handling login...');

    // Override this method in game-specific implementations
    // Default implementation just waits for potential login redirect
    await this.waitForNavigation(this.page, { waitUntil: 'networkidle' });
  }

  /**
   * Main game automation loop
   */
  private async runGameLoop(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    console.log('Starting game loop...');

    // Main automation loop - override in game-specific implementations
    while (this.isRunning) {
      try {
        // Example: Check for game elements
        await this.wait(1000);

        // Perform game actions
        await this.performGameActions();

        // Check if should continue
        if (!this.shouldContinue()) {
          break;
        }

      } catch (error) {
        console.error('Error in game loop:', error);

        if (this.config.retry.enabled) {
          await this.wait(this.config.retry.delayMs);
          continue;
        } else {
          throw error;
        }
      }
    }

    console.log('Game loop ended');
  }

  /**
   * Perform game-specific actions
   * Override this in game-specific implementations
   */
  protected async performGameActions(): Promise<void> {
    if (!this.page) {
      throw new Error('Page not initialized');
    }

    // Example placeholder - implement game-specific logic here
    const title = await this.page.title();
    console.log(`Current page: ${title}`);
  }

  /**
   * Check if automation should continue
   * Override this in game-specific implementations
   */
  protected shouldContinue(): boolean {
    return this.isRunning;
  }

  /**
   * Get current page
   */
  public getPage(): Page | null {
    return this.page;
  }

  /**
   * Check if automation is running
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
