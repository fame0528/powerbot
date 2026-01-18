/**
 * Base Automation
 * 
 * @overview Abstract base class for game automation with common browser
 * interaction methods, session management, and error handling.
 * 
 * @module automation/BaseAutomation
 */

import { Page } from 'playwright';
import { BrowserManager } from './BrowserManager.js';
import { DatabaseConnection } from '../database/connection.js';
import { SessionModel } from '../database/models/Session.js';
import { AutomationConfig, Session, SessionStatus } from '../types/index.js';

/**
 * Base automation class with common methods
 */
export abstract class BaseAutomation {
  protected browserManager: BrowserManager;
  protected db: DatabaseConnection;
  protected sessionModel: SessionModel;
  protected config: AutomationConfig;
  protected currentSession: Session | null = null;

  constructor(
    browserManager: BrowserManager,
    db: DatabaseConnection,
    config: AutomationConfig
  ) {
    this.browserManager = browserManager;
    this.db = db;
    this.sessionModel = new SessionModel(db);
    this.config = config;
  }

  /**
   * Start automation session
   */
  protected async startSession(contextId: string): Promise<Session> {
    const result = this.sessionModel.create(contextId);

    if (!result.success || !result.data) {
      throw new Error(`Failed to create session: ${result.error}`);
    }

    this.currentSession = result.data;
    return result.data;
  }

  /**
   * Update session status
   */
  protected async updateSessionStatus(
    status: SessionStatus,
    errorMessage?: string
  ): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    // Update status
    const result = this.sessionModel.updateStatus(
      this.currentSession.sessionId,
      status
    );

    // If there's an error message, update metadata
    if (errorMessage && this.currentSession.sessionId) {
      const metadata = this.currentSession.metadata || {};
      metadata['lastError'] = errorMessage;
      this.sessionModel.updateMetadata(this.currentSession.sessionId, metadata);
    }

    if (result.success && result.data) {
      this.currentSession = result.data;
    }
  }

  /**
   * Navigate to URL with retry
   */
  protected async navigate(page: Page, url: string, options?: { waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    await page.goto(url, {
      waitUntil: options?.waitUntil || 'networkidle',
      timeout: this.config.browser.timeout,
    });
  }

  /**
   * Click element with retry
   */
  protected async click(page: Page, selector: string, options?: { timeout?: number; force?: boolean }): Promise<void> {
    await page.click(selector, {
      timeout: options?.timeout || this.config.browser.timeout,
      force: options?.force || false,
    });
  }

  /**
   * Type text into input
   */
  protected async type(page: Page, selector: string, text: string, options?: { delay?: number }): Promise<void> {
    await page.fill(selector, '');
    await page.type(selector, text, {
      delay: options?.delay || 50,
    });
  }

  /**
   * Wait for selector
   */
  protected async waitForSelector(page: Page, selector: string, options?: { timeout?: number; state?: 'attached' | 'visible' | 'hidden' }): Promise<void> {
    await page.waitForSelector(selector, {
      timeout: options?.timeout || this.config.browser.timeout,
      state: options?.state || 'visible',
    });
  }

  /**
   * Wait for navigation
   */
  protected async waitForNavigation(page: Page, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<void> {
    await page.waitForLoadState(options?.waitUntil || 'networkidle', {
      timeout: options?.timeout || this.config.browser.timeout,
    });
  }

  /**
   * Wait for specified time
   */
  protected async wait(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Take screenshot
   */
  protected async screenshot(page: Page, path: string): Promise<void> {
    await page.screenshot({
      path,
      fullPage: true,
    });
  }

  /**
   * Get element text
   */
  protected async getText(page: Page, selector: string): Promise<string> {
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }
    const text = await element.textContent();
    return text?.trim() || '';
  }

  /**
   * Get element attribute
   */
  protected async getAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
    return await page.getAttribute(selector, attribute);
  }

  /**
   * Check if element exists
   */
  protected async exists(page: Page, selector: string): Promise<boolean> {
    const element = await page.$(selector);
    return element !== null;
  }

  /**
   * Evaluate JavaScript in page
   */
  protected async evaluate<T>(page: Page, fn: string | ((arg: any) => T), arg?: any): Promise<T> {
    return await page.evaluate(fn, arg);
  }

  /**
   * Execute with retry logic
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    options?: { maxRetries?: number; delayMs?: number }
  ): Promise<T> {
    const maxRetries = options?.maxRetries || this.config.retry.maxRetries;
    const delayMs = options?.delayMs || this.config.retry.delayMs;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          await this.wait(delayMs * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Handle automation errors
   */
  protected async handleError(error: Error): Promise<void> {
    console.error('Automation error:', error);

    if (this.currentSession) {
      await this.updateSessionStatus('failed', error.message);
    }
  }

  /**
   * Abstract method: Run automation
   */
  public abstract run(): Promise<void>;

  /**
   * Abstract method: Stop automation
   */
  public abstract stop(): Promise<void>;
}
