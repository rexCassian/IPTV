import http from 'http';
import https from 'https';
import { URL } from 'url';

let proxyServer: http.Server | null = null;
let proxyPort = 0;

export function startMpegtsProxy(): Promise<number> {
    return new Promise((resolve, reject) => {
        if (proxyServer) {
            resolve(proxyPort);
            return;
        }

        proxyServer = http.createServer((clientReq, clientRes) => {
            const targetUrl = clientReq.headers['x-target-url'] as string;
            if (!targetUrl) {
                clientRes.writeHead(400);
                clientRes.end('Missing X-Target-URL header');
                return;
            }

            let parsedUrl: URL;
            try {
                parsedUrl = new URL(targetUrl);
            } catch {
                clientRes.writeHead(400);
                clientRes.end('Invalid target URL');
                return;
            }

            // Set CORS headers
            clientRes.setHeader('Access-Control-Allow-Origin', '*');
            clientRes.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            clientRes.setHeader('Access-Control-Allow-Headers', '*');
            clientRes.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');

            if (clientReq.method === 'OPTIONS') {
                clientRes.writeHead(204);
                clientRes.end();
                return;
            }

            const isHttps = parsedUrl.protocol === 'https:';
            const requestModule = isHttps ? https : http;

            const headers: Record<string, string> = {
                'User-Agent': 'VLC/3.0.20 LibVLC/3.0.20',
                'Connection': 'keep-alive',
                'Accept': '*/*',
            };

            // Forward Range header if present
            if (clientReq.headers.range) {
                headers['Range'] = clientReq.headers.range;
            }

            const proxyReq = requestModule.request(
                targetUrl,
                {
                    method: clientReq.method || 'GET',
                    headers,
                    timeout: 10000,
                    rejectUnauthorized: false,
                },
                (proxyRes) => {
                    // Forward status and headers
                    const responseHeaders: Record<string, string | string[]> = {};
                    for (const [key, value] of Object.entries(proxyRes.headers)) {
                        if (value) {
                            responseHeaders[key] = value;
                        }
                    }
                    // Override CORS
                    responseHeaders['access-control-allow-origin'] = '*';

                    clientRes.writeHead(proxyRes.statusCode || 200, responseHeaders);
                    proxyRes.pipe(clientRes);
                },
            );

            proxyReq.on('error', (err) => {
                console.error('[MpegtsProxy] Request error:', err.message);
                if (!clientRes.headersSent) {
                    clientRes.writeHead(502);
                    clientRes.end(`Proxy error: ${err.message}`);
                }
            });

            proxyReq.on('timeout', () => {
                proxyReq.destroy();
                if (!clientRes.headersSent) {
                    clientRes.writeHead(504);
                    clientRes.end('Gateway timeout');
                }
            });

            clientReq.pipe(proxyReq);
        });

        proxyServer.listen(0, '127.0.0.1', () => {
            const addr = proxyServer!.address();
            if (addr && typeof addr !== 'string') {
                proxyPort = addr.port;
                console.log(`[MpegtsProxy] Running on port ${proxyPort}`);
                resolve(proxyPort);
            } else {
                reject(new Error('Proxy adresi alınamadı'));
            }
        });

        proxyServer.on('error', (err) => {
            console.error('[MpegtsProxy] Server error:', err);
            reject(err);
        });
    });
}

export function stopMpegtsProxy(): void {
    if (proxyServer) {
        proxyServer.close();
        proxyServer = null;
        proxyPort = 0;
    }
}

export function getProxyUrl(targetUrl: string): string {
    return `http://127.0.0.1:${proxyPort}/stream?url=${encodeURIComponent(targetUrl)}`;
}

export function getProxyPort(): number {
    return proxyPort;
}
