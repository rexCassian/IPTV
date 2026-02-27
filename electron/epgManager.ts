import { BrowserWindow } from 'electron';
import https from 'https';
import http from 'http';
import { XMLParser } from 'fast-xml-parser';
import { EpgDatabase } from './epgDatabase';
import { URL } from 'url';

interface XmltvProgramme {
    '@_start': string;
    '@_stop': string;
    '@_channel': string;
    title: string | { '#text': string } | Array<string | { '#text': string }>;
    desc?: string | { '#text': string } | Array<string | { '#text': string }>;
    category?: string | { '#text': string } | Array<string | { '#text': string }>;
}

interface XmltvChannel {
    '@_id': string;
    'display-name': string | { '#text': string } | Array<string | { '#text': string }>;
    icon?: { '@_src': string } | Array<{ '@_src': string }>;
}

export class EpgManager {
    private database: EpgDatabase;
    private mainWindow: BrowserWindow;
    private refreshTimer: ReturnType<typeof setInterval> | null = null;
    private isRefreshing = false;

    constructor(database: EpgDatabase, mainWindow: BrowserWindow) {
        this.database = database;
        this.mainWindow = mainWindow;

        // Auto-refresh every 6 hours
        this.refreshTimer = setInterval(() => {
            // Will be triggered by settings
        }, 6 * 60 * 60 * 1000);
    }

    async refresh(epgUrls: string[]): Promise<void> {
        if (this.isRefreshing || epgUrls.length === 0) return;
        this.isRefreshing = true;

        try {
            // Clear old data
            this.database.clearOldData();

            for (const url of epgUrls) {
                try {
                    console.log(`[EPG] Fetching: ${url}`);
                    const xml = await this.fetchXml(url);
                    console.log(`[EPG] Parsing XML (${(xml.length / 1024 / 1024).toFixed(1)}MB)...`);
                    this.parseAndStore(xml);
                    console.log('[EPG] Parse complete');
                } catch (error) {
                    console.error(`[EPG] Error processing ${url}:`, error);
                    // Continue with other URLs
                }
            }

            this.mainWindow.webContents.send('epg:updated');
        } finally {
            this.isRefreshing = false;
        }
    }

    private fetchXml(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const requestModule = parsedUrl.protocol === 'https:' ? https : http;

            const req = requestModule.get(
                url,
                {
                    headers: { 'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20' },
                    timeout: 60000,
                    rejectUnauthorized: false,
                },
                (res) => {
                    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        this.fetchXml(res.headers.location).then(resolve).catch(reject);
                        return;
                    }

                    if (res.statusCode && res.statusCode !== 200) {
                        reject(new Error(`EPG fetch failed: HTTP ${res.statusCode}`));
                        return;
                    }

                    const chunks: Buffer[] = [];
                    res.on('data', (chunk: Buffer) => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
                    res.on('error', reject);
                },
            );

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('EPG fetch timeout'));
            });
        });
    }

    private parseAndStore(xml: string): void {
        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            isArray: (name) => name === 'programme' || name === 'channel',
        });

        let parsed: Record<string, unknown>;
        try {
            parsed = parser.parse(xml);
        } catch {
            throw new Error('XMLTV ayrıştırma hatası: Geçersiz XML formatı');
        }

        const tv = parsed.tv as Record<string, unknown>;
        if (!tv) {
            throw new Error('XMLTV formatı geçersiz: <tv> elementi bulunamadı');
        }

        // Parse channels
        const xmlChannels = (tv.channel || []) as XmltvChannel[];
        const epgChannels = xmlChannels.map((ch) => ({
            id: ch['@_id'],
            displayName: this.extractText(ch['display-name']),
            iconUrl: Array.isArray(ch.icon) ? ch.icon[0]?.['@_src'] || '' : ch.icon?.['@_src'] || '',
        }));

        if (epgChannels.length > 0) {
            this.database.insertChannels(epgChannels);
        }

        // Parse programmes in batches
        const xmlProgrammes = (tv.programme || []) as XmltvProgramme[];
        const batchSize = 1000;

        for (let i = 0; i < xmlProgrammes.length; i += batchSize) {
            const batch = xmlProgrammes.slice(i, i + batchSize);
            const programs = batch
                .map((prog) => {
                    try {
                        return {
                            channelId: prog['@_channel'],
                            title: this.extractText(prog.title),
                            description: this.extractText(prog.desc),
                            startTime: this.parseXmltvDate(prog['@_start']),
                            endTime: this.parseXmltvDate(prog['@_stop']),
                            category: this.extractText(prog.category),
                        };
                    } catch {
                        return null;
                    }
                })
                .filter((p): p is NonNullable<typeof p> => p !== null);

            if (programs.length > 0) {
                this.database.insertPrograms(programs);
            }
        }
    }

    private extractText(value: unknown): string {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (Array.isArray(value)) {
            const first = value[0];
            if (typeof first === 'string') return first;
            if (first && typeof first === 'object' && '#text' in first) return (first as { '#text': string })['#text'];
            return '';
        }
        if (typeof value === 'object' && value !== null && '#text' in value) {
            return (value as { '#text': string })['#text'];
        }
        return String(value);
    }

    private parseXmltvDate(dateStr: string): number {
        // XMLTV format: 20240101120000 +0300
        if (!dateStr) return 0;

        const clean = dateStr.replace(/\s+/g, '');
        const match = clean.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);

        if (!match) return 0;

        const [, year, month, day, hour, minute, second, tz] = match;
        let dateString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

        if (tz) {
            dateString += `${tz.slice(0, 3)}:${tz.slice(3)}`;
        } else {
            dateString += '+00:00';
        }

        return Math.floor(new Date(dateString).getTime() / 1000);
    }

    destroy(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }
}
