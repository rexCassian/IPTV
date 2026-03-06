import type { ContentType } from '../types/content';

export type StreamEngine = 'mpegts' | 'mp4' | 'mpv';

/**
 * Detect stream type from URL pattern and content type.
 * Returns the engine to use for playback.
 *
 * URL patterns (Xtream Codes):
 *   Live:   http://host:8080/user/pass/377           → mpegts
 *   Movie:  http://host:8080/user/pass/movie/...mp4  → mp4
 *   Series: http://host:8080/user/pass/series/...mp4 → mp4
 *   HLS:    http://host/stream.m3u8                  → mpegts (mpegts.js supports HLS too)
 */
export function detectStreamEngine(
    url: string,
    contentType?: ContentType,
): StreamEngine {
    const lower = url.toLowerCase();

    // 1. Explicit file extensions always win
    if (lower.includes('.mp4') || lower.includes('.mkv') || lower.includes('.avi')) {
        return 'mp4';
    }

    // 2. Xtream Codes /movie/ or /series/ path → MP4 (VOD download)
    if (/\/(movie|series)\//i.test(lower)) {
        return 'mp4';
    }

    // 3. HLS → mpegts.js supports HLS natively
    if (lower.includes('.m3u8')) {
        return 'mpegts';
    }

    // 4. Content type hint from classifier
    if (contentType === 'movie' || contentType === 'series') {
        return 'mp4';
    }

    // 5. Everything else (live MPEG-TS, numeric IDs, etc.) → mpegts.js
    return 'mpegts';
}
