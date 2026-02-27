import { BrowserWindow } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import net from 'net';

interface MpvState {
    playing: boolean;
    paused: boolean;
    volume: number;
    muted: boolean;
    duration: number;
    position: number;
    buffering: boolean;
    bufferPercent: number;
    codec: string;
    width: number;
    height: number;
    fps: number;
    bitrate: number;
}

export class MpvManager {
    private process: ChildProcess | null = null;
    private ipcSocket: net.Socket | null = null;
    private pipeName: string;
    private mainWindow: BrowserWindow;
    private state: MpvState;
    private requestId = 0;
    private pendingRequests = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private mpvPath: string;
    private currentUrl: string | null = null;
    private dataBuffer = '';

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
        this.pipeName = `\\\\.\\pipe\\coriolis-mpv-${process.pid}`;
        this.state = this.getDefaultState();

        // Resolve mpv path
        if (app.isPackaged) {
            this.mpvPath = path.join(process.resourcesPath, 'resources', 'mpv.exe');
        } else {
            this.mpvPath = path.join(app.getAppPath(), 'resources', 'mpv.exe');
        }
    }

    private getDefaultState(): MpvState {
        return {
            playing: false,
            paused: false,
            volume: 80,
            muted: false,
            duration: 0,
            position: 0,
            buffering: false,
            bufferPercent: 0,
            codec: '',
            width: 0,
            height: 0,
            fps: 0,
            bitrate: 0,
        };
    }

    async play(url: string): Promise<void> {
        // Kill previous instance completely
        await this.stop();

        this.currentUrl = url;
        this.state = this.getDefaultState();

        // Notify renderer of buffering state
        this.mainWindow.webContents.send('player:buffering', 0);

        return new Promise((resolve, reject) => {
            const args = [
                url,
                '--no-terminal',
                '--no-osc',
                '--no-osd-bar',
                '--idle=no',
                '--keep-open=no',
                '--cache=yes',
                '--cache-secs=8',
                '--demuxer-max-bytes=32MiB',
                '--demuxer-readahead-secs=4',
                '--network-timeout=5',
                '--stream-lavf-o=reconnect=1',
                '--stream-lavf-o=reconnect_streamed=1',
                '--stream-lavf-o=reconnect_delay_max=5',
                '--hwdec=d3d11va',
                '--gpu-api=d3d11',
                '--vo=gpu',
                `--input-ipc-server=${this.pipeName}`,
                '--force-window=no',
                '--ontop=no',
                '--border=no',
                `--volume=${this.state.volume}`,
            ];

            try {
                this.process = spawn(this.mpvPath, args, {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    windowsHide: true,
                });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'mpv başlatılamadı';
                reject(new Error(`mpv başlatılamadı: ${message}. mpv.exe dosyasını resources/ klasörüne koyun.`));
                return;
            }

            let started = false;
            const startTimeout = setTimeout(() => {
                if (!started) {
                    this.mainWindow.webContents.send('player:error', 'mpv başlatma zaman aşımı (5sn)');
                    reject(new Error('mpv başlatma zaman aşımı'));
                }
            }, 5000);

            this.process.stdout?.on('data', (data: Buffer) => {
                const text = data.toString();
                if (text.includes('AO:') || text.includes('VO:') || text.includes('Video')) {
                    if (!started) {
                        started = true;
                        clearTimeout(startTimeout);
                        this.connectIpc().then(resolve).catch(reject);
                    }
                }
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                const text = data.toString();
                // mpv outputs info to stderr too
                if (text.includes('AO:') || text.includes('VO:') || text.includes('Video')) {
                    if (!started) {
                        started = true;
                        clearTimeout(startTimeout);
                        this.connectIpc().then(resolve).catch(reject);
                    }
                }
            });

            this.process.on('error', (error) => {
                clearTimeout(startTimeout);
                this.mainWindow.webContents.send('player:error', `mpv hatası: ${error.message}`);
                if (!started) reject(error);
            });

            this.process.on('exit', (code) => {
                clearTimeout(startTimeout);
                this.cleanupIpc();
                this.state.playing = false;
                this.mainWindow.webContents.send('player:state-changed', {
                    playing: false,
                    url: null,
                    streamType: null,
                });

                if (!started) {
                    reject(new Error(`mpv çıkış kodu: ${code}`));
                }
            });

            // Fallback: try IPC connection after a short delay even without stdout
            setTimeout(() => {
                if (!started) {
                    started = true;
                    clearTimeout(startTimeout);
                    this.connectIpc().then(resolve).catch(reject);
                }
            }, 1500);
        });
    }

    private async connectIpc(): Promise<void> {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 10;

            const tryConnect = (): void => {
                attempts++;
                const socket = net.connect(this.pipeName);

                socket.on('connect', () => {
                    this.ipcSocket = socket;
                    this.setupIpcListeners();
                    this.observeProperties();
                    this.state.playing = true;
                    this.mainWindow.webContents.send('player:state-changed', {
                        playing: true,
                        url: this.currentUrl,
                        streamType: 'hls',
                    });
                    resolve();
                });

                socket.on('error', () => {
                    if (attempts < maxAttempts) {
                        setTimeout(tryConnect, 300);
                    } else {
                        reject(new Error('mpv IPC bağlantısı kurulamadı'));
                    }
                });
            };

            tryConnect();
        });
    }

    private setupIpcListeners(): void {
        if (!this.ipcSocket) return;

        this.ipcSocket.on('data', (data: Buffer) => {
            this.dataBuffer += data.toString();
            const lines = this.dataBuffer.split('\n');
            this.dataBuffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const msg = JSON.parse(line);
                    this.handleIpcMessage(msg);
                } catch {
                    // Ignore malformed JSON
                }
            }
        });

        this.ipcSocket.on('close', () => {
            this.ipcSocket = null;
        });

        this.ipcSocket.on('error', () => {
            this.ipcSocket = null;
        });
    }

    private handleIpcMessage(msg: Record<string, unknown>): void {
        // Handle responses to our commands
        if (msg.request_id !== undefined) {
            const id = msg.request_id as number;
            const pending = this.pendingRequests.get(id);
            if (pending) {
                this.pendingRequests.delete(id);
                if (msg.error === 'success') {
                    pending.resolve(msg.data);
                } else {
                    pending.reject(new Error(msg.error as string));
                }
            }
            return;
        }

        // Handle events
        if (msg.event === 'property-change') {
            const name = msg.name as string;
            const value = msg.data;

            switch (name) {
                case 'pause':
                    this.state.paused = value as boolean;
                    break;
                case 'volume':
                    this.state.volume = value as number;
                    break;
                case 'mute':
                    this.state.muted = value as boolean;
                    break;
                case 'duration':
                    this.state.duration = (value as number) || 0;
                    break;
                case 'time-pos':
                    this.state.position = (value as number) || 0;
                    break;
                case 'paused-for-cache':
                    this.state.buffering = value as boolean;
                    if (this.state.buffering) {
                        this.mainWindow.webContents.send('player:buffering', this.state.bufferPercent);
                    }
                    break;
                case 'cache-buffering-state':
                    this.state.bufferPercent = (value as number) || 0;
                    if (this.state.buffering) {
                        this.mainWindow.webContents.send('player:buffering', this.state.bufferPercent);
                    }
                    break;
                case 'video-codec':
                    this.state.codec = (value as string) || '';
                    break;
                case 'width':
                    this.state.width = (value as number) || 0;
                    break;
                case 'height':
                    this.state.height = (value as number) || 0;
                    break;
                case 'estimated-vf-fps':
                    this.state.fps = Math.round((value as number) || 0);
                    break;
                case 'video-bitrate':
                    this.state.bitrate = Math.round(((value as number) || 0) / 1000);
                    break;
            }

            this.mainWindow.webContents.send('player:state-changed', {
                playing: this.state.playing,
                paused: this.state.paused,
                volume: this.state.volume,
                muted: this.state.muted,
                codec: this.state.codec,
                width: this.state.width,
                height: this.state.height,
                fps: this.state.fps,
                bitrate: this.state.bitrate,
                buffering: this.state.buffering,
            });
        }

        if (msg.event === 'end-file') {
            const reason = msg.reason as string;
            if (reason === 'error') {
                this.mainWindow.webContents.send('player:error', 'Yayın akışı sona erdi veya bağlantı kesildi');
            }
        }
    }

    private observeProperties(): void {
        const properties = [
            'pause',
            'volume',
            'mute',
            'duration',
            'time-pos',
            'paused-for-cache',
            'cache-buffering-state',
            'video-codec',
            'width',
            'height',
            'estimated-vf-fps',
            'video-bitrate',
        ];

        for (const prop of properties) {
            this.sendCommand('observe_property', 0, prop);
        }
    }

    private sendCommand(...args: unknown[]): Promise<unknown> {
        return new Promise((resolve, reject) => {
            if (!this.ipcSocket) {
                reject(new Error('IPC bağlantısı yok'));
                return;
            }

            const id = ++this.requestId;
            const cmd = { command: args, request_id: id };

            this.pendingRequests.set(id, { resolve, reject });

            try {
                this.ipcSocket.write(JSON.stringify(cmd) + '\n');
            } catch {
                this.pendingRequests.delete(id);
                reject(new Error('IPC mesaj gönderilemedi'));
            }

            // Timeout pending requests
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('IPC yanıt zaman aşımı'));
                }
            }, 5000);
        });
    }

    async stop(): Promise<void> {
        // Clear pending requests
        for (const [, pending] of this.pendingRequests) {
            pending.reject(new Error('İşlem iptal edildi'));
        }
        this.pendingRequests.clear();

        // Send quit command
        if (this.ipcSocket) {
            try {
                this.ipcSocket.write(JSON.stringify({ command: ['quit'] }) + '\n');
            } catch {
                // Ignore
            }
        }

        // Wait a bit for graceful quit
        await new Promise<void>((resolve) => setTimeout(resolve, 200));

        // Force kill if still running
        if (this.process && !this.process.killed) {
            try {
                this.process.kill('SIGTERM');
            } catch {
                try {
                    this.process.kill('SIGKILL');
                } catch {
                    // Already dead
                }
            }
        }

        this.cleanupIpc();
        this.process = null;
        this.currentUrl = null;
        this.state = this.getDefaultState();
    }

    private cleanupIpc(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ipcSocket) {
            try {
                this.ipcSocket.destroy();
            } catch {
                // Ignore
            }
            this.ipcSocket = null;
        }

        this.dataBuffer = '';
    }

    async setVolume(volume: number): Promise<void> {
        const clamped = Math.max(0, Math.min(100, volume));
        this.state.volume = clamped;
        if (this.ipcSocket) {
            await this.sendCommand('set_property', 'volume', clamped);
        }
    }

    async setMute(muted: boolean): Promise<void> {
        this.state.muted = muted;
        if (this.ipcSocket) {
            await this.sendCommand('set_property', 'mute', muted);
        }
    }

    async seek(seconds: number): Promise<void> {
        if (this.ipcSocket) {
            await this.sendCommand('seek', seconds, 'relative');
        }
    }

    getState(): MpvState {
        return { ...this.state };
    }

    isRunning(): boolean {
        return this.process !== null && !this.process.killed;
    }

    destroy(): void {
        this.stop();
    }
}
