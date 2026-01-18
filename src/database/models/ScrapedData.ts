/**
 * Scraped Data Model
 * 
 * @overview Database model for storing and retrieving scraped data from game sessions
 * with flexible content structure and metadata support.
 * 
 * @module database/models/ScrapedData
 */

import { DatabaseConnection } from '../connection.js';
import { ScrapedData, QueryResult } from '../../types/index.js';

/**
 * Scraped data model for database operations
 */
export class ScrapedDataModel {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Insert scraped data
   */
  public create(
    sessionId: string,
    dataType: string,
    content: Record<string, unknown>,
    url: string,
    metadata?: Record<string, unknown>
  ): QueryResult<ScrapedData> {
    try {
      const contentJson = JSON.stringify(content);
      const metadataJson = metadata ? JSON.stringify(metadata) : null;

      const result = this.db.run(
        `INSERT INTO scraped_data (session_id, data_type, content, url, metadata)
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, dataType, contentJson, url, metadataJson]
      );

      const insertedId = result.lastInsertRowid as number;
      this.db.save(); // Save to disk
      const data = this.findById(insertedId);

      if (!data.success || !data.data) {
        throw new Error('Failed to retrieve inserted data');
      }

      return {
        success: true,
        data: data.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Bulk insert scraped data
   */
  public createMany(
    sessionId: string,
    dataType: string,
    items: Array<{ content: Record<string, unknown>; url: string; metadata?: Record<string, unknown> }>
  ): QueryResult<number> {
    try {
      const insertMany = () => {
        for (const item of items) {
          this.db.run(
            `INSERT INTO scraped_data (session_id, data_type, content, url, metadata)
             VALUES (?, ?, ?, ?, ?)`,
            [
              sessionId,
              dataType,
              JSON.stringify(item.content),
              item.url,
              item.metadata ? JSON.stringify(item.metadata) : null
            ]
          );
        }
      };

      this.db.transaction(insertMany);
      this.db.save(); // Save to disk

      return {
        success: true,
        data: items.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find scraped data by ID
   */
  public findById(id: number): QueryResult<ScrapedData> {
    try {
      const row = this.db.get<any>(
        'SELECT * FROM scraped_data WHERE id = ?',
        [id]
      );

      if (!row) {
        return {
          success: false,
          error: 'Scraped data not found',
        };
      }

      return {
        success: true,
        data: this.mapRowToScrapedData(row),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find all scraped data for a session
   */
  public findBySession(sessionId: string, dataType?: string): QueryResult<ScrapedData[]> {
    try {
      const rows = dataType
        ? this.db.all<any>(
            'SELECT * FROM scraped_data WHERE session_id = ? AND data_type = ? ORDER BY scraped_at DESC',
            [sessionId, dataType]
          )
        : this.db.all<any>(
            'SELECT * FROM scraped_data WHERE session_id = ? ORDER BY scraped_at DESC',
            [sessionId]
          );

      return {
        success: true,
        data: rows.map(row => this.mapRowToScrapedData(row)),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find scraped data by type across all sessions
   */
  public findByType(dataType: string, limit?: number): QueryResult<ScrapedData[]> {
    try {
      const sql = limit
        ? 'SELECT * FROM scraped_data WHERE data_type = ? ORDER BY scraped_at DESC LIMIT ?'
        : 'SELECT * FROM scraped_data WHERE data_type = ? ORDER BY scraped_at DESC';

      const rows = limit
        ? this.db.all<any>(sql, [dataType, limit])
        : this.db.all<any>(sql, [dataType]);

      return {
        success: true,
        data: rows.map(row => this.mapRowToScrapedData(row)),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get latest scraped data by type
   */
  public getLatest(dataType: string): QueryResult<ScrapedData> {
    try {
      const row = this.db.get<any>(
        'SELECT * FROM scraped_data WHERE data_type = ? ORDER BY scraped_at DESC LIMIT 1',
        [dataType]
      );

      if (!row) {
        return {
          success: false,
          error: 'No data found for this type',
        };
      }

      return {
        success: true,
        data: this.mapRowToScrapedData(row),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete scraped data by ID
   */
  public delete(id: number): QueryResult<boolean> {
    try {
      const result = this.db.run(
        'DELETE FROM scraped_data WHERE id = ?',
        [id]
      );

      this.db.save(); // Save to disk
      return {
        success: true,
        data: result.changes > 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete all scraped data for a session
   */
  public deleteBySession(sessionId: string): QueryResult<number> {
    try {
      const result = this.db.run(
        'DELETE FROM scraped_data WHERE session_id = ?',
        [sessionId]
      );

      this.db.save(); // Save to disk
      return {
        success: true,
        data: result.changes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get count of scraped data by type
   */
  public getCountByType(dataType: string): number {
    const result = this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM scraped_data WHERE data_type = ?',
      [dataType]
    );
    return result?.count ?? 0;
  }

  /**
   * Map database row to ScrapedData object
   */
  private mapRowToScrapedData(row: any): ScrapedData {
    return {
      id: row.id,
      sessionId: row.session_id,
      dataType: row.data_type,
      content: JSON.parse(row.content),
      url: row.url,
      scrapedAt: new Date(row.scraped_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}
