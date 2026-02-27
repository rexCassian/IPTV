import https from 'https';
import http from 'http';
import { URL } from 'url';

interface StreamCheckResult {
    alive: boolean;
    latency: number;
    statusCode?: number;
    contentType?: string;
    error?: string;
}

export class StreamChecker {
    private timeout = 5000;

    async check(url: string): Promise<StreamCheckResult> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            let parsedUrl: URL;
            try {
                parsedUrl = new URL(url);
            } catch {
                resolve({ alive: false, latency: 0, error: 'Geçersiz URL' });
                return;
            }

            const requestModule = parsedUrl.protocol === 'https:' ? https : http;

            const req = requestModule.request(
                url,
                {
                    method: 'HEAD',
                    headers: {
                        'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
                    },
                    timeout: this.timeout,
                    rejectUnauthorized: false,
                },
                (res) => {
                    const latency = Date.now() - startTime;
                    const statusCode = res.statusCode || 0;

                    // Accept 2xx and 3xx as alive
                    const alive = statusCode >= 200 && statusCode < 400;

                    resolve({
                        alive,
                        latency,
                        statusCode,
                        contentType: res.headers['content-type'] || undefined,
                    });

                    // Consume response to free socket
                    res.resume();
                },
            );

            req.on('error', (err) => {
                resolve({
                    alive: false,
                    latency: Date.now() - startTime,
                    error: err.message,
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve({
                    alive: false,
                    latency: Date.now() - startTime,
                    error: 'Zaman aşımı',
                });
            });

            req.end();
        });
    }

    async checkMultiple(urls: string[]): Promise<Map<string, StreamCheckResult>> {
        const results = new Map<string, StreamCheckResult>();
        const concurrency = 10;

        for (let i = 0; i < urls.length; i += concurrency) {
            const batch = urls.slice(i, i + concurrency);
            const batchResults = await Promise.all(
                batch.map(async (url) => {
                    const result = await this.check(url);
                    return { url, result };
                }),
            );
            for (const { url, result } of batchResults) {
                results.set(url, result);
            }
        }

        return results;
    }
}
