/**
 * Xtream Codes API'sinden altyazı listesi çeker.
 * URL'den credentials parse eder, API'ye istek atar.
 */

export interface XtreamCreds {
    host: string;       // http://tv.slvpro.xyz:8080
    username: string;   // SLV4106
    password: string;   // 4FJU653R5FDA
    streamId: string;   // 66531
    type: 'movie' | 'series';
}

export interface XtreamSubtitle {
    url: string;
    label: string;
    language: string;
}

/**
 * Xtream Codes VOD URL'sinden credentials parse et.
 *
 * URL formatları:
 *   http://host:port/movie/USER/PASS/ID.mp4
 *   http://host:port/series/USER/PASS/ID.mp4
 */
export function parseXtreamVodUrl(url: string): XtreamCreds | null {
    try {
        const match = url.match(
            /^(https?:\/\/[^/]+)\/(movie|series)\/([^/]+)\/([^/]+)\/(\d+)\./i
        );
        if (!match) return null;
        return {
            host: match[1],
            type: match[2].toLowerCase() as 'movie' | 'series',
            username: match[3],
            password: match[4],
            streamId: match[5],
        };
    } catch {
        return null;
    }
}

/**
 * Xtream Codes API'sinden altyazıları çek.
 * Sunucu altyazı desteklemiyorsa boş dizi döner — asla hata fırlatmaz.
 */
export async function fetchXtreamSubtitles(
    creds: XtreamCreds
): Promise<XtreamSubtitle[]> {
    try {
        const apiType = creds.type === 'movie' ? 'get_vod_info' : 'get_series_info';
        const apiUrl = `${creds.host}/player_api.php?username=${creds.username}&password=${creds.password}&action=${apiType}&vod_id=${creds.streamId}`;

        const res = await fetch(apiUrl, {
            signal: AbortSignal.timeout(5000), // 5sn timeout
        });

        if (!res.ok) return [];

        const data = await res.json();

        // Altyazıları çıkar — Xtream API formatı değişken olabilir
        const subtitles: XtreamSubtitle[] = [];

        // Format 1: data.info.subtitles array
        if (Array.isArray(data?.info?.subtitles)) {
            for (const sub of data.info.subtitles) {
                if (sub.url) {
                    subtitles.push({
                        url: sub.url,
                        label: sub.name || sub.lang || 'Altyazı',
                        language: sub.lang || 'und',
                    });
                }
            }
        }

        // Format 2: data.subtitles array
        if (Array.isArray(data?.subtitles)) {
            for (const sub of data.subtitles) {
                if (sub.url) {
                    subtitles.push({
                        url: sub.url,
                        label: sub.name || sub.lang || 'Altyazı',
                        language: sub.lang || 'und',
                    });
                }
            }
        }

        return subtitles;
    } catch {
        // Timeout, ağ hatası, parse hatası — sessizce boş döner
        return [];
    }
}
