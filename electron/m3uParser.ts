import https from 'https';
import http from 'http';
import fs from 'fs';
import { URL } from 'url';
import { classifyGroup } from './contentClassifier';

interface Channel {
    id: string;
    name: string;
    url: string;
    logo: string;
    group: string;
    country: string;
    language: string;
    streamType: string;
    contentType: 'live' | 'movie' | 'series';
}

interface ParseProgress {
    loaded: number;
    total: number;
}

export class M3uParser {
    async parse(source: string, onProgress?: (progress: ParseProgress) => void): Promise<Channel[]> {
        let content: string;

        if (source.startsWith('http://') || source.startsWith('https://')) {
            content = await this.fetchUrl(source);
        } else {
            content = await fs.promises.readFile(source, 'utf-8');
        }

        return this.parseContent(content, onProgress);
    }

    private fetchUrl(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const parsedUrl = new URL(url);
            const requestModule = parsedUrl.protocol === 'https:' ? https : http;

            const req = requestModule.get(
                url,
                {
                    headers: { 'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20' },
                    timeout: 30000,
                    rejectUnauthorized: false,
                },
                (res) => {
                    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        this.fetchUrl(res.headers.location).then(resolve).catch(reject);
                        return;
                    }
                    if (res.statusCode && res.statusCode !== 200) {
                        reject(new Error(`M3U indirme hatası: HTTP ${res.statusCode}`));
                        return;
                    }
                    const chunks: Buffer[] = [];
                    res.on('data', (chunk: Buffer) => chunks.push(chunk));
                    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
                    res.on('error', reject);
                },
            );

            req.on('error', (err) => reject(new Error(`M3U URL'e erişilemiyor: ${err.message}`)));
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('M3U indirme zaman aşımı (30sn)'));
            });
        });
    }

    private parseContent(content: string, onProgress?: (progress: ParseProgress) => void): Channel[] {
        const lines = content.split(/\r?\n/);
        const channels: Channel[] = [];

        if (!lines[0]?.trim().startsWith('#EXTM3U')) {
            throw new Error('Geçersiz M3U formatı: #EXTM3U başlığı bulunamadı');
        }

        let currentInfo: Partial<Channel> | null = null;
        const totalLines = lines.length;
        let progressCounter = 0;

        for (let i = 1; i < totalLines; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith('#EXTINF:')) {
                currentInfo = this.parseExtInf(line);
                progressCounter++;
                if (onProgress && progressCounter % 200 === 0) {
                    onProgress({ loaded: channels.length, total: Math.floor(totalLines / 2) });
                }
            } else if (line.startsWith('#EXTVLCOPT:') || line.startsWith('#KODIPROP:')) {
                continue;
            } else if (line.startsWith('#')) {
                continue;
            } else if (currentInfo) {
                const url = line;
                if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('rtsp://')) {
                    const group = currentInfo.group || 'Kategorisiz';
                    const channel: Channel = {
                        id: this.generateId(currentInfo.name || '', url),
                        name: currentInfo.name || 'Bilinmeyen Kanal',
                        url,
                        logo: currentInfo.logo || '',
                        group,
                        country: currentInfo.country || '',
                        language: currentInfo.language || '',
                        streamType: this.detectStreamType(url),
                        contentType: classifyGroup(group),
                    };
                    channels.push(channel);
                }
                currentInfo = null;
            }
        }

        if (onProgress) {
            onProgress({ loaded: channels.length, total: channels.length });
        }

        return channels;
    }

    private parseExtInf(line: string): Partial<Channel> {
        const info: Partial<Channel> = {};

        // Extract attributes from tvg-* tags
        const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        if (logoMatch) info.logo = logoMatch[1];

        const groupMatch = line.match(/group-title="([^"]*)"/i);
        if (groupMatch) info.group = groupMatch[1];

        const countryMatch = line.match(/tvg-country="([^"]*)"/i);
        if (countryMatch) info.country = countryMatch[1];

        const languageMatch = line.match(/tvg-language="([^"]*)"/i);
        if (languageMatch) info.language = languageMatch[1];

        // ─── FIX: Channel name is ALWAYS the text after the LAST comma ───
        // #EXTINF:-1 tvg-id="..." tvg-logo="..." group-title="...",Channel Name Here
        // Using split(',').slice(-1)[0] guarantees we get only the name part,
        // never the attributes before the comma.
        const parts = line.split(',');
        const name = parts.length > 1 ? parts.slice(1).join(',').trim() : '';
        if (name) info.name = name;

        return info;
    }

    private detectStreamType(url: string): string {
        const lower = url.toLowerCase();
        if (lower.includes('.m3u8')) return 'hls';
        if (lower.endsWith('.ts') || lower.includes(':8080/') || lower.includes(':25461/')) return 'mpegts';
        if (lower.includes('.mp4')) return 'mp4';
        if (lower.match(/\/[\w]+\/[\w]+\/\d+/)) return 'mpegts';
        return 'hls';
    }

    private generateId(name: string, url: string): string {
        let hash = 0;
        const str = name + url;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return `ch_${Math.abs(hash).toString(36)}`;
    }
}
