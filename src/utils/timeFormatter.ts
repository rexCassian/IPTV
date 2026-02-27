import { format, formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export function formatTime(timestamp: number): string {
    return format(new Date(timestamp * 1000), 'HH:mm');
}

export function formatDateTime(timestamp: number): string {
    return format(new Date(timestamp * 1000), 'dd MMM HH:mm', { locale: tr });
}

export function formatDuration(startTime: number, endTime: number): string {
    const minutes = Math.round((endTime - startTime) / 60);
    if (minutes < 60) return `${minutes} dk`;
    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;
    return remaining > 0 ? `${hours}s ${remaining}dk` : `${hours}s`;
}

export function formatTimeUntil(timestamp: number): string {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true, locale: tr });
}

export function getProgressPercent(startTime: number, endTime: number): number {
    const now = Date.now() / 1000;
    const total = endTime - startTime;
    if (total <= 0) return 0;
    const elapsed = now - startTime;
    return Math.max(0, Math.min(100, (elapsed / total) * 100));
}

export function formatBitrate(kbps: number): string {
    if (kbps >= 1000) {
        return `${(kbps / 1000).toFixed(1)} Mbps`;
    }
    return `${kbps} Kbps`;
}

export function formatResolution(width: number, height: number): string {
    if (width === 0 || height === 0) return '';
    if (height >= 2160) return '4K';
    if (height >= 1080) return '1080p';
    if (height >= 720) return '720p';
    if (height >= 480) return '480p';
    return `${width}×${height}`;
}
