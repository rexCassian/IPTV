import { usePlayerStore } from '../store/playerStore';
import { useChannelStore } from '../store/channelStore';
import type { Channel } from '../types/channel';

function detectStreamType(url: string): 'hls' | 'mpegts' {
    const lower = url.toLowerCase();
    if (lower.includes('.m3u8')) return 'hls';
    if (lower.endsWith('.ts')) return 'mpegts';
    if (/\/live\/[^/]+\/[^/]+\/\d+/.test(lower) && !lower.includes('.m3u8')) return 'mpegts';
    if (lower.includes(':8080/') || lower.includes(':25461/') || lower.includes(':8000/')) return 'mpegts';
    return 'hls';
}

/**
 * Play a channel — callable from anywhere without prop drilling.
 * Directly updates Zustand store and calls Electron IPC.
 */
export async function playChannel(channel: Channel): Promise<void> {
    const { setCurrentChannel, setStatus, setEngine, setUrl, setError } = usePlayerStore.getState();

    setCurrentChannel(channel);
    setStatus('loading');
    setError(null);

    const streamType = detectStreamType(channel.url);

    if (streamType === 'hls') {
        setEngine('mpv');
        try {
            await window.electronAPI.player.play(channel.url, 'hls');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Kanal açılamadı');
        }
    } else {
        setEngine('mpegts');
        setUrl(channel.url);
        // MpegtsPlayer component picks up the url change and starts playing
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
