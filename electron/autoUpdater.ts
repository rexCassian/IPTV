// Auto-updater stub — requires electron-updater and a publish target
// This module provides the interface for updates but does not perform
// actual updates until a publish URL is configured.

import { BrowserWindow } from 'electron';

export class AutoUpdater {
    private mainWindow: BrowserWindow;

    constructor(mainWindow: BrowserWindow) {
        this.mainWindow = mainWindow;
    }

    async checkForUpdates(): Promise<void> {
        try {
            // electron-updater integration would go here
            // const { autoUpdater } = await import('electron-updater');
            // autoUpdater.checkForUpdatesAndNotify();
            console.log('[AutoUpdater] Update check skipped — no publish URL configured');
        } catch (error) {
            console.error('[AutoUpdater] Error:', error);
        }
    }

    notifyUpdateAvailable(version: string): void {
        this.mainWindow.webContents.send('update:available', { version });
    }
}
