import { usePlayerStore } from '../store/playerStore';
import { useChannelStore } from '../store/channelStore';
import { detectStreamEngine } from './streamDetector';
import type { Channel } from '../types/channel';

let proxyPort: number | null = null;

async function getProxyPort(): Promise<number> {
    if (proxyPort) return proxyPort;
    proxyPort = await window.electronAPI.proxy.getPort();
    return proxyPort;
}

/**
 * Play a channel — callable from anywhere without prop drilling.
 *
 * Engine routing:
 *   'mpegts' → mpegts.js in-browser (live MPEG-TS + HLS)
 *   'mp4'    → native HTML5 <video> (VOD .mp4 files)
 *
 * Electron session interceptor handles auth headers — no proxy needed.
 */
export async function playChannel(channel: Channel): Promise<void> {
    const { setCurrentChannel, setStatus, setEngine, setUrl, setError } = usePlayerStore.getState();

    setCurrentChannel(channel);
    setStatus('loading');
    setError(null);

    const engine = detectStreamEngine(channel.url, channel.contentType);

    console.log('[playChannel]', {
        name: channel.name,
        contentType: channel.contentType,
        engine,
    });

    if (engine === 'mp4') {
        const url = channel.url;
        const needsProxy = /\.(mkv|avi|wmv|flv)(\?|$)/i.test(url);

        if (needsProxy) {
            // MKV/AVI → proxy üzerinden (Node.js Firefox UA ile bağlanır)
            try {
                const port = await getProxyPort();
                setEngine('mp4');
                setUrl(`http://127.0.0.1:${port}/stream?url=${encodeURIComponent(url)}`);
            } catch {
                setError('Proxy bağlantısı kurulamadı');
                setStatus('error');
            }
        } else {
            // MP4 → direkt (session interceptor header ekler)
            setEngine('mp4');
            setUrl(url);
        }
    } else {
        // Live MPEG-TS/HLS → mpegts.js handles directly
        setEngine('mpegts');
        setUrl(channel.url);
    }

    // Track history
    try {
        await window.electronAPI.history.add(channel.id);
    } catch {
        // ignore
    }
}

/**
 * Play channel by index in the filtered list.
 */
export function playChannelByIndex(index: number): void {
    const { filteredChannels } = useChannelStore.getState();
    const channel = filteredChannels[index];
    if (channel) playChannel(channel);
}
