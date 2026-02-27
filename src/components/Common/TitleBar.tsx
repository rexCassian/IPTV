import React, { memo, useCallback, useState, useEffect } from 'react';
import { Settings, CalendarDays, Minus, Square, X, Copy } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';

export const TitleBar = memo(function TitleBar() {
    const [isMaximized, setIsMaximized] = useState(false);
    const { openModal } = useUiStore();

    useEffect(() => {
        window.electronAPI.window.isMaximized().then(setIsMaximized);
        const unsub = window.electronAPI.window.onMaximizedChanged(setIsMaximized);
        return unsub;
    }, []);

    const minimize = useCallback(() => window.electronAPI.window.minimize(), []);
    const maximize = useCallback(() => window.electronAPI.window.maximize(), []);
    const close = useCallback(() => window.electronAPI.window.close(), []);

    return (
        <div className="titlebar">
            {/* Left — logo + name */}
            <div className="titlebar-left">
                <div className="titlebar-logo">C</div>
                <span className="titlebar-title">
                    Coriolis <span className="titlebar-title-accent">IPTV</span>
                </span>
            </div>

            {/* Middle — draggable */}
            <div className="titlebar-drag" />

            {/* Action buttons */}
            <div className="titlebar-actions">
                <button
                    className="titlebar-action-btn"
                    onClick={() => openModal('epgGuide')}
                    title="EPG Rehberi (Ctrl+E)"
                >
                    <CalendarDays size={13} />
                    EPG
                </button>
                <button
                    className="titlebar-action-btn"
                    onClick={() => openModal('settings')}
                    title="Ayarlar (Ctrl+,)"
                >
                    <Settings size={13} />
                    Ayarlar
                </button>
            </div>

            {/* Window controls */}
            <div className="titlebar-controls">
                <button className="titlebar-ctrl-btn" onClick={minimize} title="Küçült">
                    <Minus size={14} />
                </button>
                <button className="titlebar-ctrl-btn" onClick={maximize} title={isMaximized ? 'Küçült' : 'Tam ekran'}>
                    {isMaximized ? <Copy size={12} /> : <Square size={12} />}
                </button>
                <button className="titlebar-ctrl-btn close" onClick={close} title="Kapat">
                    <X size={14} />
                </button>
            </div>
        </div>
    );
});
