/**
 * Database Schema Definition
 * 
 * @overview Defines all database tables, indexes, and initialization logic
 * for sessions, scraped data, and game state storage.
 * 
 * @module database/schema
 */

import { DatabaseConnection } from './connection.js';

/**
 * Initialize database schema
 */
export function initializeSchema(db: DatabaseConnection): void {
  const database = db.getDatabase();

  // Create sessions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      game_url TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME,
      status TEXT NOT NULL CHECK(status IN ('active', 'completed', 'failed', 'paused')),
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create scraped_data table
  database.exec(`
    CREATE TABLE IF NOT EXISTS scraped_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      data_type TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT NOT NULL,
      scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );
  `);

  // Create game_state table
  database.exec(`
    CREATE TABLE IF NOT EXISTS game_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      state_type TEXT NOT NULL,
      data TEXT NOT NULL,
      captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );
  `);

  // Create automation_logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS automation_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      action TEXT NOT NULL,
      selector TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      duration_ms INTEGER,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    );
  `);

  // Create indexes for performance
  createIndexes(database);

  // Create triggers for updated_at
  createTriggers(database);

  // Save database after schema creation
  db.save();

  console.log('✅ Database schema initialized');
}

/**
 * Create performance indexes
 */
function createIndexes(database: any): void {
  // Sessions indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
  `);

  // Scraped data indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_scraped_data_session_id ON scraped_data(session_id);
    CREATE INDEX IF NOT EXISTS idx_scraped_data_type ON scraped_data(data_type);
    CREATE INDEX IF NOT EXISTS idx_scraped_data_scraped_at ON scraped_data(scraped_at);
  `);

  // Game state indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_game_state_session_id ON game_state(session_id);
    CREATE INDEX IF NOT EXISTS idx_game_state_type ON game_state(state_type);
    CREATE INDEX IF NOT EXISTS idx_game_state_captured_at ON game_state(captured_at);
  `);

  // Automation logs indexes
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_automation_logs_session_id ON automation_logs(session_id);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_action ON automation_logs(action);
    CREATE INDEX IF NOT EXISTS idx_automation_logs_success ON automation_logs(success);
  `);

  console.log('✅ Database indexes created');
}

/**
 * Create triggers for automatic timestamp updates
 */
function createTriggers(database: any): void {
  // Update sessions.updated_at on any update
  database.exec(`
    CREATE TRIGGER IF NOT EXISTS update_sessions_timestamp
    AFTER UPDATE ON sessions
    FOR EACH ROW
    BEGIN
      UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  console.log('✅ Database triggers created');
}

/**
 * Drop all tables (use with caution!)
 */
export function dropAllTables(db: DatabaseConnection): void {
  const database = db.getDatabase();

  database.exec(`
    DROP TABLE IF EXISTS automation_logs;
    DROP TABLE IF EXISTS game_state;
    DROP TABLE IF EXISTS scraped_data;
    DROP TABLE IF EXISTS sessions;
  `);

  console.log('⚠️  All tables dropped');
}

/**
 * Reset database (drop and recreate)
 */
export function resetDatabase(db: DatabaseConnection): void {
  dropAllTables(db);
  initializeSchema(db);
  console.log('🔄 Database reset complete');
}
