type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_COLORS: Record<LogLevel, string> = {
    debug: '#888',
    info: '#2ea5ff',
    warn: '#f59e0b',
    error: '#ef4444',
};

function log(level: LogLevel, tag: string, ...args: unknown[]): void {
    const color = LOG_COLORS[level];
    const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);

    console.log(
        `%c[${timestamp}] %c[${tag}]`,
        `color: #666`,
        `color: ${color}; font-weight: bold`,
        ...args,
    );
}

export const logger = {
    debug: (tag: string, ...args: unknown[]) => log('debug', tag, ...args),
    info: (tag: string, ...args: unknown[]) => log('info', tag, ...args),
    warn: (tag: string, ...args: unknown[]) => log('warn', tag, ...args),
    error: (tag: string, ...args: unknown[]) => log('error', tag, ...args),
};
