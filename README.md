# Coriolis IPTV

Production-ready IPTV desktop application for Windows with an emphasis on a premium user experience, modern aesthetics, and seamless streaming.

## Features

- 🎬 **Modern Player Engine**: Built-in HTML5 + mpegts.js dual engine. No external players (like mpv) needed.
- 📺 **Massive Scaling**: Virtual scrolling supports 10,000+ channels at 60 FPS.
- 📖 **EPG Program Guide**: XMLTV support with lightning-fast `sql.js` (WebAssembly) storage — **Zero native build tools required**.
- 🔍 **Fuzzy Search**: Instant channel search across thousands of streams.
- 🎨 **Liquid Glass UI**: Premium dark theme with translucent glassmorphism overlays and slick animations.
- ⌨️ **Keyboard Navigation**: Full keyboard control (Arrow keys, Enter, F for Fullscreen, M for Mute, Esc).

## Installation (For Users)

You do **not** need to build the project from source or install development tools.

1. Go to the [Releases](../../releases) page *(Coming Soon)*.
2. Download the latest `Coriolis IPTV Setup.exe`.
3. Run the installer.

## Development Setup (For Developers)

If you want to contribute or build from source, the barrier to entry is extremely low. Unlike older versions, **you no longer need Visual Studio Build Tools or C++ compilers.**

- **Windows 10/11** (64-bit)
- **Node.js 18+** and **npm 9+**

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development
```bash
npm run electron:dev
```
This starts both the Vite dev server and Electron simultaneously.

### 3. Build & Package for Production
This project uses `electron-builder` (migrated away from Electron Forge) for reliable, user-friendly Windows installers (NSIS).

To generate the `.exe` setup file locally:
```bash
npm run make
```
The installer will be generated in the `dist/` folder.

## Trade-offs & Philosophy

- **Why WebAssembly SQLite (`sql.js`) over `better-sqlite3`?** We traded RAM overhead for user convenience. `better-sqlite3` requires complex native C++ build tools (Visual Studio, Python) which blocks 90% of non-technical users and makes CI/CD painful. By using an in-memory WASM SQL database, any user can `npm install` and run the app effortlessly in seconds. Data is safely serialized to disk on exit to prevent data loss.
- **Dual Playback Engines:** Not all M3U/IPTV streams are equal. We employ HTML5 Native + `mpegts.js` to ensure the highest compatibility with various codecs.

## Architecture

```
electron/          → Main process (Node.js)
  main.ts          → Window, tray, security
  m3uParser.ts     → M3U playlist parsing
  epgManager.ts    → EPG fetch & XMLTV parse

src/               → Renderer process (React)
  components/      → UI components
  store/           → Zustand state management
  hooks/           → React hooks
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 28 |
| UI | React 18 + TypeScript 5 |
| Build | Vite + electron-builder |
| Styling | Tailwind CSS |
| State | Zustand |
| Virtual Scroll | @tanstack/react-virtual |
| Animation | Framer Motion |
| TS Player | mpegts.js |
| EPG Storage | sql.js (WASM) |

## License

[MIT License](LICENSE)
