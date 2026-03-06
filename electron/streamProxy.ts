import http from 'http';
import https from 'https';
import { URL } from 'url';
import type { AddressInfo } from 'net';

/**
 * Local HTTP proxy for IPTV VOD streams.
 *
 * Solves two problems:
 * 1. IPTV servers reject requests without VLC User-Agent → 401 Unauthorized
 * 2. HTML5 <video> can't send custom headers
 *
 * Usage: <video src="http://localhost:PORT/?url=ENCODED_IPTV_URL" />
 *
 * The proxy fetches the IPTV URL with proper headers and pipes the response.
 */
export class StreamProxy {
    private server: http.Server | null = null;
    private port = 0;

    getPort(): number {
        return this.port;
    }

    getProxyUrl(originalUrl: string): string {
        return `http://127.0.0.1:${this.port}/stream?url=${encodeURIComponent(originalUrl)}`;
    }

    start(): Promise<number> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });

            this.server.listen(0, '127.0.0.1', () => {
                const addr = this.server!.address() as AddressInfo;
                this.port = addr.port;
                console.log(`[StreamProxy] Listening on http://127.0.0.1:${this.port}`);
                resolve(this.port);
            });

            this.server.on('error', (err) => {
                console.error('[StreamProxy] Server error:', err);
                reject(err);
            });
        });
    }

    stop(): void {
        this.server?.close();
        this.server = null;
    }

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        // Parse the target URL from query string
        const parsed = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
        const targetUrl = parsed.searchParams.get('url');

        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing url parameter');
            return;
        }

        let target: URL;
        try {
            target = new URL(targetUrl);
        } catch {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid url parameter');
            return;
        }

        const isHttps = target.protocol === 'https:';
        const requestModule = isHttps ? https : http;

        // Build headers — mimic browser (M3U user-agent="Firefox/100.0")
        const origin = `${target.protocol}//${target.host}`;
        const proxyHeaders: Record<string, string> = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0',
            'Accept': '*/*',
            'Connection': 'keep-alive',
            'Referer': origin + '/',
            'Origin': origin,
        };

        // Forward Range header for seeking support
        if (req.headers.range) {
            proxyHeaders['Range'] = req.headers.range;
        }

        const options = {
            hostname: target.hostname,
            port: target.port || (isHttps ? 443 : 80),
            path: target.pathname + target.search,
            method: 'GET',
            headers: proxyHeaders,
            timeout: 30000,
            rejectUnauthorized: false,
        };

        const proxyReq = requestModule.request(options, (proxyRes) => {
            // Follow redirects
            if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
                const redirectUrl = proxyRes.headers.location;
                // Rewrite the request to follow the redirect
                const newParsed = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
                newParsed.searchParams.set('url', redirectUrl);
                req.url = newParsed.pathname + newParsed.search;
                this.handleRequest(req, res);
                proxyRes.destroy();
                return;
            }

            // Copy response headers
            const responseHeaders: Record<string, string | string[]> = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Range',
                'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
            };

            if (proxyRes.headers['content-type']) {
                responseHeaders['Content-Type'] = proxyRes.headers['content-type'];
            }
            if (proxyRes.headers['content-length']) {
                responseHeaders['Content-Length'] = proxyRes.headers['content-length'];
            }
            if (proxyRes.headers['content-range']) {
                responseHeaders['Content-Range'] = proxyRes.headers['content-range'];
            }
            if (proxyRes.headers['accept-ranges']) {
                responseHeaders['Accept-Ranges'] = proxyRes.headers['accept-ranges'];
            }

            res.writeHead(proxyRes.statusCode || 200, responseHeaders);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error('[StreamProxy] Request error:', err.message);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
                res.end(`Proxy error: ${err.message}`);
            }
        });

        proxyReq.on('timeout', () => {
            proxyReq.destroy();
            if (!res.headersSent) {
                res.writeHead(504, { 'Content-Type': 'text/plain' });
                res.end('Proxy timeout');
            }
        });

        req.on('close', () => {
            proxyReq.destroy();
        });

        proxyReq.end();
    }
}
