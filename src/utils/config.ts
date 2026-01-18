/**
 * Configuration Manager
 * 
 * @overview Centralized configuration management with environment variable
 * support and default values.
 * 
 * @module utils/config
 */

import * as dotenv from 'dotenv';
import { AppConfig, AutomationConfig, ScraperConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

/**
 * Get automation configuration from environment
 */
export function getAutomationConfig(): AutomationConfig {
  return {
    browser: {
      browserType: (process.env['BROWSER_TYPE'] as 'chromium' | 'firefox' | 'webkit') || 'chromium',
      headless: process.env['HEADLESS'] === 'true',
      timeout: parseInt(process.env['TIMEOUT'] || '30000', 10),
      viewport: {
        width: parseInt(process.env['VIEWPORT_WIDTH'] || '1920', 10),
        height: parseInt(process.env['VIEWPORT_HEIGHT'] || '1080', 10),
      },
    },
    retry: {
      enabled: process.env['RETRY_ENABLED'] !== 'false',
      maxRetries: parseInt(process.env['MAX_RETRIES'] || '3', 10),
      delayMs: parseInt(process.env['RETRY_DELAY'] || '1000', 10),
      backoffMultiplier: parseInt(process.env['BACKOFF_MULTIPLIER'] || '2', 10),
    },
    game: {
      url: process.env['GAME_URL'] || '',
      requiresLogin: process.env['REQUIRES_LOGIN'] === 'true',
      loginUrl: process.env['LOGIN_URL'],
      credentials: {
        username: process.env['GAME_USERNAME'] || '',
        password: process.env['GAME_PASSWORD'] || '',
      },
    },
  };
}

/**
 * Get scraper configuration
 */
export function getScraperConfig(dataType: string): ScraperConfig {
  return {
    dataType,
    selectors: parseSelectors(process.env[`SCRAPER_SELECTORS_${dataType.toUpperCase()}`] || ''),
  };
}

/**
 * Get application configuration
 */
export function getAppConfig(): AppConfig {
  return {
    database: {
      path: process.env['DB_PATH'] || './data/powerbot.db',
      options: {
        verbose: process.env['DB_VERBOSE'] === 'true' ? console.log : undefined,
        fileMustExist: false,
        timeout: parseInt(process.env['DB_TIMEOUT'] || '5000', 10),
      },
    },
    logging: {
      level: (process.env['LOG_LEVEL'] as 'error' | 'warn' | 'info' | 'debug') || 'info',
      directory: process.env['LOG_DIR'] || './logs',
    },
    automation: getAutomationConfig(),
  };
}

/**
 * Parse selectors from environment string
 */
function parseSelectors(selectorsString: string): Record<string, string> {
  if (!selectorsString) {
    return {};
  }

  const selectors: Record<string, string> = {};
  
  try {
    // Format: key1:selector1,key2:selector2
    const pairs = selectorsString.split(',');
    
    for (const pair of pairs) {
      const [key, selector] = pair.split(':');
      if (key && selector) {
        selectors[key.trim()] = selector.trim();
      }
    }
  } catch (error) {
    console.error('Error parsing selectors:', error);
  }

  return selectors;
}

/**
 * Validate required environment variables
 */
export function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required variables
  if (!process.env['GAME_URL']) {
    errors.push('GAME_URL is required');
  }

  if (process.env['REQUIRES_LOGIN'] === 'true') {
    if (!process.env['GAME_USERNAME']) {
      errors.push('GAME_USERNAME is required when login is enabled');
    }
    if (!process.env['GAME_PASSWORD']) {
      errors.push('GAME_PASSWORD is required when login is enabled');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get environment variable or throw error
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }

  return value;
}

/**
 * Get environment variable with default
 */
export function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get boolean environment variable
 */
export function getBoolEnv(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  
  if (value === undefined) {
    return defaultValue;
  }

  return value === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
export function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  
  if (value === undefined) {
    return defaultValue;
  }

  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Print current configuration (masks sensitive data)
 */
export function printConfig(config: AppConfig): void {
  console.log('=== Configuration ===');
  console.log('Database:', config.database.path);
  console.log('Log Level:', config.logging.level);
  console.log('Log Directory:', config.logging.directory);
  console.log('Browser:', config.automation.browser.browserType);
  console.log('Headless:', config.automation.browser.headless);
  console.log('Timeout:', config.automation.browser.timeout);
  console.log('Game URL:', config.automation.game.url);
  console.log('Requires Login:', config.automation.game.requiresLogin);
  console.log('Username:', config.automation.game.credentials.username ? '***SET***' : '***NOT SET***');
  console.log('Password:', config.automation.game.credentials.password ? '***SET***' : '***NOT SET***');
  console.log('=====================');
}
