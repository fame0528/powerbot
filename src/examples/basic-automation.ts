/**
 * Basic Automation Example
 * 
 * @overview Demonstrates basic game automation with browser management,
 * session tracking, and graceful shutdown.
 * 
 * @example
 * ```bash
 * npm run example:basic
 * ```
 */

import { Powerbot } from '../index.js';
import { GameAutomation } from '../automation/GameAutomation.js';
import { GameScraper } from '../scrapers/GameScraper.js';
import { getAppConfig } from '../utils/config.js';

/**
 * Main automation example
 */
async function main(): Promise<void> {
  // Create Powerbot instance
  const powerbot = new Powerbot();

  // Setup graceful shutdown
  powerbot.setupShutdownHandlers();

  try {
    // Initialize application
    await powerbot.initialize();
    const logger = powerbot.getLogger();
    const browserManager = powerbot.getBrowserManager();
    const db = powerbot.getDatabase();

    logger.info('Starting basic automation example...');

    // Get configuration
    const config = getAppConfig();

    // Create game automation instance
    const automation = new GameAutomation(
      browserManager,
      db,
      config.automation,
      'example-automation'
    );

    logger.info('Starting automation...');

    // Run automation (this will handle browser launch, session creation, etc.)
    await automation.run();

    logger.info('Automation completed successfully');

    // Optional: Demonstrate scraping
    const scraper = new GameScraper(db, {
      dataType: 'game-data',
      selectors: {
        title: 'h1',
        score: '.score',
        level: '.level',
      },
    });

    // Get page from automation
    const page = automation.getPage();
    
    if (page) {
      logger.info('Running scraper...');
      
      // Set session ID for scraped data
      const session = (automation as any).currentSession;
      if (session) {
        scraper.setSessionId(session.sessionId);
        await scraper.scrape(page);
      }
    }

    // Stop automation
    await automation.stop();

    logger.info('Example completed');

  } catch (error) {
    console.error('Error in automation example:', error);
    throw error;
  } finally {
    // Cleanup
    await powerbot.shutdown();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
