/**
 * Database Connection Manager
 * 
 * @overview Singleton pattern database connection manager using sql.js
 * with transaction support and query helpers for SQLite operations.
 * 
 * @module database/connection
 */

import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { DatabaseConfig } from '../types/index.js';

/**
 * Database connection manager singleton
 */
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private db: Database;
  private dbPath: string;

  private constructor(db: Database, dbPath: string) {
    this.db = db;
    this.dbPath = dbPath;
    this.initialize();
  }

  /**
   * Get or create database connection instance
   */
  public static async getInstance(config?: DatabaseConfig): Promise<DatabaseConnection> {
    if (!DatabaseConnection.instance) {
      if (!config) {
        throw new Error('Database configuration required for first initialization');
      }

      // Initialize sql.js
      const SQL = await initSqlJs();

      // Load or create database
      let db: Database;
      if (existsSync(config.path)) {
        const buffer = readFileSync(config.path);
        db = new SQL.Database(buffer);
      } else {
        // Ensure directory exists
        const dir = dirname(config.path);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
        db = new SQL.Database();
      }

      DatabaseConnection.instance = new DatabaseConnection(db, config.path);
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initialize database with optimal settings
   */
  private initialize(): void {
    // Enable foreign keys
    this.db.run('PRAGMA foreign_keys = ON');
    
    // Set cache size
    this.db.run('PRAGMA cache_size = -10000');
  }

  /**
   * Get database instance
   */
  public getDatabase(): Database {
    return this.db;
  }

  /**
   * Execute function within transaction
   */
  public transaction<T>(fn: () => T): T {
    try {
      this.db.run('BEGIN TRANSACTION');
      const result = fn();
      this.db.run('COMMIT');
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * Prepare SQL statement
   */
  public prepare(sql: string): any {
    return this.db.prepare(sql);
  }

  /**
   * Execute query and return all rows
   */
  public all<T = any>(sql: string, params?: any[]): T[] {
    const stmt = this.db.prepare(sql);
    const results: T[] = [];
    
    if (params) {
      stmt.bind(params);
    }
    
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push(row as T);
    }
    
    stmt.free();
    return results;
  }

  /**
   * Execute query and return first row
   */
  public get<T = any>(sql: string, params?: any[]): T | undefined {
    const stmt = this.db.prepare(sql);
    
    if (params) {
      stmt.bind(params);
    }
    
    let result: T | undefined = undefined;
    
    if (stmt.step()) {
      result = stmt.getAsObject() as T;
    }
    
    stmt.free();
    return result;
  }

  /**
   * Execute query without returning rows
   */
  public run(sql: string, params?: any[]): { changes: number; lastInsertRowid: number } {
    const stmt = this.db.prepare(sql);
    
    if (params) {
      stmt.bind(params);
    }
    
    stmt.step();
    stmt.free();
    
    // Get changes and last insert rowid
    const changesStmt = this.db.prepare('SELECT changes() as changes, last_insert_rowid() as lastInsertRowid');
    changesStmt.step();
    const result = changesStmt.getAsObject() as { changes: number; lastInsertRowid: number };
    changesStmt.free();
    
    return result;
  }

  /**
   * Save database to disk
   */
  public save(): void {
    const data = this.db.export();
    writeFileSync(this.dbPath, data);
  }

  /**
   * Close database connection
   */
  public close(): void {
    // Save database to disk before closing
    this.save();
    this.db.close();
  }

  /**
   * Optimize database
   */
  public optimize(): void {
    this.db.run('PRAGMA optimize');
  }

  /**
   * Get database statistics
   */
  public getStats(): {
    totalPages: number;
    pageSize: number;
    freePages: number;
  } {
    const pageCountStmt = this.db.prepare('PRAGMA page_count');
    pageCountStmt.step();
    const pageCount = pageCountStmt.getAsObject() as any;
    pageCountStmt.free();
    
    const pageSizeStmt = this.db.prepare('PRAGMA page_size');
    pageSizeStmt.step();
    const pageSize = pageSizeStmt.getAsObject() as any;
    pageSizeStmt.free();
    
    const freeCountStmt = this.db.prepare('PRAGMA freelist_count');
    freeCountStmt.step();
    const freeCount = freeCountStmt.getAsObject() as any;
    freeCountStmt.free();

    return {
      totalPages: Object.values(pageCount)[0] as number,
      pageSize: Object.values(pageSize)[0] as number,
      freePages: Object.values(freeCount)[0] as number,
    };
  }
}

/**
 * Get default database configuration
 */
export function getDefaultDatabaseConfig(): DatabaseConfig {
  return {
    path: './data/powerbot.db',
    options: {
      fileMustExist: false,
      timeout: 5000,
    },
  };
}
