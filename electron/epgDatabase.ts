import path from 'path';
import { app } from 'electron';
import fs from 'fs';

// sql.js is loaded dynamically at runtime
let initSqlJs: any = null;

interface Program {
    id: number;
    channelId: string;
    title: string;
    description: string;
    startTime: number;
    endTime: number;
    category: string;
}

interface EpgChannel {
    id: string;
    displayName: string;
    iconUrl: string;
}

export class EpgDatabase {
    private db: any = null;
    private dbPath: string;
    private initialized = false;

    constructor() {
        this.dbPath = path.join(app.getPath('userData'), 'epg.db');
        this.init();
    }

    private async init(): Promise<void> {
        try {
            // Dynamic import of sql.js
            const sqlJsModule = await import('sql.js');
            initSqlJs = sqlJsModule.default;

            const SQL = await initSqlJs();

            // Load existing database if present
            let buffer: Buffer | null = null;
            try {
                if (fs.existsSync(this.dbPath)) {
                    buffer = fs.readFileSync(this.dbPath);
                }
            } catch {
                // Will create new DB
            }

            this.db = buffer ? new SQL.Database(buffer) : new SQL.Database();

            // Create schema
            this.db.run(`
        CREATE TABLE IF NOT EXISTS programs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          start_time INTEGER NOT NULL,
          end_time INTEGER NOT NULL,
          category TEXT DEFAULT ''
        );
      `);

            this.db.run(`CREATE INDEX IF NOT EXISTS idx_programs_channel_time ON programs(channel_id, start_time);`);
            this.db.run(`CREATE INDEX IF NOT EXISTS idx_programs_time ON programs(start_time, end_time);`);

            this.db.run(`
        CREATE TABLE IF NOT EXISTS channels_epg (
          id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          icon_url TEXT DEFAULT ''
        );
      `);

            this.initialized = true;
            this.save();
        } catch (error) {
            console.error('[EpgDatabase] Init error:', error);
        }
    }

    private save(): void {
        if (!this.db) return;
        try {
            const data = this.db.export();
            const buffer = Buffer.from(data);
            fs.writeFileSync(this.dbPath, buffer);
        } catch (error) {
            console.error('[EpgDatabase] Save error:', error);
        }
    }

    private ensureReady(): boolean {
        return this.initialized && this.db !== null;
    }

    insertPrograms(programs: Omit<Program, 'id'>[]): void {
        if (!this.ensureReady()) return;

        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO programs (channel_id, title, description, start_time, end_time, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

        for (const p of programs) {
            stmt.run([p.channelId, p.title, p.description, p.startTime, p.endTime, p.category]);
        }
        stmt.free();
        this.save();
    }

    insertChannels(channels: EpgChannel[]): void {
        if (!this.ensureReady()) return;

        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO channels_epg (id, display_name, icon_url)
      VALUES (?, ?, ?)
    `);

        for (const ch of channels) {
            stmt.run([ch.id, ch.displayName, ch.iconUrl]);
        }
        stmt.free();
        this.save();
    }

    getPrograms(channelId: string, date: string): Program[] {
        if (!this.ensureReady()) return [];

        const dayStart = new Date(date).getTime() / 1000;
        const dayEnd = dayStart + 86400;

        const stmt = this.db.prepare(`
      SELECT id, channel_id, title, description, start_time, end_time, category
      FROM programs
      WHERE channel_id = ? AND start_time < ? AND end_time > ?
      ORDER BY start_time ASC
    `);
        stmt.bind([channelId, dayEnd, dayStart]);

        const results: Program[] = [];
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push({
                id: row.id as number,
                channelId: row.channel_id as string,
                title: row.title as string,
                description: (row.description as string) || '',
                startTime: row.start_time as number,
                endTime: row.end_time as number,
                category: (row.category as string) || '',
            });
        }
        stmt.free();
        return results;
    }

    getCurrentProgram(channelId: string): Program | null {
        if (!this.ensureReady()) return null;

        const now = Math.floor(Date.now() / 1000);
        const stmt = this.db.prepare(`
      SELECT id, channel_id, title, description, start_time, end_time, category
      FROM programs
      WHERE channel_id = ? AND start_time <= ? AND end_time > ?
      ORDER BY start_time DESC
      LIMIT 1
    `);
        stmt.bind([channelId, now, now]);

        let result: Program | null = null;
        if (stmt.step()) {
            const row = stmt.getAsObject();
            result = {
                id: row.id as number,
                channelId: row.channel_id as string,
                title: row.title as string,
                description: (row.description as string) || '',
                startTime: row.start_time as number,
                endTime: row.end_time as number,
                category: (row.category as string) || '',
            };
        }
        stmt.free();
        return result;
    }

    getNextProgram(channelId: string): Program | null {
        if (!this.ensureReady()) return null;

        const now = Math.floor(Date.now() / 1000);
        const stmt = this.db.prepare(`
      SELECT id, channel_id, title, description, start_time, end_time, category
      FROM programs
      WHERE channel_id = ? AND start_time > ?
      ORDER BY start_time ASC
      LIMIT 1
    `);
        stmt.bind([channelId, now]);

        let result: Program | null = null;
        if (stmt.step()) {
            const row = stmt.getAsObject();
            result = {
                id: row.id as number,
                channelId: row.channel_id as string,
                title: row.title as string,
                description: (row.description as string) || '',
                startTime: row.start_time as number,
                endTime: row.end_time as number,
                category: (row.category as string) || '',
            };
        }
        stmt.free();
        return result;
    }

    getChannels(): EpgChannel[] {
        if (!this.ensureReady()) return [];

        const results: EpgChannel[] = [];
        const stmt = this.db.prepare('SELECT id, display_name, icon_url FROM channels_epg');
        while (stmt.step()) {
            const row = stmt.getAsObject();
            results.push({
                id: row.id as string,
                displayName: row.display_name as string,
                iconUrl: (row.icon_url as string) || '',
            });
        }
        stmt.free();
        return results;
    }

    hasData(): boolean {
        if (!this.ensureReady()) return false;
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM programs');
        stmt.step();
        const row = stmt.getAsObject();
        stmt.free();
        return (row.count as number) > 0;
    }

    clearOldData(): void {
        if (!this.ensureReady()) return;
        const oneDayAgo = Math.floor(Date.now() / 1000) - 86400;
        this.db.run('DELETE FROM programs WHERE end_time < ?', [oneDayAgo]);
        this.save();
    }

    clearAll(): void {
        if (!this.ensureReady()) return;
        this.db.run('DELETE FROM programs');
        this.db.run('DELETE FROM channels_epg');
        this.save();
    }

    close(): void {
        if (this.db) {
            this.save();
            this.db.close();
            this.db = null;
        }
    }
}
