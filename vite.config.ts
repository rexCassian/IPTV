import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import electronRenderer from 'vite-plugin-electron-renderer';
import path from 'path';

// All Node built-ins and electron-only modules that must NOT be bundled
const electronExternals = [
    'electron',
    'better-sqlite3',
    'sql.js',
    'electron-store',
    'node:path',
    'node:fs',
    'node:os',
    'node:net',
    'node:http',
    'node:https',
    'node:url',
    'node:crypto',
    'node:child_process',
    'node:worker_threads',
    'node:buffer',
    'node:stream',
    'node:events',
];

export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                // Main process
                entry: 'electron/main.ts',
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        lib: {
                            entry: 'electron/main.ts',
                            formats: ['cjs'],
                            fileName: () => 'main.js',
                        },
                        rollupOptions: {
                            external: electronExternals,
                            output: {
                                format: 'cjs',
                            },
                        },
                    },
                },
            },
            {
                // Preload
                entry: 'electron/preload.ts',
                onstart(args) {
                    args.reload();
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        lib: {
                            entry: 'electron/preload.ts',
                            formats: ['cjs'],
                            fileName: () => 'preload.js',
                        },
                        rollupOptions: {
                            external: electronExternals,
                            output: {
                                format: 'cjs',
                            },
                        },
                    },
                },
            },
        ]),
        electronRenderer(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom'],
                    ui: ['framer-motion', '@tanstack/react-virtual'],
                },
            },
        },
    },
});
