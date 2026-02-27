# Coriolis IPTV

Production-ready IPTV desktop application for Windows with 10,000+ channel support.

## Features

- 🎬 **Dual Player Engine**: mpv (HLS/m3u8) + mpegts.js (MPEG-TS) auto-switching
- 📺 **10K+ Channel Support**: Virtual scrolling with 60 FPS
- 📖 **EPG Program Guide**: XMLTV support with SQLite storage
- 🔍 **Fuzzy Search**: Instant channel search across 10K+ channels
- ⌨️ **Keyboard Shortcuts**: Full keyboard navigation
- 🎨 **Modern UI**: Dark theme, custom title bar, Framer Motion animations
- ⚡ **Windows Optimized**: D3D11VA hardware decode, DirectX GPU rendering

## Requirements

- **Windows 10/11** (64-bit)
- **Node.js 18+** and **npm 9+**
- **Visual Studio Build Tools** (for `better-sqlite3` native compilation)
  - Install via: `npm install --global windows-build-tools` (admin PowerShell)
  - Or download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- **mpv.exe** (optional, for HLS playback — MPEG-TS works without it)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Place mpv.exe (Optional)

Download mpv for Windows from https://mpv.io/installation/ and place `mpv.exe` in:

```
iptv/resources/mpv.exe
```

> Without mpv.exe, the app will still work but only with MPEG-TS streams via the built-in HTML5 player.

### 3. Start Development

```bash
npm run electron:dev
```

This starts both Vite dev server and Electron simultaneously.

### 4. Build for Production

```bash
npm run build
npm start
```

## First Run

1. Open the app → Click the **⚙️ settings icon** or press `Ctrl+,`
2. Go to **Sources** tab → Enter your M3U/M3U8 playlist URL → Click **Add**
3. Click the **download icon** next to the source to load channels
4. Select a channel from the sidebar to start watching

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `↑ / ↓` | Navigate channels |
| `Enter` | Play selected channel |
| `F` | Toggle fullscreen |
| `M` | Toggle mute |
| `+ / -` | Volume up/down |
| `Ctrl+F` | Focus search |
| `Escape` | Exit fullscreen / Close modal |
| `Ctrl+,` | Open settings |
| `Ctrl+E` | Open EPG guide |
| `F5` | Refresh EPG |
| `Ctrl+D` | Toggle favorite |

## Architecture

```
electron/          → Main process (Node.js)
  main.ts          → Window, tray, security
  mpvManager.ts    → mpv IPC socket control
  m3uParser.ts     → M3U playlist parsing
  epgManager.ts    → EPG fetch & XMLTV parse
  epgDatabase.ts   → SQLite EPG storage

src/               → Renderer process (React)
  components/      → UI components
  store/           → Zustand state management
  hooks/           → React hooks
  utils/           → Utilities
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 28 |
| UI | React 18 + TypeScript 5 |
| Build | Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Virtual Scroll | @tanstack/react-virtual |
| Animation | Framer Motion |
| HLS Player | mpv (external binary) |
| TS Player | mpegts.js (in-browser) |
| EPG Storage | better-sqlite3 |
| Settings | electron-store |
| Search | Fuse.js |

## License

Private — All rights reserved.
