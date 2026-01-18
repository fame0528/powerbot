/**
 * Game Scraper
 * 
 * @overview Concrete implementation of game-specific data scraping
 * with customizable selectors and extraction logic.
 * 
 * @module scrapers/GameScraper
 */

import { Page } from 'playwright';
import { BaseScraper } from './BaseScraper.js';
import { DatabaseConnection } from '../database/connection.js';
import { ScraperConfig } from '../types/index.js';

/**
 * Game-specific scraper implementation
 */
export class GameScraper extends BaseScraper {
  constructor(db: DatabaseConnection, config: ScraperConfig) {
    super(db, config);
  }

  /**
   * Extract data from game page
   */
  protected async extractData(page: Page): Promise<Record<string, unknown>> {
    const data: Record<string, unknown> = {};

    // Extract data using configured selectors
    for (const [key, selector] of Object.entries(this.config.selectors)) {
      try {
        // Try to extract as text content
        const value = await this.extractField(page, selector);
        
        if (value !== null) {
          data[key] = value.trim();
        } else {
          // Try to extract as attribute (e.g., href, src)
          const href = await this.extractAttribute(page, selector, 'href');
          if (href) {
            data[key] = href;
          } else {
            const src = await this.extractAttribute(page, selector, 'src');
            if (src) {
              data[key] = src;
            }
          }
        }
      } catch (error) {
        console.error(`Error extracting ${key}:`, error);
        data[key] = null;
      }
    }

    // Add metadata
    data['_metadata'] = {
      url: page.url(),
      title: await page.title(),
      scrapedAt: new Date().toISOString(),
    };

    return data;
  }

  /**
   * Extract player stats from game page
   */
  public async extractPlayerStats(page: Page): Promise<Record<string, unknown>> {
    const stats: Record<string, unknown> = {};

    // Example: Extract common game stats
    const statSelectors = {
      level: '[data-stat="level"], .player-level, #level',
      health: '[data-stat="health"], .player-health, #health',
      energy: '[data-stat="energy"], .player-energy, #energy',
      experience: '[data-stat="exp"], .player-exp, #experience',
      gold: '[data-stat="gold"], .player-gold, #gold',
      username: '[data-stat="username"], .player-name, #username',
    };

    for (const [key, selector] of Object.entries(statSelectors)) {
      try {
        const value = await this.extractField(page, selector);
        if (value !== null) {
          // Try to parse as number
          const numValue = parseFloat(value.replace(/[^0-9.-]/g, ''));
          stats[key] = isNaN(numValue) ? value : numValue;
        }
      } catch (error) {
        console.error(`Error extracting stat ${key}:`, error);
      }
    }

    return stats;
  }

  /**
   * Extract inventory items
   */
  public async extractInventory(page: Page): Promise<Array<Record<string, unknown>>> {
    const items: Array<Record<string, unknown>> = [];

    try {
      // Common inventory selectors
      const inventorySelectors = [
        '.inventory-item',
        '[data-item]',
        '.item',
        '#inventory .item',
      ];

      for (const selector of inventorySelectors) {
        const elements = await page.$$(selector);
        
        if (elements.length > 0) {
          for (const element of elements) {
            const item: Record<string, unknown> = {};

            // Extract item properties
            const name = await element.textContent();
            const id = await element.getAttribute('data-id');
            const type = await element.getAttribute('data-type');
            const quantity = await element.getAttribute('data-quantity');

            if (name) item['name'] = name.trim();
            if (id) item['id'] = id;
            if (type) item['type'] = type;
            if (quantity) item['quantity'] = parseInt(quantity, 10);

            items.push(item);
          }
          break; // Found inventory items, stop trying other selectors
        }
      }
    } catch (error) {
      console.error('Error extracting inventory:', error);
    }

    return items;
  }

  /**
   * Extract quest/mission data
   */
  public async extractQuests(page: Page): Promise<Array<Record<string, unknown>>> {
    const quests: Array<Record<string, unknown>> = [];

    try {
      const questSelectors = [
        '.quest',
        '[data-quest]',
        '.mission',
        '#quests .quest-item',
      ];

      for (const selector of questSelectors) {
        const elements = await page.$$(selector);
        
        if (elements.length > 0) {
          for (const element of elements) {
            const quest: Record<string, unknown> = {};

            const title = await element.textContent();
            const status = await element.getAttribute('data-status');
            const progress = await element.getAttribute('data-progress');

            if (title) quest['title'] = title.trim();
            if (status) quest['status'] = status;
            if (progress) quest['progress'] = progress;

            quests.push(quest);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error extracting quests:', error);
    }

    return quests;
  }

  /**
   * Extract leaderboard data
   */
  public async extractLeaderboard(page: Page): Promise<Array<Record<string, unknown>>> {
    const rankings: Array<Record<string, unknown>> = [];

    try {
      const rowSelectors = [
        '.leaderboard-row',
        '[data-rank]',
        '.ranking-item',
        '#leaderboard tr',
      ];

      for (const selector of rowSelectors) {
        const elements = await page.$$(selector);
        
        if (elements.length > 0) {
          for (const element of elements) {
            const ranking: Record<string, unknown> = {};

            const rank = await element.getAttribute('data-rank');
            const username = await element.textContent();
            const score = await element.getAttribute('data-score');

            if (rank) ranking['rank'] = parseInt(rank, 10);
            if (username) ranking['username'] = username.trim();
            if (score) ranking['score'] = parseInt(score, 10);

            rankings.push(ranking);
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error extracting leaderboard:', error);
    }

    return rankings;
  }
}
