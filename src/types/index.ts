/**
 * Core TypeScript Type Definitions
 * 
 * @overview Comprehensive type definitions for browser automation,
 * scraping, database models, and configuration.
 * 
 * @module types
 */

// ============================================================================
// Browser & Automation Types
// ============================================================================

/**
 * Browser launch options
 */
export interface BrowserOptions {
  browserType?: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  viewport?: {
    width: number;
    height: number;
  };
  userAgent?: string;
  proxy?: ProxyConfig;
  slowMo?: number;
  devtools?: boolean;
  locale?: string;
  timezone?: string;
  permissions?: string[];
  geolocation?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Proxy configuration
 */
export interface ProxyConfig {
  server: string;
  username?: string;
  password?: string;
}

/**
 * Automation configuration
 */
export interface AutomationConfig {
  browser: {
    browserType: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    timeout: number;
    viewport: {
      width: number;
      height: number;
    };
  };
  retry: {
    enabled: boolean;
    maxRetries: number;
    delayMs: number;
    backoffMultiplier: number;
  };
  game: {
    url: string;
    requiresLogin: boolean;
    loginUrl?: string;
    credentials: {
      username: string;
      password: string;
    };
  };
}

/**
 * Scraper configuration
 */
export interface ScraperConfig {
  dataType: string;
  selectors: Record<string, string>;
}

// ============================================================================
// Database Types
// ============================================================================

/**
 * Database configuration
 */
export interface DatabaseConfig {
  path: string;
  options?: {
    verbose?: ((...args: any[]) => void) | undefined;
    fileMustExist?: boolean;
    timeout?: number;
  };
}

/**
 * Database session record
 */
export interface Session {
  id: number;
  sessionId: string;
  gameUrl: string;
  status: SessionStatus;
  startedAt: Date;
  endedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session status enum
 */
export type SessionStatus = 
  | 'active'
  | 'completed'
  | 'failed';

/**
 * Scraped data structure
 */
export interface ScrapedData {
  id?: number;
  sessionId: string;
  dataType: string;
  content: Record<string, unknown>;
  url: string;
  scrapedAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Game state record
 */
export interface GameState {
  id?: number;
  sessionId: string;
  stateType: string;
  data: Record<string, unknown>;
  capturedAt: Date;
}

/**
 * Database query result
 */
export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// Logging Types
// ============================================================================

/**
 * Log levels
 */
export type LogLevel = 
  | 'error'
  | 'warn'
  | 'info'
  | 'debug';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  directory: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Retry configuration
 */
export interface RetryConfig {
  enabled: boolean;
  maxRetries: number;
  delayMs: number;
  backoffMultiplier: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Application configuration
 */
export interface AppConfig {
  database: DatabaseConfig;
  logging: LoggerConfig;
  automation: AutomationConfig;
}

/**
 * Player stats (example structure)
 */
export interface PlayerStats {
  level?: number;
  experience?: number;
  health?: number;
  maxHealth?: number;
  energy?: number;
  maxEnergy?: number;
  currency?: Record<string, number>;
}
