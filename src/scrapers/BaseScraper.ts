/**
 * Base Scraper
 * 
 * @overview Abstract base class for web scraping with data extraction,
 * storage, and error handling capabilities.
 * 
 * @module scrapers/BaseScraper
 */

import { Page } from 'playwright';
import { DatabaseConnection } from '../database/connection.js';
import { ScrapedDataModel } from '../database/models/ScrapedData.js';
import { ScraperConfig } from '../types/index.js';

/**
 * Base scraper class for data extraction
 */
export abstract class BaseScraper {
  protected db: DatabaseConnection;
  protected dataModel: ScrapedDataModel;
  protected config: ScraperConfig;
  protected sessionId: string | null = null;

  constructor(db: DatabaseConnection, config: ScraperConfig) {
    this.db = db;
    this.dataModel = new ScrapedDataModel(db);
    this.config = config;
  }

  /**
   * Set session ID for scraped data
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Scrape data from page
   */
  public async scrape(page: Page): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Session ID not set');
    }

    try {
      console.log(`Starting scrape with selectors: ${JSON.stringify(this.config.selectors)}`);

      // Extract data using implemented method
      const data = await this.extractData(page);

      // Store data if extraction successful
      if (data && Object.keys(data).length > 0) {
        await this.storeData(data, page.url());
        console.log(`Scraped ${Object.keys(data).length} data points`);
      } else {
        console.log('No data extracted');
      }

    } catch (error) {
      console.error('Scraping error:', error);
      throw error;
    }
  }

  /**
   * Scrape multiple pages
   */
  public async scrapeMultiple(pages: Page[]): Promise<void> {
    console.log(`Scraping ${pages.length} pages...`);

    const results: Array<{ content: Record<string, unknown>; url: string }> = [];

    for (const page of pages) {
      try {
        const data = await this.extractData(page);
        
        if (data && Object.keys(data).length > 0) {
          results.push({
            content: data,
            url: page.url(),
          });
        }
      } catch (error) {
        console.error(`Error scraping ${page.url()}:`, error);
      }
    }

    if (results.length > 0) {
      await this.storeBulkData(results);
      console.log(`Scraped ${results.length} pages successfully`);
    }
  }

  /**
   * Extract specific field from page
   */
  protected async extractField(page: Page, selector: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      if (!element) {
        return null;
      }
      return await element.textContent();
    } catch (error) {
      console.error(`Error extracting field with selector ${selector}:`, error);
      return null;
    }
  }

  /**
   * Extract multiple elements
   */
  protected async extractElements(page: Page, selector: string): Promise<string[]> {
    try {
      const elements = await page.$$(selector);
      const texts: string[] = [];

      for (const element of elements) {
        const text = await element.textContent();
        if (text) {
          texts.push(text.trim());
        }
      }

      return texts;
    } catch (error) {
      console.error(`Error extracting elements with selector ${selector}:`, error);
      return [];
    }
  }

  /**
   * Extract attribute from element
   */
  protected async extractAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
    try {
      return await page.getAttribute(selector, attribute);
    } catch (error) {
      console.error(`Error extracting attribute ${attribute} from ${selector}:`, error);
      return null;
    }
  }

  /**
   * Store scraped data
   */
  protected async storeData(data: Record<string, unknown>, url: string): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Session ID not set');
    }

    const result = this.dataModel.create(
      this.sessionId,
      this.config.dataType,
      data,
      url,
      { timestamp: new Date().toISOString() }
    );

    if (!result.success) {
      throw new Error(`Failed to store data: ${result.error}`);
    }
  }

  /**
   * Store bulk scraped data
   */
  protected async storeBulkData(items: Array<{ content: Record<string, unknown>; url: string }>): Promise<void> {
    if (!this.sessionId) {
      throw new Error('Session ID not set');
    }

    const result = this.dataModel.createMany(
      this.sessionId,
      this.config.dataType,
      items.map(item => ({
        ...item,
        metadata: { timestamp: new Date().toISOString() },
      }))
    );

    if (!result.success) {
      throw new Error(`Failed to store bulk data: ${result.error}`);
    }
  }

  /**
   * Wait for element with timeout
   */
  protected async waitForElement(page: Page, selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Abstract method: Extract data from page
   */
  protected abstract extractData(page: Page): Promise<Record<string, unknown>>;
}
