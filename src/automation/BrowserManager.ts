/**
 * Browser Manager
 * 
 * @overview Manages Playwright browser instances with stealth mode,
 * proxy support, and resource optimization for game automation.
 * 
 * @module automation/BrowserManager
 */

import { chromium, firefox, webkit, Browser, BrowserContext, Page } from 'playwright';
import { BrowserOptions, AutomationConfig } from '../types/index.js';

/**
 * Browser manager for handling browser lifecycle and contexts
 */
export class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private contexts: Map<string, BrowserContext> = new Map();
  private pages: Map<string, Page> = new Map();
  private config: AutomationConfig;

  private constructor(config: AutomationConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config: AutomationConfig): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager(config);
    }
    return BrowserManager.instance;
  }

  /**
   * Launch browser with specified options
   */
  public async launch(options?: BrowserOptions): Promise<void> {
    if (this.browser) {
      throw new Error('Browser already launched');
    }

    const browserType = options?.browserType || this.config.browser.browserType;
    const headless = options?.headless ?? this.config.browser.headless;

    const launchOptions: any = {
      headless,
      args: this.getBrowserArgs(options),
      ...(options?.proxy && { proxy: options.proxy }),
    };

    switch (browserType) {
      case 'chromium':
        this.browser = await chromium.launch(launchOptions);
        break;
      case 'firefox':
        this.browser = await firefox.launch(launchOptions);
        break;
      case 'webkit':
        this.browser = await webkit.launch(launchOptions);
        break;
      default:
        throw new Error(`Unsupported browser type: ${browserType}`);
    }
  }

  /**
   * Create new browser context with stealth mode
   */
  public async createContext(contextId: string, options?: BrowserOptions): Promise<BrowserContext> {
    if (!this.browser) {
      throw new Error('Browser not launched');
    }

    if (this.contexts.has(contextId)) {
      throw new Error(`Context ${contextId} already exists`);
    }

    const contextOptions: any = {
      viewport: options?.viewport || this.config.browser.viewport,
      userAgent: options?.userAgent || this.getUserAgent(),
      locale: options?.locale || 'en-US',
      timezoneId: options?.timezone || 'America/New_York',
      permissions: options?.permissions || [],
      geolocation: options?.geolocation,
      colorScheme: 'light',
      hasTouch: false,
      isMobile: false,
      ...(options?.proxy && { proxy: options.proxy }),
    };

    const context = await this.browser.newContext(contextOptions);

    // Apply stealth mode scripts
    await this.applyStealth(context);

    this.contexts.set(contextId, context);
    return context;
  }

  /**
   * Get or create page in context
   */
  public async getPage(contextId: string, pageId: string = 'default'): Promise<Page> {
    const fullPageId = `${contextId}:${pageId}`;

    if (this.pages.has(fullPageId)) {
      return this.pages.get(fullPageId)!;
    }

    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    const page = await context.newPage();
    this.pages.set(fullPageId, page);

    // Set default navigation timeout
    page.setDefaultNavigationTimeout(this.config.browser.timeout);
    page.setDefaultTimeout(this.config.browser.timeout);

    return page;
  }

  /**
   * Close specific page
   */
  public async closePage(contextId: string, pageId: string = 'default'): Promise<void> {
    const fullPageId = `${contextId}:${pageId}`;
    const page = this.pages.get(fullPageId);

    if (page) {
      await page.close();
      this.pages.delete(fullPageId);
    }
  }

  /**
   * Close context and all its pages
   */
  public async closeContext(contextId: string): Promise<void> {
    const context = this.contexts.get(contextId);
    
    if (context) {
      // Close all pages in this context
      const pagesForContext = Array.from(this.pages.entries())
        .filter(([id]) => id.startsWith(`${contextId}:`))
        .map(([id]) => id);

      for (const pageId of pagesForContext) {
        const page = this.pages.get(pageId);
        if (page) {
          await page.close();
          this.pages.delete(pageId);
        }
      }

      await context.close();
      this.contexts.delete(contextId);
    }
  }

  /**
   * Close all contexts and browser
   */
  public async close(): Promise<void> {
    // Close all pages
    for (const [pageId, page] of this.pages.entries()) {
      try {
        await page.close();
      } catch (error) {
        console.error(`Error closing page ${pageId}:`, error);
      }
    }
    this.pages.clear();

    // Close all contexts
    for (const [contextId, context] of this.contexts.entries()) {
      try {
        await context.close();
      } catch (error) {
        console.error(`Error closing context ${contextId}:`, error);
      }
    }
    this.contexts.clear();

    // Close browser
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Apply stealth mode to hide automation
   */
  private async applyStealth(context: BrowserContext): Promise<void> {
    // Override navigator.webdriver
    await context.addInitScript(() => {
      // @ts-ignore - This runs in browser context where navigator and window are defined
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // Add chrome object for Chromium
      // @ts-ignore - This runs in browser context
      if (!window.chrome) {
        // @ts-ignore
        window.chrome = {
          runtime: {},
        };
      }

      // Override permissions
      // @ts-ignore - This runs in browser context
      const originalQuery = window.navigator.permissions.query;
      // @ts-ignore
      window.navigator.permissions.query = (parameters: any) => {
        if (parameters.name === 'notifications') {
          return Promise.resolve({
            state: 'prompt',
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          });
        }
        return originalQuery(parameters);
      };

      // Add languages
      // @ts-ignore - This runs in browser context
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
      });

      // Add plugins
      // @ts-ignore - This runs in browser context
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
    });
  }

  /**
   * Get browser launch arguments
   */
  private getBrowserArgs(options?: BrowserOptions): string[] {
    const args: string[] = [
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ];

    if (options?.proxy) {
      args.push(`--proxy-server=${options.proxy.server}`);
    }

    return args;
  }

  /**
   * Get realistic user agent
   */
  private getUserAgent(): string {
    const version = Math.floor(Math.random() * 10) + 110;
    return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version}.0.0.0 Safari/537.36`;
  }

  /**
   * Check if browser is running
   */
  public isRunning(): boolean {
    return this.browser !== null;
  }

  /**
   * Get active contexts count
   */
  public getContextCount(): number {
    return this.contexts.size;
  }

  /**
   * Get active pages count
   */
  public getPageCount(): number {
    return this.pages.size;
  }
}
