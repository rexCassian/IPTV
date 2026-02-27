export function detectStreamType(url: string): 'hls' | 'mpegts' | 'mp4' | 'unknown' {
    const lower = url.toLowerCase();

    // HLS
    if (lower.includes('.m3u8')) return 'hls';

    // Direct MPEG-TS
    if (lower.endsWith('.ts')) return 'mpegts';

    // Common Xtream Codes ports
    if (lower.includes(':8080/') || lower.includes(':25461/') || lower.includes(':8000/')) return 'mpegts';

    // Xtream Codes URL pattern: /live/user/pass/id
    if (/\/live\/[^/]+\/[^/]+\/\d+/.test(lower)) return 'mpegts';

    // MP4
    if (lower.includes('.mp4')) return 'mp4';

    // Default to HLS
    return 'hls';
}

export function getStreamTypeLabel(type: string): string {
    switch (type) {
        case 'hls': return 'HLS';
        case 'mpegts': return 'MPEG-TS';
        case 'mp4': return 'MP4';
        default: return 'Unknown';
    }
}
