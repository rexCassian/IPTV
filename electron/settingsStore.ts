import path from 'path';
import fs from 'fs';
import { app } from 'electron';

type StoreValue = string | number | boolean | null | StoreValue[] | { [key: string]: StoreValue };

interface StoreDefaults {
    volume: number;
    muted: boolean;
    m3uSources: string[];
    epgUrls: string[];
    favorites: string[];
    history: Array<{ channelId: string; timestamp: number }>;
    playerSettings: {
        hwdec: string;
        cacheSecs: number;
        bufferSize: string;
    };
    lastChannel: string | null;
}

const defaults: StoreDefaults = {
    volume: 80,
    muted: false,
    m3uSources: [],
    epgUrls: [],
    favorites: [],
    history: [],
    playerSettings: {
        hwdec: 'd3d11va',
        cacheSecs: 8,
        bufferSize: '32MiB',
    },
    lastChannel: null,
};

class JsonStore {
    private filePath: string;
    private data: Record<string, StoreValue>;

    constructor() {
        const userDataDir = app.getPath('userData');
        this.filePath = path.join(userDataDir, 'settings.json');
        this.data = this.load();
    }

    private load(): Record<string, StoreValue> {
        try {
            if (fs.existsSync(this.filePath)) {
                const raw = fs.readFileSync(this.filePath, 'utf-8');
                return { ...defaults, ...JSON.parse(raw) } as Record<string, StoreValue>;
            }
        } catch {
            // Fall through to defaults
        }
        return { ...(defaults as unknown as Record<string, StoreValue>) } as Record<string, StoreValue>;
    }

    private save(): void {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
        } catch (err) {
            console.error('[Settings] Save error:', err);
        }
    }

    get<T = StoreValue>(key: string): T {
        return (this.data[key] ?? (defaults as unknown as Record<string, StoreValue>)[key]) as unknown as T;
    }

    set(key: string, value: StoreValue): void {
        this.data[key] = value;
        this.save();
    }

    get store(): Record<string, StoreValue> {
        return { ...this.data };
    }
}

// Singleton
let _store: JsonStore | null = null;

export function getStore(): JsonStore {
    if (!_store) _store = new JsonStore();
    return _store;
}
