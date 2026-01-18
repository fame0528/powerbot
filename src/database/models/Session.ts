/**
 * Session Model
 * 
 * @overview Database model for managing automation sessions with CRUD operations,
 * status tracking, and metadata storage.
 * 
 * @module database/models/Session
 */

import { DatabaseConnection } from '../connection.js';
import { Session, SessionStatus, QueryResult } from '../../types/index.js';

/**
 * Session model for database operations
 */
export class SessionModel {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new session
   */
  public create(gameUrl: string, metadata?: Record<string, unknown>): QueryResult<Session> {
    try {
      const sessionId = this.generateSessionId();
      const metadataJson = metadata ? JSON.stringify(metadata) : null;

      this.db.run(
        `INSERT INTO sessions (session_id, game_url, status, metadata)
         VALUES (?, ?, ?, ?)`,
        [sessionId, gameUrl, 'active', metadataJson]
      );

      // Save database after insert
      this.db.save();

      const session = this.findBySessionId(sessionId);
      
      if (!session.success || !session.data) {
        throw new Error('Failed to retrieve created session');
      }

      return {
        success: true,
        data: session.data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find session by session ID
   */
  public findBySessionId(sessionId: string): QueryResult<Session> {
    try {
      const row = this.db.get<any>(
        'SELECT * FROM sessions WHERE session_id = ?',
        [sessionId]
      );

      if (!row) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      return {
        success: true,
        data: this.mapRowToSession(row),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Find session by database ID
   */
  public findById(id: number): QueryResult<Session> {
    try {
      const row = this.db.get<any>(
        'SELECT * FROM sessions WHERE id = ?',
        [id]
      );

      if (!row) {
        return {
          success: false,
          error: 'Session not found',
        };
      }

      return {
        success: true,
        data: this.mapRowToSession(row),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all sessions with optional status filter
   */
  public findAll(status?: SessionStatus): QueryResult<Session[]> {
    try {
      const rows = status
        ? this.db.all<any>('SELECT * FROM sessions WHERE status = ? ORDER BY started_at DESC', [status])
        : this.db.all<any>('SELECT * FROM sessions ORDER BY started_at DESC');

      return {
        success: true,
        data: rows.map(row => this.mapRowToSession(row)),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update session status
   */
  public updateStatus(sessionId: string, status: SessionStatus): QueryResult<Session> {
    try {
      const endedAt = (status === 'completed' || status === 'failed') ? new Date().toISOString() : null;

      this.db.run(
        `UPDATE sessions SET status = ?, ended_at = ? WHERE session_id = ?`,
        [status, endedAt, sessionId]
      );

      // Save database after update
      this.db.save();

      return this.findBySessionId(sessionId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update session metadata
   */
  public updateMetadata(sessionId: string, metadata: Record<string, unknown>): QueryResult<Session> {
    try {
      const metadataJson = JSON.stringify(metadata);

      this.db.run(
        'UPDATE sessions SET metadata = ? WHERE session_id = ?',
        [metadataJson, sessionId]
      );

      // Save database after update
      this.db.save();

      return this.findBySessionId(sessionId);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete session and all associated data
   */
  public delete(sessionId: string): QueryResult<boolean> {
    try {
      const result = this.db.run(
        'DELETE FROM sessions WHERE session_id = ?',
        [sessionId]
      );

      // Save database after delete
      this.db.save();

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
   * Get active sessions count
   */
  public getActiveCount(): number {
    const result = this.db.get<{ count: number }>(
      "SELECT COUNT(*) as count FROM sessions WHERE status = 'active'"
    );
    return result?.count ?? 0;
  }

  /**
   * Map database row to Session object
   */
  private mapRowToSession(row: any): Session {
    return {
      id: row.id,
      sessionId: row.session_id,
      gameUrl: row.game_url,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : undefined,
      status: row.status as SessionStatus,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
