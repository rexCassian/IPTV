import { parentPort } from 'worker_threads';
import { classifyAllChannels } from './contentClassifier';

interface Channel {
    id: string;
    name: string;
    url: string;
    logo: string;
    group: string;
    country: string;
    language: string;
    streamType: string;
    contentType: string;
}

function parseM3uContent(content: string): Channel[] {
    const lines = content.split(/\r?\n/);
    const channels: Channel[] = [];

    if (!lines[0]?.trim().startsWith('#EXTM3U')) {
        throw new Error('Invalid M3U format');
    }

    let currentInfo: Partial<Channel> | null = null;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
            currentInfo = parseExtInf(line);
            if (channels.length % 500 === 0 && parentPort) {
                parentPort.postMessage({ type: 'progress', loaded: channels.length });
            }
        } else if (line.startsWith('#')) {
            continue;
        } else if (currentInfo) {
            const url = line;
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('rtsp://')) {
                const group = currentInfo.group || 'Uncategorized';
                channels.push({
                    id: generateId(currentInfo.name || '', url),
                    name: currentInfo.name || 'Unknown',
                    url,
                    logo: currentInfo.logo || '',
                    group,
                    country: currentInfo.country || '',
                    language: currentInfo.language || '',
                    streamType: detectStreamType(url),
                    contentType: 'live', // will be overwritten below
                });
            }
            currentInfo = null;
        }
    }

    // Classify on the worker thread — no UI blocking
    const classified = classifyAllChannels(channels);
    return classified;
}

function parseExtInf(line: string): Partial<Channel> {
    const info: Partial<Channel> = {};
    const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
    if (logoMatch) info.logo = logoMatch[1];
    const groupMatch = line.match(/group-title="([^"]*)"/i);
    if (groupMatch) info.group = groupMatch[1];
    const countryMatch = line.match(/tvg-country="([^"]*)"/i);
    if (countryMatch) info.country = countryMatch[1];
    const langMatch = line.match(/tvg-language="([^"]*)"/i);
    if (langMatch) info.language = langMatch[1];
    const nameMatch = line.match(/,\s*(.+)$/);
    if (nameMatch) info.name = nameMatch[1].trim();
    return info;
}

function detectStreamType(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8')) return 'hls';
    if (lower.endsWith('.ts') || lower.includes(':8080/') || lower.includes(':25461/')) return 'mpegts';
    return 'hls';
}

function generateId(name: string, url: string): string {
    let hash = 0;
    const str = name + url;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return `ch_${Math.abs(hash).toString(36)}`;
}

// Worker entry point
if (parentPort) {
    parentPort.on('message', (data: { content: string }) => {
        try {
            const channels = parseM3uContent(data.content);
            parentPort!.postMessage({ type: 'done', channels });
        } catch (error) {
            parentPort!.postMessage({
                type: 'error',
                message: error instanceof Error ? error.message : 'Parse error',
            });
        }
    });
}
