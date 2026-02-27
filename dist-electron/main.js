"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const net = require("net");
const https = require("https");
const http = require("http");
const fs = require("fs");
const url = require("url");
class MpvManager {
  constructor(mainWindow) {
    __publicField(this, "process", null);
    __publicField(this, "ipcSocket", null);
    __publicField(this, "pipeName");
    __publicField(this, "mainWindow");
    __publicField(this, "state");
    __publicField(this, "requestId", 0);
    __publicField(this, "pendingRequests", /* @__PURE__ */ new Map());
    __publicField(this, "reconnectTimer", null);
    __publicField(this, "mpvPath");
    __publicField(this, "currentUrl", null);
    __publicField(this, "dataBuffer", "");
    this.mainWindow = mainWindow;
    this.pipeName = `\\\\.\\pipe\\coriolis-mpv-${process.pid}`;
    this.state = this.getDefaultState();
    if (electron.app.isPackaged) {
      this.mpvPath = path.join(process.resourcesPath, "resources", "mpv.exe");
    } else {
      this.mpvPath = path.join(electron.app.getAppPath(), "resources", "mpv.exe");
    }
  }
  getDefaultState() {
    return {
      playing: false,
      paused: false,
      volume: 80,
      muted: false,
      duration: 0,
      position: 0,
      buffering: false,
      bufferPercent: 0,
      codec: "",
      width: 0,
      height: 0,
      fps: 0,
      bitrate: 0
    };
  }
  async play(url2) {
    await this.stop();
    this.currentUrl = url2;
    this.state = this.getDefaultState();
    this.mainWindow.webContents.send("player:buffering", 0);
    return new Promise((resolve, reject) => {
      var _a, _b;
      const args = [
        url2,
        "--no-terminal",
        "--no-osc",
        "--no-osd-bar",
        "--idle=no",
        "--keep-open=no",
        "--cache=yes",
        "--cache-secs=8",
        "--demuxer-max-bytes=32MiB",
        "--demuxer-readahead-secs=4",
        "--network-timeout=5",
        "--stream-lavf-o=reconnect=1",
        "--stream-lavf-o=reconnect_streamed=1",
        "--stream-lavf-o=reconnect_delay_max=5",
        "--hwdec=d3d11va",
        "--gpu-api=d3d11",
        "--vo=gpu",
        `--input-ipc-server=${this.pipeName}`,
        "--force-window=no",
        "--ontop=no",
        "--border=no",
        `--volume=${this.state.volume}`
      ];
      try {
        this.process = child_process.spawn(this.mpvPath, args, {
          stdio: ["pipe", "pipe", "pipe"],
          windowsHide: true
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "mpv başlatılamadı";
        reject(new Error(`mpv başlatılamadı: ${message}. mpv.exe dosyasını resources/ klasörüne koyun.`));
        return;
      }
      let started = false;
      const startTimeout = setTimeout(() => {
        if (!started) {
          this.mainWindow.webContents.send("player:error", "mpv başlatma zaman aşımı (5sn)");
          reject(new Error("mpv başlatma zaman aşımı"));
        }
      }, 5e3);
      (_a = this.process.stdout) == null ? void 0 : _a.on("data", (data) => {
        const text = data.toString();
        if (text.includes("AO:") || text.includes("VO:") || text.includes("Video")) {
          if (!started) {
            started = true;
            clearTimeout(startTimeout);
            this.connectIpc().then(resolve).catch(reject);
          }
        }
      });
      (_b = this.process.stderr) == null ? void 0 : _b.on("data", (data) => {
        const text = data.toString();
        if (text.includes("AO:") || text.includes("VO:") || text.includes("Video")) {
          if (!started) {
            started = true;
            clearTimeout(startTimeout);
            this.connectIpc().then(resolve).catch(reject);
          }
        }
      });
      this.process.on("error", (error) => {
        clearTimeout(startTimeout);
        this.mainWindow.webContents.send("player:error", `mpv hatası: ${error.message}`);
        if (!started) reject(error);
      });
      this.process.on("exit", (code) => {
        clearTimeout(startTimeout);
        this.cleanupIpc();
        this.state.playing = false;
        this.mainWindow.webContents.send("player:state-changed", {
          playing: false,
          url: null,
          streamType: null
        });
        if (!started) {
          reject(new Error(`mpv çıkış kodu: ${code}`));
        }
      });
      setTimeout(() => {
        if (!started) {
          started = true;
          clearTimeout(startTimeout);
          this.connectIpc().then(resolve).catch(reject);
        }
      }, 1500);
    });
  }
  async connectIpc() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 10;
      const tryConnect = () => {
        attempts++;
        const socket = net.connect(this.pipeName);
        socket.on("connect", () => {
          this.ipcSocket = socket;
          this.setupIpcListeners();
          this.observeProperties();
          this.state.playing = true;
          this.mainWindow.webContents.send("player:state-changed", {
            playing: true,
            url: this.currentUrl,
            streamType: "hls"
          });
          resolve();
        });
        socket.on("error", () => {
          if (attempts < maxAttempts) {
            setTimeout(tryConnect, 300);
          } else {
            reject(new Error("mpv IPC bağlantısı kurulamadı"));
          }
        });
      };
      tryConnect();
    });
  }
  setupIpcListeners() {
    if (!this.ipcSocket) return;
    this.ipcSocket.on("data", (data) => {
      this.dataBuffer += data.toString();
      const lines = this.dataBuffer.split("\n");
      this.dataBuffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          this.handleIpcMessage(msg);
        } catch {
        }
      }
    });
    this.ipcSocket.on("close", () => {
      this.ipcSocket = null;
    });
    this.ipcSocket.on("error", () => {
      this.ipcSocket = null;
    });
  }
  handleIpcMessage(msg) {
    if (msg.request_id !== void 0) {
      const id = msg.request_id;
      const pending = this.pendingRequests.get(id);
      if (pending) {
        this.pendingRequests.delete(id);
        if (msg.error === "success") {
          pending.resolve(msg.data);
        } else {
          pending.reject(new Error(msg.error));
        }
      }
      return;
    }
    if (msg.event === "property-change") {
      const name = msg.name;
      const value = msg.data;
      switch (name) {
        case "pause":
          this.state.paused = value;
          break;
        case "volume":
          this.state.volume = value;
          break;
        case "mute":
          this.state.muted = value;
          break;
        case "duration":
          this.state.duration = value || 0;
          break;
        case "time-pos":
          this.state.position = value || 0;
          break;
        case "paused-for-cache":
          this.state.buffering = value;
          if (this.state.buffering) {
            this.mainWindow.webContents.send("player:buffering", this.state.bufferPercent);
          }
          break;
        case "cache-buffering-state":
          this.state.bufferPercent = value || 0;
          if (this.state.buffering) {
            this.mainWindow.webContents.send("player:buffering", this.state.bufferPercent);
          }
          break;
        case "video-codec":
          this.state.codec = value || "";
          break;
        case "width":
          this.state.width = value || 0;
          break;
        case "height":
          this.state.height = value || 0;
          break;
        case "estimated-vf-fps":
          this.state.fps = Math.round(value || 0);
          break;
        case "video-bitrate":
          this.state.bitrate = Math.round((value || 0) / 1e3);
          break;
      }
      this.mainWindow.webContents.send("player:state-changed", {
        playing: this.state.playing,
        paused: this.state.paused,
        volume: this.state.volume,
        muted: this.state.muted,
        codec: this.state.codec,
        width: this.state.width,
        height: this.state.height,
        fps: this.state.fps,
        bitrate: this.state.bitrate,
        buffering: this.state.buffering
      });
    }
    if (msg.event === "end-file") {
      const reason = msg.reason;
      if (reason === "error") {
        this.mainWindow.webContents.send("player:error", "Yayın akışı sona erdi veya bağlantı kesildi");
      }
    }
  }
  observeProperties() {
    const properties = [
      "pause",
      "volume",
      "mute",
      "duration",
      "time-pos",
      "paused-for-cache",
      "cache-buffering-state",
      "video-codec",
      "width",
      "height",
      "estimated-vf-fps",
      "video-bitrate"
    ];
    for (const prop of properties) {
      this.sendCommand("observe_property", 0, prop);
    }
  }
  sendCommand(...args) {
    return new Promise((resolve, reject) => {
      if (!this.ipcSocket) {
        reject(new Error("IPC bağlantısı yok"));
        return;
      }
      const id = ++this.requestId;
      const cmd = { command: args, request_id: id };
      this.pendingRequests.set(id, { resolve, reject });
      try {
        this.ipcSocket.write(JSON.stringify(cmd) + "\n");
      } catch {
        this.pendingRequests.delete(id);
        reject(new Error("IPC mesaj gönderilemedi"));
      }
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("IPC yanıt zaman aşımı"));
        }
      }, 5e3);
    });
  }
  async stop() {
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error("İşlem iptal edildi"));
    }
    this.pendingRequests.clear();
    if (this.ipcSocket) {
      try {
        this.ipcSocket.write(JSON.stringify({ command: ["quit"] }) + "\n");
      } catch {
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (this.process && !this.process.killed) {
      try {
        this.process.kill("SIGTERM");
      } catch {
        try {
          this.process.kill("SIGKILL");
        } catch {
        }
      }
    }
    this.cleanupIpc();
    this.process = null;
    this.currentUrl = null;
    this.state = this.getDefaultState();
  }
  cleanupIpc() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ipcSocket) {
      try {
        this.ipcSocket.destroy();
      } catch {
      }
      this.ipcSocket = null;
    }
    this.dataBuffer = "";
  }
  async setVolume(volume) {
    const clamped = Math.max(0, Math.min(100, volume));
    this.state.volume = clamped;
    if (this.ipcSocket) {
      await this.sendCommand("set_property", "volume", clamped);
    }
  }
  async setMute(muted) {
    this.state.muted = muted;
    if (this.ipcSocket) {
      await this.sendCommand("set_property", "mute", muted);
    }
  }
  async seek(seconds) {
    if (this.ipcSocket) {
      await this.sendCommand("seek", seconds, "relative");
    }
  }
  getState() {
    return { ...this.state };
  }
  isRunning() {
    return this.process !== null && !this.process.killed;
  }
  destroy() {
    this.stop();
  }
}
const LIVE_GROUPS = /* @__PURE__ */ new Set([
  "TR BEIN SPORTS",
  "TR BEIN SPORTS VIP",
  "TR SPOR",
  "TR EXXEN SPORTS",
  "TR SARAN SPORTS",
  "TR TRT TABII SPORTS",
  "TR ULUSAL",
  "TR ULUSAL UHD",
  "TR HABER",
  "TR BELGESEL",
  "TR MUZIK",
  "TR COCUK",
  "TR NEXTBOX MOVIE",
  "TR 7/24 SINEMA",
  "TR 7/24 SINEMA (YERLI)",
  "TR SiNEMA",
  "DE DAZN SPORT",
  "DE SKY BUNDESLIGA",
  "DE SKY SPORT",
  "DE SPORT",
  "DE NATIONAL",
  "DE MAGENTA",
  "DE RTL+",
  "DE DOKUMENTAR",
  "DE MUSIK",
  "DE KINDER",
  "FR SPORT",
  "FR DAZN",
  "FR CINEMA",
  "FR DIVERTISSEMENT",
  "FR DOCUMENTAIRE",
  "FR MUSIQUE",
  "FR NEWS",
  "FR ENFANTS",
  "USA",
  "USA | Sports",
  "USA | Entertainment",
  "USA | Movies",
  "USA | Documentary",
  "USA | Kids",
  "USA | Regionals",
  "WORLD SPORT",
  "GOLF",
  "U.K.",
  "NETHERLANDS",
  "NETHERLANDS SPORT",
  "NETHERLANDS MOVIES",
  "INDIA",
  "PAKISTAN",
  "SPAIN",
  "SWEDEN",
  "NORWAY",
  "FINLAND",
  "DENMARK",
  "CZECH",
  "HUNGARY",
  "ROMANIA",
  "POLAND",
  "PORTUGAL",
  "BULGARIA",
  "GREECE",
  "ITALY",
  "AUSTRIA",
  "BELGIUM",
  "SWITZERLAND",
  "CANADA",
  "MEXICO",
  "AUSTRALIA",
  "UKRAINE",
  "UZBEKISTAN",
  "MACEDONIA",
  "MONTENEGRO",
  "BOSNA HERSEK",
  "ALBANIA",
  "EX-YU",
  "KIBRIS",
  "KURDISH",
  "AZERBAIJAN",
  "ARMENIA",
  "AFGHANISTAN",
  "AFRICA",
  "ISRAEL",
  "KIDS VIP",
  "FRENCH",
  "ROMANIAN",
  "RUSSIAN",
  "GERMAN",
  "ITALIAN",
  "BULGARIAN",
  "MACEDONIAN",
  "Christian ✗ المسيحية",
  "INDIA",
  "RUSSIA"
]);
const SERIES_GROUPS = /* @__PURE__ */ new Set([
  "|TR| YERLi DiZiLER",
  "|TR| YABANCI DiZiLER",
  "|TR| NETFLIX",
  "|TR| DISNEY+",
  "|TR| APPLE TV",
  "|TR| EXXEN",
  "|TR| GAIN",
  "|TR| TOD",
  "|TR| MAX TV - HBO",
  "|TR| CBS - AMAZON",
  "|TR| TRT TABII",
  "|TR| SHOWTIME",
  "|TR| DINI DIZILER",
  "|TR| KOMEDI & TV SHOW",
  "|TR| BELGESEL DİZiLER",
  "|TR| ÇOCUK DİZİLERİ",
  "|EN| MULTI-LANG NETFLIX",
  "|EN| MULTI-LANG DISNEY+",
  "|EN| MULTI-LANG AMAZON PRIME",
  "|EN| MULTI-LANG APPLE TV",
  "|EN| MULTI-LANG ANIME",
  "|EN| HBO",
  "|EN| NEW RELEASE 2025",
  "|KR| MULTI-LANG KOREAN",
  "|DE| GERMAN SERIES",
  "|FR| FRENCH SERIES",
  "|US| ABC",
  "|US| AMC+",
  "|US| AMAZON",
  "|US| APPLE",
  "|US| GAIA",
  "|US| HALLMARK",
  "|US| MGM",
  "|US| NETFLIX",
  "|US| PARAMOUNT",
  "|US| SKY",
  "|US| TNT",
  "|US| VH1",
  "|US| SHOWTIME",
  "|US| NETWORK 10",
  "|US| NINE NETWORK"
]);
const MOVIE_GROUPS = /* @__PURE__ */ new Set([
  "|TR| YERLi FiLM",
  "|TR| DUBLAJ",
  "|TR| DiNi FiLM",
  "|TR| AKSIYON",
  "|TR| KOMEDI",
  "|TR| GERiLiM - KORKU",
  "|TR| ANiMASYON",
  "|TR| WESTERN",
  "|TR| EN iYiLER",
  "|TR| YESiLCAM",
  "|TR| MULTI SUBTITLES",
  "|TR| VOD - 2020",
  "|TR| VOD - 2021",
  "|TR| VOD - 2022",
  "|TR| VOD - 2023",
  "|TR| VOD - 2024",
  "|TR| YENi FiLMLER (2025-2026)",
  "|TR| KLIP-KONSER",
  "|EN| (VOD)",
  "|EN| MULTI-SUB MOVIES",
  "|EN| MULTII-AUDIO",
  "|EN| TOP 500 IMDB (VOD)",
  "|EN| NEW RELEASES 2025 (VOD)",
  "|EN| NETFLIX ASIA - MULTISUB",
  "|EN| APPLE+ MULTISUB",
  "|EN| MUBI & HULU TV",
  "|DE| (VOD)",
  "|DE| 2023 (VOD)",
  "|DE| 2024 (VOD)",
  "|DE| IMDB Top 50 (VOD)",
  "|DE| NEW RELEASES (VOD)",
  "|DE| ANIMATION (VOD)",
  "|DE| NETFLIX (VOD)",
  "|FR| (VOD)",
  "|FR| 2024 (VOD)",
  "|FR| 2025 (VOD)",
  "|FR| TELEFILM",
  "|FR| HISTOIRE - DOCUMENTAIRES (VOD)",
  "|FR| NEW RELEASE 2025",
  "|FR| AMAZON PRIME",
  "|FR| NETFLIX",
  "|GR| (VOD)",
  "|GR| 2024 (VOD)",
  "|IT| (VOD)",
  "|NL| (VOD)",
  "|NL| 2024 (VOD)",
  "|PL| (VOD)",
  "|PL| 2024 (VOD)",
  "|PT| (VOD)",
  "|ES| (VOD)",
  "|AR| (VOD)",
  "|BG| (VOD)",
  "|CN| (VOD)",
  "|IR| (VOD)",
  "|IR| DUBBED",
  "|TH| (VOD)",
  "|EX-YU| (VOD)",
  "|US| ACTION (VOD)",
  "|US| ADVENTURE (VOD)",
  "|US| COMEDY (VOD)",
  "|US| FANTASY (VOD)",
  "|US| IN CINEMA (VOD)",
  "|US| NEW RELEASES (VOD)",
  "DE FILME",
  "DE NEXTBOX MOVIE"
]);
function classifyGroup(group) {
  const g = group.trim();
  if (SERIES_GROUPS.has(g)) return "series";
  if (MOVIE_GROUPS.has(g)) return "movie";
  if (LIVE_GROUPS.has(g)) return "live";
  if (g.startsWith("[AR]")) return "live";
  const upper = g.toUpperCase();
  if (upper.includes("(VOD)")) return "movie";
  if (upper.includes("SERIES") || upper.includes("DİZİ") || upper.includes("DIZI")) return "series";
  if (upper.includes("FILM") || upper.includes("FİLM") || upper.includes("MOVIE") || upper.includes("SINEMA") || upper.includes("SiNEMA")) return "movie";
  return "live";
}
class M3uParser {
  async parse(source, onProgress) {
    let content;
    if (source.startsWith("http://") || source.startsWith("https://")) {
      content = await this.fetchUrl(source);
    } else {
      content = await fs.promises.readFile(source, "utf-8");
    }
    return this.parseContent(content, onProgress);
  }
  fetchUrl(url$1) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new url.URL(url$1);
      const requestModule = parsedUrl.protocol === "https:" ? https : http;
      const req = requestModule.get(
        url$1,
        {
          headers: { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20" },
          timeout: 3e4,
          rejectUnauthorized: false
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            this.fetchUrl(res.headers.location).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode && res.statusCode !== 200) {
            reject(new Error(`M3U indirme hatası: HTTP ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        }
      );
      req.on("error", (err) => reject(new Error(`M3U URL'e erişilemiyor: ${err.message}`)));
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("M3U indirme zaman aşımı (30sn)"));
      });
    });
  }
  parseContent(content, onProgress) {
    var _a;
    const lines = content.split(/\r?\n/);
    const channels = [];
    if (!((_a = lines[0]) == null ? void 0 : _a.trim().startsWith("#EXTM3U"))) {
      throw new Error("Geçersiz M3U formatı: #EXTM3U başlığı bulunamadı");
    }
    let currentInfo = null;
    const totalLines = lines.length;
    let progressCounter = 0;
    for (let i = 1; i < totalLines; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      if (line.startsWith("#EXTINF:")) {
        currentInfo = this.parseExtInf(line);
        progressCounter++;
        if (onProgress && progressCounter % 200 === 0) {
          onProgress({ loaded: channels.length, total: Math.floor(totalLines / 2) });
        }
      } else if (line.startsWith("#EXTVLCOPT:") || line.startsWith("#KODIPROP:")) {
        continue;
      } else if (line.startsWith("#")) {
        continue;
      } else if (currentInfo) {
        const url2 = line;
        if (url2.startsWith("http://") || url2.startsWith("https://") || url2.startsWith("rtsp://")) {
          const group = currentInfo.group || "Kategorisiz";
          const channel = {
            id: this.generateId(currentInfo.name || "", url2),
            name: currentInfo.name || "Bilinmeyen Kanal",
            url: url2,
            logo: currentInfo.logo || "",
            group,
            country: currentInfo.country || "",
            language: currentInfo.language || "",
            streamType: this.detectStreamType(url2),
            // ─── THE FIX: classify every channel here ───────────
            contentType: classifyGroup(group)
          };
          channels.push(channel);
        }
        currentInfo = null;
      }
    }
    if (onProgress) {
      onProgress({ loaded: channels.length, total: channels.length });
    }
    return channels;
  }
  parseExtInf(line) {
    const info = {};
    const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
    if (logoMatch) info.logo = logoMatch[1];
    const groupMatch = line.match(/group-title="([^"]*)"/i);
    if (groupMatch) info.group = groupMatch[1];
    const countryMatch = line.match(/tvg-country="([^"]*)"/i);
    if (countryMatch) info.country = countryMatch[1];
    const languageMatch = line.match(/tvg-language="([^"]*)"/i);
    if (languageMatch) info.language = languageMatch[1];
    const nameMatch = line.match(/,\s*(.+)$/);
    if (nameMatch) info.name = nameMatch[1].trim();
    return info;
  }
  detectStreamType(url2) {
    const lower = url2.toLowerCase();
    if (lower.includes(".m3u8")) return "hls";
    if (lower.endsWith(".ts") || lower.includes(":8080/") || lower.includes(":25461/")) return "mpegts";
    if (lower.includes(".mp4")) return "mp4";
    if (lower.match(/\/[\w]+\/[\w]+\/\d+/)) return "mpegts";
    return "hls";
  }
  generateId(name, url2) {
    let hash = 0;
    const str = name + url2;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `ch_${Math.abs(hash).toString(36)}`;
  }
}
var validator = {};
var util = {};
var hasRequiredUtil;
function requireUtil() {
  if (hasRequiredUtil) return util;
  hasRequiredUtil = 1;
  (function(exports$1) {
    const nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
    const nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
    const nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
    const regexName = new RegExp("^" + nameRegexp + "$");
    const getAllMatches = function(string, regex) {
      const matches = [];
      let match = regex.exec(string);
      while (match) {
        const allmatches = [];
        allmatches.startIndex = regex.lastIndex - match[0].length;
        const len = match.length;
        for (let index = 0; index < len; index++) {
          allmatches.push(match[index]);
        }
        matches.push(allmatches);
        match = regex.exec(string);
      }
      return matches;
    };
    const isName = function(string) {
      const match = regexName.exec(string);
      return !(match === null || typeof match === "undefined");
    };
    exports$1.isExist = function(v) {
      return typeof v !== "undefined";
    };
    exports$1.isEmptyObject = function(obj) {
      return Object.keys(obj).length === 0;
    };
    exports$1.merge = function(target, a, arrayMode) {
      if (a) {
        const keys = Object.keys(a);
        const len = keys.length;
        for (let i = 0; i < len; i++) {
          if (arrayMode === "strict") {
            target[keys[i]] = [a[keys[i]]];
          } else {
            target[keys[i]] = a[keys[i]];
          }
        }
      }
    };
    exports$1.getValue = function(v) {
      if (exports$1.isExist(v)) {
        return v;
      } else {
        return "";
      }
    };
    exports$1.isName = isName;
    exports$1.getAllMatches = getAllMatches;
    exports$1.nameRegexp = nameRegexp;
  })(util);
  return util;
}
var hasRequiredValidator;
function requireValidator() {
  if (hasRequiredValidator) return validator;
  hasRequiredValidator = 1;
  const util2 = requireUtil();
  const defaultOptions = {
    allowBooleanAttributes: false,
    //A tag can have attributes without any value
    unpairedTags: []
  };
  validator.validate = function(xmlData, options) {
    options = Object.assign({}, defaultOptions, options);
    const tags = [];
    let tagFound = false;
    let reachedRoot = false;
    if (xmlData[0] === "\uFEFF") {
      xmlData = xmlData.substr(1);
    }
    for (let i = 0; i < xmlData.length; i++) {
      if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
        i += 2;
        i = readPI(xmlData, i);
        if (i.err) return i;
      } else if (xmlData[i] === "<") {
        let tagStartPos = i;
        i++;
        if (xmlData[i] === "!") {
          i = readCommentAndCDATA(xmlData, i);
          continue;
        } else {
          let closingTag = false;
          if (xmlData[i] === "/") {
            closingTag = true;
            i++;
          }
          let tagName = "";
          for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) {
            tagName += xmlData[i];
          }
          tagName = tagName.trim();
          if (tagName[tagName.length - 1] === "/") {
            tagName = tagName.substring(0, tagName.length - 1);
            i--;
          }
          if (!validateTagName(tagName)) {
            let msg;
            if (tagName.trim().length === 0) {
              msg = "Invalid space after '<'.";
            } else {
              msg = "Tag '" + tagName + "' is an invalid name.";
            }
            return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i));
          }
          const result = readAttributeStr(xmlData, i);
          if (result === false) {
            return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
          }
          let attrStr = result.value;
          i = result.index;
          if (attrStr[attrStr.length - 1] === "/") {
            const attrStrStart = i - attrStr.length;
            attrStr = attrStr.substring(0, attrStr.length - 1);
            const isValid = validateAttributeString(attrStr, options);
            if (isValid === true) {
              tagFound = true;
            } else {
              return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
            }
          } else if (closingTag) {
            if (!result.tagClosed) {
              return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
            } else if (attrStr.trim().length > 0) {
              return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
            } else if (tags.length === 0) {
              return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
            } else {
              const otg = tags.pop();
              if (tagName !== otg.tagName) {
                let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
                return getErrorObject(
                  "InvalidTag",
                  "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                  getLineNumberForPosition(xmlData, tagStartPos)
                );
              }
              if (tags.length == 0) {
                reachedRoot = true;
              }
            }
          } else {
            const isValid = validateAttributeString(attrStr, options);
            if (isValid !== true) {
              return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
            }
            if (reachedRoot === true) {
              return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
            } else if (options.unpairedTags.indexOf(tagName) !== -1) ;
            else {
              tags.push({ tagName, tagStartPos });
            }
            tagFound = true;
          }
          for (i++; i < xmlData.length; i++) {
            if (xmlData[i] === "<") {
              if (xmlData[i + 1] === "!") {
                i++;
                i = readCommentAndCDATA(xmlData, i);
                continue;
              } else if (xmlData[i + 1] === "?") {
                i = readPI(xmlData, ++i);
                if (i.err) return i;
              } else {
                break;
              }
            } else if (xmlData[i] === "&") {
              const afterAmp = validateAmpersand(xmlData, i);
              if (afterAmp == -1)
                return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
              i = afterAmp;
            } else {
              if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
                return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
              }
            }
          }
          if (xmlData[i] === "<") {
            i--;
          }
        }
      } else {
        if (isWhiteSpace(xmlData[i])) {
          continue;
        }
        return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
      }
    }
    if (!tagFound) {
      return getErrorObject("InvalidXml", "Start tag expected.", 1);
    } else if (tags.length == 1) {
      return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
    } else if (tags.length > 0) {
      return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
    }
    return true;
  };
  function isWhiteSpace(char) {
    return char === " " || char === "	" || char === "\n" || char === "\r";
  }
  function readPI(xmlData, i) {
    const start = i;
    for (; i < xmlData.length; i++) {
      if (xmlData[i] == "?" || xmlData[i] == " ") {
        const tagname = xmlData.substr(start, i - start);
        if (i > 5 && tagname === "xml") {
          return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i));
        } else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
          i++;
          break;
        } else {
          continue;
        }
      }
    }
    return i;
  }
  function readCommentAndCDATA(xmlData, i) {
    if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
      for (i += 3; i < xmlData.length; i++) {
        if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
          i += 2;
          break;
        }
      }
    } else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
      let angleBracketsCount = 1;
      for (i += 8; i < xmlData.length; i++) {
        if (xmlData[i] === "<") {
          angleBracketsCount++;
        } else if (xmlData[i] === ">") {
          angleBracketsCount--;
          if (angleBracketsCount === 0) {
            break;
          }
        }
      }
    } else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
      for (i += 8; i < xmlData.length; i++) {
        if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
          i += 2;
          break;
        }
      }
    }
    return i;
  }
  const doubleQuote = '"';
  const singleQuote = "'";
  function readAttributeStr(xmlData, i) {
    let attrStr = "";
    let startChar = "";
    let tagClosed = false;
    for (; i < xmlData.length; i++) {
      if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
        if (startChar === "") {
          startChar = xmlData[i];
        } else if (startChar !== xmlData[i]) ;
        else {
          startChar = "";
        }
      } else if (xmlData[i] === ">") {
        if (startChar === "") {
          tagClosed = true;
          break;
        }
      }
      attrStr += xmlData[i];
    }
    if (startChar !== "") {
      return false;
    }
    return {
      value: attrStr,
      index: i,
      tagClosed
    };
  }
  const validAttrStrRegxp = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
  function validateAttributeString(attrStr, options) {
    const matches = util2.getAllMatches(attrStr, validAttrStrRegxp);
    const attrNames = {};
    for (let i = 0; i < matches.length; i++) {
      if (matches[i][1].length === 0) {
        return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
      } else if (matches[i][3] !== void 0 && matches[i][4] === void 0) {
        return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
      } else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) {
        return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
      }
      const attrName = matches[i][2];
      if (!validateAttrName(attrName)) {
        return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
      }
      if (!attrNames.hasOwnProperty(attrName)) {
        attrNames[attrName] = 1;
      } else {
        return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
      }
    }
    return true;
  }
  function validateNumberAmpersand(xmlData, i) {
    let re = /\d/;
    if (xmlData[i] === "x") {
      i++;
      re = /[\da-fA-F]/;
    }
    for (; i < xmlData.length; i++) {
      if (xmlData[i] === ";")
        return i;
      if (!xmlData[i].match(re))
        break;
    }
    return -1;
  }
  function validateAmpersand(xmlData, i) {
    i++;
    if (xmlData[i] === ";")
      return -1;
    if (xmlData[i] === "#") {
      i++;
      return validateNumberAmpersand(xmlData, i);
    }
    let count = 0;
    for (; i < xmlData.length; i++, count++) {
      if (xmlData[i].match(/\w/) && count < 20)
        continue;
      if (xmlData[i] === ";")
        break;
      return -1;
    }
    return i;
  }
  function getErrorObject(code, message, lineNumber) {
    return {
      err: {
        code,
        msg: message,
        line: lineNumber.line || lineNumber,
        col: lineNumber.col
      }
    };
  }
  function validateAttrName(attrName) {
    return util2.isName(attrName);
  }
  function validateTagName(tagname) {
    return util2.isName(tagname);
  }
  function getLineNumberForPosition(xmlData, index) {
    const lines = xmlData.substring(0, index).split(/\r?\n/);
    return {
      line: lines.length,
      // column number is last line's length + 1, because column numbering starts at 1:
      col: lines[lines.length - 1].length + 1
    };
  }
  function getPositionFromMatch(match) {
    return match.startIndex + match[1].length;
  }
  return validator;
}
var OptionsBuilder = {};
var hasRequiredOptionsBuilder;
function requireOptionsBuilder() {
  if (hasRequiredOptionsBuilder) return OptionsBuilder;
  hasRequiredOptionsBuilder = 1;
  const defaultOptions = {
    preserveOrder: false,
    attributeNamePrefix: "@_",
    attributesGroupName: false,
    textNodeName: "#text",
    ignoreAttributes: true,
    removeNSPrefix: false,
    // remove NS from tag name or attribute name if true
    allowBooleanAttributes: false,
    //a tag can have attributes without any value
    //ignoreRootElement : false,
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true,
    //Trim string values of tag and attributes
    cdataPropName: false,
    numberParseOptions: {
      hex: true,
      leadingZeros: true,
      eNotation: true
    },
    tagValueProcessor: function(tagName, val) {
      return val;
    },
    attributeValueProcessor: function(attrName, val) {
      return val;
    },
    stopNodes: [],
    //nested tags will not be parsed even for errors
    alwaysCreateTextNode: false,
    isArray: () => false,
    commentPropName: false,
    unpairedTags: [],
    processEntities: true,
    htmlEntities: false,
    ignoreDeclaration: false,
    ignorePiTags: false,
    transformTagName: false,
    transformAttributeName: false,
    updateTag: function(tagName, jPath, attrs) {
      return tagName;
    }
    // skipEmptyListItem: false
  };
  const buildOptions = function(options) {
    return Object.assign({}, defaultOptions, options);
  };
  OptionsBuilder.buildOptions = buildOptions;
  OptionsBuilder.defaultOptions = defaultOptions;
  return OptionsBuilder;
}
var xmlNode;
var hasRequiredXmlNode;
function requireXmlNode() {
  if (hasRequiredXmlNode) return xmlNode;
  hasRequiredXmlNode = 1;
  class XmlNode {
    constructor(tagname) {
      this.tagname = tagname;
      this.child = [];
      this[":@"] = {};
    }
    add(key, val) {
      if (key === "__proto__") key = "#__proto__";
      this.child.push({ [key]: val });
    }
    addChild(node) {
      if (node.tagname === "__proto__") node.tagname = "#__proto__";
      if (node[":@"] && Object.keys(node[":@"]).length > 0) {
        this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
      } else {
        this.child.push({ [node.tagname]: node.child });
      }
    }
  }
  xmlNode = XmlNode;
  return xmlNode;
}
var DocTypeReader;
var hasRequiredDocTypeReader;
function requireDocTypeReader() {
  if (hasRequiredDocTypeReader) return DocTypeReader;
  hasRequiredDocTypeReader = 1;
  const util2 = requireUtil();
  function readDocType(xmlData, i) {
    const entities = {};
    if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
      i = i + 9;
      let angleBracketsCount = 1;
      let hasBody = false, comment = false;
      let exp = "";
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === "<" && !comment) {
          if (hasBody && isEntity(xmlData, i)) {
            i += 7;
            let entityName, val;
            [entityName, val, i] = readEntityExp(xmlData, i + 1);
            if (val.indexOf("&") === -1)
              entities[validateEntityName(entityName)] = {
                regx: RegExp(`&${entityName};`, "g"),
                val
              };
          } else if (hasBody && isElement(xmlData, i)) i += 8;
          else if (hasBody && isAttlist(xmlData, i)) i += 8;
          else if (hasBody && isNotation(xmlData, i)) i += 9;
          else if (isComment) comment = true;
          else throw new Error("Invalid DOCTYPE");
          angleBracketsCount++;
          exp = "";
        } else if (xmlData[i] === ">") {
          if (comment) {
            if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
              comment = false;
              angleBracketsCount--;
            }
          } else {
            angleBracketsCount--;
          }
          if (angleBracketsCount === 0) {
            break;
          }
        } else if (xmlData[i] === "[") {
          hasBody = true;
        } else {
          exp += xmlData[i];
        }
      }
      if (angleBracketsCount !== 0) {
        throw new Error(`Unclosed DOCTYPE`);
      }
    } else {
      throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return { entities, i };
  }
  function readEntityExp(xmlData, i) {
    let entityName = "";
    for (; i < xmlData.length && (xmlData[i] !== "'" && xmlData[i] !== '"'); i++) {
      entityName += xmlData[i];
    }
    entityName = entityName.trim();
    if (entityName.indexOf(" ") !== -1) throw new Error("External entites are not supported");
    const startChar = xmlData[i++];
    let val = "";
    for (; i < xmlData.length && xmlData[i] !== startChar; i++) {
      val += xmlData[i];
    }
    return [entityName, val, i];
  }
  function isComment(xmlData, i) {
    if (xmlData[i + 1] === "!" && xmlData[i + 2] === "-" && xmlData[i + 3] === "-") return true;
    return false;
  }
  function isEntity(xmlData, i) {
    if (xmlData[i + 1] === "!" && xmlData[i + 2] === "E" && xmlData[i + 3] === "N" && xmlData[i + 4] === "T" && xmlData[i + 5] === "I" && xmlData[i + 6] === "T" && xmlData[i + 7] === "Y") return true;
    return false;
  }
  function isElement(xmlData, i) {
    if (xmlData[i + 1] === "!" && xmlData[i + 2] === "E" && xmlData[i + 3] === "L" && xmlData[i + 4] === "E" && xmlData[i + 5] === "M" && xmlData[i + 6] === "E" && xmlData[i + 7] === "N" && xmlData[i + 8] === "T") return true;
    return false;
  }
  function isAttlist(xmlData, i) {
    if (xmlData[i + 1] === "!" && xmlData[i + 2] === "A" && xmlData[i + 3] === "T" && xmlData[i + 4] === "T" && xmlData[i + 5] === "L" && xmlData[i + 6] === "I" && xmlData[i + 7] === "S" && xmlData[i + 8] === "T") return true;
    return false;
  }
  function isNotation(xmlData, i) {
    if (xmlData[i + 1] === "!" && xmlData[i + 2] === "N" && xmlData[i + 3] === "O" && xmlData[i + 4] === "T" && xmlData[i + 5] === "A" && xmlData[i + 6] === "T" && xmlData[i + 7] === "I" && xmlData[i + 8] === "O" && xmlData[i + 9] === "N") return true;
    return false;
  }
  function validateEntityName(name) {
    if (util2.isName(name))
      return name;
    else
      throw new Error(`Invalid entity name ${name}`);
  }
  DocTypeReader = readDocType;
  return DocTypeReader;
}
var strnum;
var hasRequiredStrnum;
function requireStrnum() {
  if (hasRequiredStrnum) return strnum;
  hasRequiredStrnum = 1;
  const hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
  const numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
  const consider = {
    hex: true,
    // oct: false,
    leadingZeros: true,
    decimalPoint: ".",
    eNotation: true
    //skipLike: /regex/
  };
  function toNumber(str, options = {}) {
    options = Object.assign({}, consider, options);
    if (!str || typeof str !== "string") return str;
    let trimmedStr = str.trim();
    if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr)) return str;
    else if (str === "0") return 0;
    else if (options.hex && hexRegex.test(trimmedStr)) {
      return parse_int(trimmedStr, 16);
    } else if (trimmedStr.search(/[eE]/) !== -1) {
      const notation = trimmedStr.match(/^([-\+])?(0*)([0-9]*(\.[0-9]*)?[eE][-\+]?[0-9]+)$/);
      if (notation) {
        if (options.leadingZeros) {
          trimmedStr = (notation[1] || "") + notation[3];
        } else {
          if (notation[2] === "0" && notation[3][0] === ".") ;
          else {
            return str;
          }
        }
        return options.eNotation ? Number(trimmedStr) : str;
      } else {
        return str;
      }
    } else {
      const match = numRegex.exec(trimmedStr);
      if (match) {
        const sign = match[1];
        const leadingZeros = match[2];
        let numTrimmedByZeros = trimZeros(match[3]);
        if (!options.leadingZeros && leadingZeros.length > 0 && sign && trimmedStr[2] !== ".") return str;
        else if (!options.leadingZeros && leadingZeros.length > 0 && !sign && trimmedStr[1] !== ".") return str;
        else if (options.leadingZeros && leadingZeros === str) return 0;
        else {
          const num = Number(trimmedStr);
          const numStr = "" + num;
          if (numStr.search(/[eE]/) !== -1) {
            if (options.eNotation) return num;
            else return str;
          } else if (trimmedStr.indexOf(".") !== -1) {
            if (numStr === "0" && numTrimmedByZeros === "") return num;
            else if (numStr === numTrimmedByZeros) return num;
            else if (sign && numStr === "-" + numTrimmedByZeros) return num;
            else return str;
          }
          if (leadingZeros) {
            return numTrimmedByZeros === numStr || sign + numTrimmedByZeros === numStr ? num : str;
          } else {
            return trimmedStr === numStr || trimmedStr === sign + numStr ? num : str;
          }
        }
      } else {
        return str;
      }
    }
  }
  function trimZeros(numStr) {
    if (numStr && numStr.indexOf(".") !== -1) {
      numStr = numStr.replace(/0+$/, "");
      if (numStr === ".") numStr = "0";
      else if (numStr[0] === ".") numStr = "0" + numStr;
      else if (numStr[numStr.length - 1] === ".") numStr = numStr.substr(0, numStr.length - 1);
      return numStr;
    }
    return numStr;
  }
  function parse_int(numStr, base) {
    if (parseInt) return parseInt(numStr, base);
    else if (Number.parseInt) return Number.parseInt(numStr, base);
    else if (window && window.parseInt) return window.parseInt(numStr, base);
    else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
  }
  strnum = toNumber;
  return strnum;
}
var ignoreAttributes;
var hasRequiredIgnoreAttributes;
function requireIgnoreAttributes() {
  if (hasRequiredIgnoreAttributes) return ignoreAttributes;
  hasRequiredIgnoreAttributes = 1;
  function getIgnoreAttributesFn(ignoreAttributes2) {
    if (typeof ignoreAttributes2 === "function") {
      return ignoreAttributes2;
    }
    if (Array.isArray(ignoreAttributes2)) {
      return (attrName) => {
        for (const pattern of ignoreAttributes2) {
          if (typeof pattern === "string" && attrName === pattern) {
            return true;
          }
          if (pattern instanceof RegExp && pattern.test(attrName)) {
            return true;
          }
        }
      };
    }
    return () => false;
  }
  ignoreAttributes = getIgnoreAttributesFn;
  return ignoreAttributes;
}
var OrderedObjParser_1;
var hasRequiredOrderedObjParser;
function requireOrderedObjParser() {
  if (hasRequiredOrderedObjParser) return OrderedObjParser_1;
  hasRequiredOrderedObjParser = 1;
  const util2 = requireUtil();
  const xmlNode2 = requireXmlNode();
  const readDocType = requireDocTypeReader();
  const toNumber = requireStrnum();
  const getIgnoreAttributesFn = requireIgnoreAttributes();
  class OrderedObjParser {
    constructor(options) {
      this.options = options;
      this.currentNode = null;
      this.tagsNodeStack = [];
      this.docTypeEntities = {};
      this.lastEntities = {
        "apos": { regex: /&(apos|#39|#x27);/g, val: "'" },
        "gt": { regex: /&(gt|#62|#x3E);/g, val: ">" },
        "lt": { regex: /&(lt|#60|#x3C);/g, val: "<" },
        "quot": { regex: /&(quot|#34|#x22);/g, val: '"' }
      };
      this.ampEntity = { regex: /&(amp|#38|#x26);/g, val: "&" };
      this.htmlEntities = {
        "space": { regex: /&(nbsp|#160);/g, val: " " },
        // "lt" : { regex: /&(lt|#60);/g, val: "<" },
        // "gt" : { regex: /&(gt|#62);/g, val: ">" },
        // "amp" : { regex: /&(amp|#38);/g, val: "&" },
        // "quot" : { regex: /&(quot|#34);/g, val: "\"" },
        // "apos" : { regex: /&(apos|#39);/g, val: "'" },
        "cent": { regex: /&(cent|#162);/g, val: "¢" },
        "pound": { regex: /&(pound|#163);/g, val: "£" },
        "yen": { regex: /&(yen|#165);/g, val: "¥" },
        "euro": { regex: /&(euro|#8364);/g, val: "€" },
        "copyright": { regex: /&(copy|#169);/g, val: "©" },
        "reg": { regex: /&(reg|#174);/g, val: "®" },
        "inr": { regex: /&(inr|#8377);/g, val: "₹" },
        "num_dec": { regex: /&#([0-9]{1,7});/g, val: (_, str) => String.fromCharCode(Number.parseInt(str, 10)) },
        "num_hex": { regex: /&#x([0-9a-fA-F]{1,6});/g, val: (_, str) => String.fromCharCode(Number.parseInt(str, 16)) }
      };
      this.addExternalEntities = addExternalEntities;
      this.parseXml = parseXml;
      this.parseTextData = parseTextData;
      this.resolveNameSpace = resolveNameSpace;
      this.buildAttributesMap = buildAttributesMap;
      this.isItStopNode = isItStopNode;
      this.replaceEntitiesValue = replaceEntitiesValue;
      this.readStopNodeData = readStopNodeData;
      this.saveTextToParentTag = saveTextToParentTag;
      this.addChild = addChild;
      this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
    }
  }
  function addExternalEntities(externalEntities) {
    const entKeys = Object.keys(externalEntities);
    for (let i = 0; i < entKeys.length; i++) {
      const ent = entKeys[i];
      this.lastEntities[ent] = {
        regex: new RegExp("&" + ent + ";", "g"),
        val: externalEntities[ent]
      };
    }
  }
  function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
    if (val !== void 0) {
      if (this.options.trimValues && !dontTrim) {
        val = val.trim();
      }
      if (val.length > 0) {
        if (!escapeEntities) val = this.replaceEntitiesValue(val);
        const newval = this.options.tagValueProcessor(tagName, val, jPath, hasAttributes, isLeafNode);
        if (newval === null || newval === void 0) {
          return val;
        } else if (typeof newval !== typeof val || newval !== val) {
          return newval;
        } else if (this.options.trimValues) {
          return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
        } else {
          const trimmedVal = val.trim();
          if (trimmedVal === val) {
            return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
          } else {
            return val;
          }
        }
      }
    }
  }
  function resolveNameSpace(tagname) {
    if (this.options.removeNSPrefix) {
      const tags = tagname.split(":");
      const prefix = tagname.charAt(0) === "/" ? "/" : "";
      if (tags[0] === "xmlns") {
        return "";
      }
      if (tags.length === 2) {
        tagname = prefix + tags[1];
      }
    }
    return tagname;
  }
  const attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
  function buildAttributesMap(attrStr, jPath, tagName) {
    if (this.options.ignoreAttributes !== true && typeof attrStr === "string") {
      const matches = util2.getAllMatches(attrStr, attrsRegx);
      const len = matches.length;
      const attrs = {};
      for (let i = 0; i < len; i++) {
        const attrName = this.resolveNameSpace(matches[i][1]);
        if (this.ignoreAttributesFn(attrName, jPath)) {
          continue;
        }
        let oldVal = matches[i][4];
        let aName = this.options.attributeNamePrefix + attrName;
        if (attrName.length) {
          if (this.options.transformAttributeName) {
            aName = this.options.transformAttributeName(aName);
          }
          if (aName === "__proto__") aName = "#__proto__";
          if (oldVal !== void 0) {
            if (this.options.trimValues) {
              oldVal = oldVal.trim();
            }
            oldVal = this.replaceEntitiesValue(oldVal);
            const newVal = this.options.attributeValueProcessor(attrName, oldVal, jPath);
            if (newVal === null || newVal === void 0) {
              attrs[aName] = oldVal;
            } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
              attrs[aName] = newVal;
            } else {
              attrs[aName] = parseValue(
                oldVal,
                this.options.parseAttributeValue,
                this.options.numberParseOptions
              );
            }
          } else if (this.options.allowBooleanAttributes) {
            attrs[aName] = true;
          }
        }
      }
      if (!Object.keys(attrs).length) {
        return;
      }
      if (this.options.attributesGroupName) {
        const attrCollection = {};
        attrCollection[this.options.attributesGroupName] = attrs;
        return attrCollection;
      }
      return attrs;
    }
  }
  const parseXml = function(xmlData) {
    xmlData = xmlData.replace(/\r\n?/g, "\n");
    const xmlObj = new xmlNode2("!xml");
    let currentNode = xmlObj;
    let textData = "";
    let jPath = "";
    for (let i = 0; i < xmlData.length; i++) {
      const ch = xmlData[i];
      if (ch === "<") {
        if (xmlData[i + 1] === "/") {
          const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
          let tagName = xmlData.substring(i + 2, closeIndex).trim();
          if (this.options.removeNSPrefix) {
            const colonIndex = tagName.indexOf(":");
            if (colonIndex !== -1) {
              tagName = tagName.substr(colonIndex + 1);
            }
          }
          if (this.options.transformTagName) {
            tagName = this.options.transformTagName(tagName);
          }
          if (currentNode) {
            textData = this.saveTextToParentTag(textData, currentNode, jPath);
          }
          const lastTagName = jPath.substring(jPath.lastIndexOf(".") + 1);
          if (tagName && this.options.unpairedTags.indexOf(tagName) !== -1) {
            throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
          }
          let propIndex = 0;
          if (lastTagName && this.options.unpairedTags.indexOf(lastTagName) !== -1) {
            propIndex = jPath.lastIndexOf(".", jPath.lastIndexOf(".") - 1);
            this.tagsNodeStack.pop();
          } else {
            propIndex = jPath.lastIndexOf(".");
          }
          jPath = jPath.substring(0, propIndex);
          currentNode = this.tagsNodeStack.pop();
          textData = "";
          i = closeIndex;
        } else if (xmlData[i + 1] === "?") {
          let tagData = readTagExp(xmlData, i, false, "?>");
          if (!tagData) throw new Error("Pi Tag is not closed.");
          textData = this.saveTextToParentTag(textData, currentNode, jPath);
          if (this.options.ignoreDeclaration && tagData.tagName === "?xml" || this.options.ignorePiTags) ;
          else {
            const childNode = new xmlNode2(tagData.tagName);
            childNode.add(this.options.textNodeName, "");
            if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent) {
              childNode[":@"] = this.buildAttributesMap(tagData.tagExp, jPath, tagData.tagName);
            }
            this.addChild(currentNode, childNode, jPath);
          }
          i = tagData.closeIndex + 1;
        } else if (xmlData.substr(i + 1, 3) === "!--") {
          const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
          if (this.options.commentPropName) {
            const comment = xmlData.substring(i + 4, endIndex - 2);
            textData = this.saveTextToParentTag(textData, currentNode, jPath);
            currentNode.add(this.options.commentPropName, [{ [this.options.textNodeName]: comment }]);
          }
          i = endIndex;
        } else if (xmlData.substr(i + 1, 2) === "!D") {
          const result = readDocType(xmlData, i);
          this.docTypeEntities = result.entities;
          i = result.i;
        } else if (xmlData.substr(i + 1, 2) === "![") {
          const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
          const tagExp = xmlData.substring(i + 9, closeIndex);
          textData = this.saveTextToParentTag(textData, currentNode, jPath);
          let val = this.parseTextData(tagExp, currentNode.tagname, jPath, true, false, true, true);
          if (val == void 0) val = "";
          if (this.options.cdataPropName) {
            currentNode.add(this.options.cdataPropName, [{ [this.options.textNodeName]: tagExp }]);
          } else {
            currentNode.add(this.options.textNodeName, val);
          }
          i = closeIndex + 2;
        } else {
          let result = readTagExp(xmlData, i, this.options.removeNSPrefix);
          let tagName = result.tagName;
          const rawTagName = result.rawTagName;
          let tagExp = result.tagExp;
          let attrExpPresent = result.attrExpPresent;
          let closeIndex = result.closeIndex;
          if (this.options.transformTagName) {
            tagName = this.options.transformTagName(tagName);
          }
          if (currentNode && textData) {
            if (currentNode.tagname !== "!xml") {
              textData = this.saveTextToParentTag(textData, currentNode, jPath, false);
            }
          }
          const lastTag = currentNode;
          if (lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1) {
            currentNode = this.tagsNodeStack.pop();
            jPath = jPath.substring(0, jPath.lastIndexOf("."));
          }
          if (tagName !== xmlObj.tagname) {
            jPath += jPath ? "." + tagName : tagName;
          }
          if (this.isItStopNode(this.options.stopNodes, jPath, tagName)) {
            let tagContent = "";
            if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
              if (tagName[tagName.length - 1] === "/") {
                tagName = tagName.substr(0, tagName.length - 1);
                jPath = jPath.substr(0, jPath.length - 1);
                tagExp = tagName;
              } else {
                tagExp = tagExp.substr(0, tagExp.length - 1);
              }
              i = result.closeIndex;
            } else if (this.options.unpairedTags.indexOf(tagName) !== -1) {
              i = result.closeIndex;
            } else {
              const result2 = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
              if (!result2) throw new Error(`Unexpected end of ${rawTagName}`);
              i = result2.i;
              tagContent = result2.tagContent;
            }
            const childNode = new xmlNode2(tagName);
            if (tagName !== tagExp && attrExpPresent) {
              childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
            }
            if (tagContent) {
              tagContent = this.parseTextData(tagContent, tagName, jPath, true, attrExpPresent, true, true);
            }
            jPath = jPath.substr(0, jPath.lastIndexOf("."));
            childNode.add(this.options.textNodeName, tagContent);
            this.addChild(currentNode, childNode, jPath);
          } else {
            if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
              if (tagName[tagName.length - 1] === "/") {
                tagName = tagName.substr(0, tagName.length - 1);
                jPath = jPath.substr(0, jPath.length - 1);
                tagExp = tagName;
              } else {
                tagExp = tagExp.substr(0, tagExp.length - 1);
              }
              if (this.options.transformTagName) {
                tagName = this.options.transformTagName(tagName);
              }
              const childNode = new xmlNode2(tagName);
              if (tagName !== tagExp && attrExpPresent) {
                childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
              }
              this.addChild(currentNode, childNode, jPath);
              jPath = jPath.substr(0, jPath.lastIndexOf("."));
            } else {
              const childNode = new xmlNode2(tagName);
              this.tagsNodeStack.push(currentNode);
              if (tagName !== tagExp && attrExpPresent) {
                childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
              }
              this.addChild(currentNode, childNode, jPath);
              currentNode = childNode;
            }
            textData = "";
            i = closeIndex;
          }
        }
      } else {
        textData += xmlData[i];
      }
    }
    return xmlObj.child;
  };
  function addChild(currentNode, childNode, jPath) {
    const result = this.options.updateTag(childNode.tagname, jPath, childNode[":@"]);
    if (result === false) ;
    else if (typeof result === "string") {
      childNode.tagname = result;
      currentNode.addChild(childNode);
    } else {
      currentNode.addChild(childNode);
    }
  }
  const replaceEntitiesValue = function(val) {
    if (this.options.processEntities) {
      for (let entityName in this.docTypeEntities) {
        const entity = this.docTypeEntities[entityName];
        val = val.replace(entity.regx, entity.val);
      }
      for (let entityName in this.lastEntities) {
        const entity = this.lastEntities[entityName];
        val = val.replace(entity.regex, entity.val);
      }
      if (this.options.htmlEntities) {
        for (let entityName in this.htmlEntities) {
          const entity = this.htmlEntities[entityName];
          val = val.replace(entity.regex, entity.val);
        }
      }
      val = val.replace(this.ampEntity.regex, this.ampEntity.val);
    }
    return val;
  };
  function saveTextToParentTag(textData, currentNode, jPath, isLeafNode) {
    if (textData) {
      if (isLeafNode === void 0) isLeafNode = currentNode.child.length === 0;
      textData = this.parseTextData(
        textData,
        currentNode.tagname,
        jPath,
        false,
        currentNode[":@"] ? Object.keys(currentNode[":@"]).length !== 0 : false,
        isLeafNode
      );
      if (textData !== void 0 && textData !== "")
        currentNode.add(this.options.textNodeName, textData);
      textData = "";
    }
    return textData;
  }
  function isItStopNode(stopNodes, jPath, currentTagName) {
    const allNodesExp = "*." + currentTagName;
    for (const stopNodePath in stopNodes) {
      const stopNodeExp = stopNodes[stopNodePath];
      if (allNodesExp === stopNodeExp || jPath === stopNodeExp) return true;
    }
    return false;
  }
  function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
    let attrBoundary;
    let tagExp = "";
    for (let index = i; index < xmlData.length; index++) {
      let ch = xmlData[index];
      if (attrBoundary) {
        if (ch === attrBoundary) attrBoundary = "";
      } else if (ch === '"' || ch === "'") {
        attrBoundary = ch;
      } else if (ch === closingChar[0]) {
        if (closingChar[1]) {
          if (xmlData[index + 1] === closingChar[1]) {
            return {
              data: tagExp,
              index
            };
          }
        } else {
          return {
            data: tagExp,
            index
          };
        }
      } else if (ch === "	") {
        ch = " ";
      }
      tagExp += ch;
    }
  }
  function findClosingIndex(xmlData, str, i, errMsg) {
    const closingIndex = xmlData.indexOf(str, i);
    if (closingIndex === -1) {
      throw new Error(errMsg);
    } else {
      return closingIndex + str.length - 1;
    }
  }
  function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
    const result = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
    if (!result) return;
    let tagExp = result.data;
    const closeIndex = result.index;
    const separatorIndex = tagExp.search(/\s/);
    let tagName = tagExp;
    let attrExpPresent = true;
    if (separatorIndex !== -1) {
      tagName = tagExp.substring(0, separatorIndex);
      tagExp = tagExp.substring(separatorIndex + 1).trimStart();
    }
    const rawTagName = tagName;
    if (removeNSPrefix) {
      const colonIndex = tagName.indexOf(":");
      if (colonIndex !== -1) {
        tagName = tagName.substr(colonIndex + 1);
        attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
      }
    }
    return {
      tagName,
      tagExp,
      closeIndex,
      attrExpPresent,
      rawTagName
    };
  }
  function readStopNodeData(xmlData, tagName, i) {
    const startIndex = i;
    let openTagCount = 1;
    for (; i < xmlData.length; i++) {
      if (xmlData[i] === "<") {
        if (xmlData[i + 1] === "/") {
          const closeIndex = findClosingIndex(xmlData, ">", i, `${tagName} is not closed`);
          let closeTagName = xmlData.substring(i + 2, closeIndex).trim();
          if (closeTagName === tagName) {
            openTagCount--;
            if (openTagCount === 0) {
              return {
                tagContent: xmlData.substring(startIndex, i),
                i: closeIndex
              };
            }
          }
          i = closeIndex;
        } else if (xmlData[i + 1] === "?") {
          const closeIndex = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
          i = closeIndex;
        } else if (xmlData.substr(i + 1, 3) === "!--") {
          const closeIndex = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
          i = closeIndex;
        } else if (xmlData.substr(i + 1, 2) === "![") {
          const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
          i = closeIndex;
        } else {
          const tagData = readTagExp(xmlData, i, ">");
          if (tagData) {
            const openTagName = tagData && tagData.tagName;
            if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
              openTagCount++;
            }
            i = tagData.closeIndex;
          }
        }
      }
    }
  }
  function parseValue(val, shouldParse, options) {
    if (shouldParse && typeof val === "string") {
      const newval = val.trim();
      if (newval === "true") return true;
      else if (newval === "false") return false;
      else return toNumber(val, options);
    } else {
      if (util2.isExist(val)) {
        return val;
      } else {
        return "";
      }
    }
  }
  OrderedObjParser_1 = OrderedObjParser;
  return OrderedObjParser_1;
}
var node2json = {};
var hasRequiredNode2json;
function requireNode2json() {
  if (hasRequiredNode2json) return node2json;
  hasRequiredNode2json = 1;
  function prettify(node, options) {
    return compress(node, options);
  }
  function compress(arr, options, jPath) {
    let text;
    const compressedObj = {};
    for (let i = 0; i < arr.length; i++) {
      const tagObj = arr[i];
      const property = propName(tagObj);
      let newJpath = "";
      if (jPath === void 0) newJpath = property;
      else newJpath = jPath + "." + property;
      if (property === options.textNodeName) {
        if (text === void 0) text = tagObj[property];
        else text += "" + tagObj[property];
      } else if (property === void 0) {
        continue;
      } else if (tagObj[property]) {
        let val = compress(tagObj[property], options, newJpath);
        const isLeaf2 = isLeafTag(val, options);
        if (tagObj[":@"]) {
          assignAttributes(val, tagObj[":@"], newJpath, options);
        } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
          val = val[options.textNodeName];
        } else if (Object.keys(val).length === 0) {
          if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
          else val = "";
        }
        if (compressedObj[property] !== void 0 && compressedObj.hasOwnProperty(property)) {
          if (!Array.isArray(compressedObj[property])) {
            compressedObj[property] = [compressedObj[property]];
          }
          compressedObj[property].push(val);
        } else {
          if (options.isArray(property, newJpath, isLeaf2)) {
            compressedObj[property] = [val];
          } else {
            compressedObj[property] = val;
          }
        }
      }
    }
    if (typeof text === "string") {
      if (text.length > 0) compressedObj[options.textNodeName] = text;
    } else if (text !== void 0) compressedObj[options.textNodeName] = text;
    return compressedObj;
  }
  function propName(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key !== ":@") return key;
    }
  }
  function assignAttributes(obj, attrMap, jpath, options) {
    if (attrMap) {
      const keys = Object.keys(attrMap);
      const len = keys.length;
      for (let i = 0; i < len; i++) {
        const atrrName = keys[i];
        if (options.isArray(atrrName, jpath + "." + atrrName, true, true)) {
          obj[atrrName] = [attrMap[atrrName]];
        } else {
          obj[atrrName] = attrMap[atrrName];
        }
      }
    }
  }
  function isLeafTag(obj, options) {
    const { textNodeName } = options;
    const propCount = Object.keys(obj).length;
    if (propCount === 0) {
      return true;
    }
    if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) {
      return true;
    }
    return false;
  }
  node2json.prettify = prettify;
  return node2json;
}
var XMLParser_1;
var hasRequiredXMLParser;
function requireXMLParser() {
  if (hasRequiredXMLParser) return XMLParser_1;
  hasRequiredXMLParser = 1;
  const { buildOptions } = requireOptionsBuilder();
  const OrderedObjParser = requireOrderedObjParser();
  const { prettify } = requireNode2json();
  const validator2 = requireValidator();
  class XMLParser {
    constructor(options) {
      this.externalEntities = {};
      this.options = buildOptions(options);
    }
    /**
     * Parse XML dats to JS object 
     * @param {string|Buffer} xmlData 
     * @param {boolean|Object} validationOption 
     */
    parse(xmlData, validationOption) {
      if (typeof xmlData === "string") ;
      else if (xmlData.toString) {
        xmlData = xmlData.toString();
      } else {
        throw new Error("XML data is accepted in String or Bytes[] form.");
      }
      if (validationOption) {
        if (validationOption === true) validationOption = {};
        const result = validator2.validate(xmlData, validationOption);
        if (result !== true) {
          throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
        }
      }
      const orderedObjParser = new OrderedObjParser(this.options);
      orderedObjParser.addExternalEntities(this.externalEntities);
      const orderedResult = orderedObjParser.parseXml(xmlData);
      if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
      else return prettify(orderedResult, this.options);
    }
    /**
     * Add Entity which is not by default supported by this library
     * @param {string} key 
     * @param {string} value 
     */
    addEntity(key, value) {
      if (value.indexOf("&") !== -1) {
        throw new Error("Entity value can't have '&'");
      } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
        throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
      } else if (value === "&") {
        throw new Error("An entity with value '&' is not permitted");
      } else {
        this.externalEntities[key] = value;
      }
    }
  }
  XMLParser_1 = XMLParser;
  return XMLParser_1;
}
var orderedJs2Xml;
var hasRequiredOrderedJs2Xml;
function requireOrderedJs2Xml() {
  if (hasRequiredOrderedJs2Xml) return orderedJs2Xml;
  hasRequiredOrderedJs2Xml = 1;
  const EOL = "\n";
  function toXml(jArray, options) {
    let indentation = "";
    if (options.format && options.indentBy.length > 0) {
      indentation = EOL;
    }
    return arrToStr(jArray, options, "", indentation);
  }
  function arrToStr(arr, options, jPath, indentation) {
    let xmlStr = "";
    let isPreviousElementTag = false;
    for (let i = 0; i < arr.length; i++) {
      const tagObj = arr[i];
      const tagName = propName(tagObj);
      if (tagName === void 0) continue;
      let newJPath = "";
      if (jPath.length === 0) newJPath = tagName;
      else newJPath = `${jPath}.${tagName}`;
      if (tagName === options.textNodeName) {
        let tagText = tagObj[tagName];
        if (!isStopNode(newJPath, options)) {
          tagText = options.tagValueProcessor(tagName, tagText);
          tagText = replaceEntitiesValue(tagText, options);
        }
        if (isPreviousElementTag) {
          xmlStr += indentation;
        }
        xmlStr += tagText;
        isPreviousElementTag = false;
        continue;
      } else if (tagName === options.cdataPropName) {
        if (isPreviousElementTag) {
          xmlStr += indentation;
        }
        xmlStr += `<![CDATA[${tagObj[tagName][0][options.textNodeName]}]]>`;
        isPreviousElementTag = false;
        continue;
      } else if (tagName === options.commentPropName) {
        xmlStr += indentation + `<!--${tagObj[tagName][0][options.textNodeName]}-->`;
        isPreviousElementTag = true;
        continue;
      } else if (tagName[0] === "?") {
        const attStr2 = attr_to_str(tagObj[":@"], options);
        const tempInd = tagName === "?xml" ? "" : indentation;
        let piTextNodeName = tagObj[tagName][0][options.textNodeName];
        piTextNodeName = piTextNodeName.length !== 0 ? " " + piTextNodeName : "";
        xmlStr += tempInd + `<${tagName}${piTextNodeName}${attStr2}?>`;
        isPreviousElementTag = true;
        continue;
      }
      let newIdentation = indentation;
      if (newIdentation !== "") {
        newIdentation += options.indentBy;
      }
      const attStr = attr_to_str(tagObj[":@"], options);
      const tagStart = indentation + `<${tagName}${attStr}`;
      const tagValue = arrToStr(tagObj[tagName], options, newJPath, newIdentation);
      if (options.unpairedTags.indexOf(tagName) !== -1) {
        if (options.suppressUnpairedNode) xmlStr += tagStart + ">";
        else xmlStr += tagStart + "/>";
      } else if ((!tagValue || tagValue.length === 0) && options.suppressEmptyNode) {
        xmlStr += tagStart + "/>";
      } else if (tagValue && tagValue.endsWith(">")) {
        xmlStr += tagStart + `>${tagValue}${indentation}</${tagName}>`;
      } else {
        xmlStr += tagStart + ">";
        if (tagValue && indentation !== "" && (tagValue.includes("/>") || tagValue.includes("</"))) {
          xmlStr += indentation + options.indentBy + tagValue + indentation;
        } else {
          xmlStr += tagValue;
        }
        xmlStr += `</${tagName}>`;
      }
      isPreviousElementTag = true;
    }
    return xmlStr;
  }
  function propName(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!obj.hasOwnProperty(key)) continue;
      if (key !== ":@") return key;
    }
  }
  function attr_to_str(attrMap, options) {
    let attrStr = "";
    if (attrMap && !options.ignoreAttributes) {
      for (let attr in attrMap) {
        if (!attrMap.hasOwnProperty(attr)) continue;
        let attrVal = options.attributeValueProcessor(attr, attrMap[attr]);
        attrVal = replaceEntitiesValue(attrVal, options);
        if (attrVal === true && options.suppressBooleanAttributes) {
          attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}`;
        } else {
          attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}="${attrVal}"`;
        }
      }
    }
    return attrStr;
  }
  function isStopNode(jPath, options) {
    jPath = jPath.substr(0, jPath.length - options.textNodeName.length - 1);
    let tagName = jPath.substr(jPath.lastIndexOf(".") + 1);
    for (let index in options.stopNodes) {
      if (options.stopNodes[index] === jPath || options.stopNodes[index] === "*." + tagName) return true;
    }
    return false;
  }
  function replaceEntitiesValue(textValue, options) {
    if (textValue && textValue.length > 0 && options.processEntities) {
      for (let i = 0; i < options.entities.length; i++) {
        const entity = options.entities[i];
        textValue = textValue.replace(entity.regex, entity.val);
      }
    }
    return textValue;
  }
  orderedJs2Xml = toXml;
  return orderedJs2Xml;
}
var json2xml;
var hasRequiredJson2xml;
function requireJson2xml() {
  if (hasRequiredJson2xml) return json2xml;
  hasRequiredJson2xml = 1;
  const buildFromOrderedJs = requireOrderedJs2Xml();
  const getIgnoreAttributesFn = requireIgnoreAttributes();
  const defaultOptions = {
    attributeNamePrefix: "@_",
    attributesGroupName: false,
    textNodeName: "#text",
    ignoreAttributes: true,
    cdataPropName: false,
    format: false,
    indentBy: "  ",
    suppressEmptyNode: false,
    suppressUnpairedNode: true,
    suppressBooleanAttributes: true,
    tagValueProcessor: function(key, a) {
      return a;
    },
    attributeValueProcessor: function(attrName, a) {
      return a;
    },
    preserveOrder: false,
    commentPropName: false,
    unpairedTags: [],
    entities: [
      { regex: new RegExp("&", "g"), val: "&amp;" },
      //it must be on top
      { regex: new RegExp(">", "g"), val: "&gt;" },
      { regex: new RegExp("<", "g"), val: "&lt;" },
      { regex: new RegExp("'", "g"), val: "&apos;" },
      { regex: new RegExp('"', "g"), val: "&quot;" }
    ],
    processEntities: true,
    stopNodes: [],
    // transformTagName: false,
    // transformAttributeName: false,
    oneListGroup: false
  };
  function Builder(options) {
    this.options = Object.assign({}, defaultOptions, options);
    if (this.options.ignoreAttributes === true || this.options.attributesGroupName) {
      this.isAttribute = function() {
        return false;
      };
    } else {
      this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
      this.attrPrefixLen = this.options.attributeNamePrefix.length;
      this.isAttribute = isAttribute;
    }
    this.processTextOrObjNode = processTextOrObjNode;
    if (this.options.format) {
      this.indentate = indentate;
      this.tagEndChar = ">\n";
      this.newLine = "\n";
    } else {
      this.indentate = function() {
        return "";
      };
      this.tagEndChar = ">";
      this.newLine = "";
    }
  }
  Builder.prototype.build = function(jObj) {
    if (this.options.preserveOrder) {
      return buildFromOrderedJs(jObj, this.options);
    } else {
      if (Array.isArray(jObj) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1) {
        jObj = {
          [this.options.arrayNodeName]: jObj
        };
      }
      return this.j2x(jObj, 0, []).val;
    }
  };
  Builder.prototype.j2x = function(jObj, level, ajPath) {
    let attrStr = "";
    let val = "";
    const jPath = ajPath.join(".");
    for (let key in jObj) {
      if (!Object.prototype.hasOwnProperty.call(jObj, key)) continue;
      if (typeof jObj[key] === "undefined") {
        if (this.isAttribute(key)) {
          val += "";
        }
      } else if (jObj[key] === null) {
        if (this.isAttribute(key)) {
          val += "";
        } else if (key === this.options.cdataPropName) {
          val += "";
        } else if (key[0] === "?") {
          val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
        } else {
          val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
        }
      } else if (jObj[key] instanceof Date) {
        val += this.buildTextValNode(jObj[key], key, "", level);
      } else if (typeof jObj[key] !== "object") {
        const attr = this.isAttribute(key);
        if (attr && !this.ignoreAttributesFn(attr, jPath)) {
          attrStr += this.buildAttrPairStr(attr, "" + jObj[key]);
        } else if (!attr) {
          if (key === this.options.textNodeName) {
            let newval = this.options.tagValueProcessor(key, "" + jObj[key]);
            val += this.replaceEntitiesValue(newval);
          } else {
            val += this.buildTextValNode(jObj[key], key, "", level);
          }
        }
      } else if (Array.isArray(jObj[key])) {
        const arrLen = jObj[key].length;
        let listTagVal = "";
        let listTagAttr = "";
        for (let j = 0; j < arrLen; j++) {
          const item = jObj[key][j];
          if (typeof item === "undefined") ;
          else if (item === null) {
            if (key[0] === "?") val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
            else val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
          } else if (typeof item === "object") {
            if (this.options.oneListGroup) {
              const result = this.j2x(item, level + 1, ajPath.concat(key));
              listTagVal += result.val;
              if (this.options.attributesGroupName && item.hasOwnProperty(this.options.attributesGroupName)) {
                listTagAttr += result.attrStr;
              }
            } else {
              listTagVal += this.processTextOrObjNode(item, key, level, ajPath);
            }
          } else {
            if (this.options.oneListGroup) {
              let textValue = this.options.tagValueProcessor(key, item);
              textValue = this.replaceEntitiesValue(textValue);
              listTagVal += textValue;
            } else {
              listTagVal += this.buildTextValNode(item, key, "", level);
            }
          }
        }
        if (this.options.oneListGroup) {
          listTagVal = this.buildObjectNode(listTagVal, key, listTagAttr, level);
        }
        val += listTagVal;
      } else {
        if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
          const Ks = Object.keys(jObj[key]);
          const L = Ks.length;
          for (let j = 0; j < L; j++) {
            attrStr += this.buildAttrPairStr(Ks[j], "" + jObj[key][Ks[j]]);
          }
        } else {
          val += this.processTextOrObjNode(jObj[key], key, level, ajPath);
        }
      }
    }
    return { attrStr, val };
  };
  Builder.prototype.buildAttrPairStr = function(attrName, val) {
    val = this.options.attributeValueProcessor(attrName, "" + val);
    val = this.replaceEntitiesValue(val);
    if (this.options.suppressBooleanAttributes && val === "true") {
      return " " + attrName;
    } else return " " + attrName + '="' + val + '"';
  };
  function processTextOrObjNode(object, key, level, ajPath) {
    const result = this.j2x(object, level + 1, ajPath.concat(key));
    if (object[this.options.textNodeName] !== void 0 && Object.keys(object).length === 1) {
      return this.buildTextValNode(object[this.options.textNodeName], key, result.attrStr, level);
    } else {
      return this.buildObjectNode(result.val, key, result.attrStr, level);
    }
  }
  Builder.prototype.buildObjectNode = function(val, key, attrStr, level) {
    if (val === "") {
      if (key[0] === "?") return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
      else {
        return this.indentate(level) + "<" + key + attrStr + this.closeTag(key) + this.tagEndChar;
      }
    } else {
      let tagEndExp = "</" + key + this.tagEndChar;
      let piClosingChar = "";
      if (key[0] === "?") {
        piClosingChar = "?";
        tagEndExp = "";
      }
      if ((attrStr || attrStr === "") && val.indexOf("<") === -1) {
        return this.indentate(level) + "<" + key + attrStr + piClosingChar + ">" + val + tagEndExp;
      } else if (this.options.commentPropName !== false && key === this.options.commentPropName && piClosingChar.length === 0) {
        return this.indentate(level) + `<!--${val}-->` + this.newLine;
      } else {
        return this.indentate(level) + "<" + key + attrStr + piClosingChar + this.tagEndChar + val + this.indentate(level) + tagEndExp;
      }
    }
  };
  Builder.prototype.closeTag = function(key) {
    let closeTag = "";
    if (this.options.unpairedTags.indexOf(key) !== -1) {
      if (!this.options.suppressUnpairedNode) closeTag = "/";
    } else if (this.options.suppressEmptyNode) {
      closeTag = "/";
    } else {
      closeTag = `></${key}`;
    }
    return closeTag;
  };
  Builder.prototype.buildTextValNode = function(val, key, attrStr, level) {
    if (this.options.cdataPropName !== false && key === this.options.cdataPropName) {
      return this.indentate(level) + `<![CDATA[${val}]]>` + this.newLine;
    } else if (this.options.commentPropName !== false && key === this.options.commentPropName) {
      return this.indentate(level) + `<!--${val}-->` + this.newLine;
    } else if (key[0] === "?") {
      return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
    } else {
      let textValue = this.options.tagValueProcessor(key, val);
      textValue = this.replaceEntitiesValue(textValue);
      if (textValue === "") {
        return this.indentate(level) + "<" + key + attrStr + this.closeTag(key) + this.tagEndChar;
      } else {
        return this.indentate(level) + "<" + key + attrStr + ">" + textValue + "</" + key + this.tagEndChar;
      }
    }
  };
  Builder.prototype.replaceEntitiesValue = function(textValue) {
    if (textValue && textValue.length > 0 && this.options.processEntities) {
      for (let i = 0; i < this.options.entities.length; i++) {
        const entity = this.options.entities[i];
        textValue = textValue.replace(entity.regex, entity.val);
      }
    }
    return textValue;
  };
  function indentate(level) {
    return this.options.indentBy.repeat(level);
  }
  function isAttribute(name) {
    if (name.startsWith(this.options.attributeNamePrefix) && name !== this.options.textNodeName) {
      return name.substr(this.attrPrefixLen);
    } else {
      return false;
    }
  }
  json2xml = Builder;
  return json2xml;
}
var fxp;
var hasRequiredFxp;
function requireFxp() {
  if (hasRequiredFxp) return fxp;
  hasRequiredFxp = 1;
  const validator2 = requireValidator();
  const XMLParser = requireXMLParser();
  const XMLBuilder = requireJson2xml();
  fxp = {
    XMLParser,
    XMLValidator: validator2,
    XMLBuilder
  };
  return fxp;
}
var fxpExports = requireFxp();
class EpgManager {
  constructor(database, mainWindow) {
    __publicField(this, "database");
    __publicField(this, "mainWindow");
    __publicField(this, "refreshTimer", null);
    __publicField(this, "isRefreshing", false);
    this.database = database;
    this.mainWindow = mainWindow;
    this.refreshTimer = setInterval(() => {
    }, 6 * 60 * 60 * 1e3);
  }
  async refresh(epgUrls) {
    if (this.isRefreshing || epgUrls.length === 0) return;
    this.isRefreshing = true;
    try {
      this.database.clearOldData();
      for (const url2 of epgUrls) {
        try {
          console.log(`[EPG] Fetching: ${url2}`);
          const xml = await this.fetchXml(url2);
          console.log(`[EPG] Parsing XML (${(xml.length / 1024 / 1024).toFixed(1)}MB)...`);
          this.parseAndStore(xml);
          console.log("[EPG] Parse complete");
        } catch (error) {
          console.error(`[EPG] Error processing ${url2}:`, error);
        }
      }
      this.mainWindow.webContents.send("epg:updated");
    } finally {
      this.isRefreshing = false;
    }
  }
  fetchXml(url$1) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new url.URL(url$1);
      const requestModule = parsedUrl.protocol === "https:" ? https : http;
      const req = requestModule.get(
        url$1,
        {
          headers: { "User-Agent": "VLC/3.0.20 LibVLC/3.0.20" },
          timeout: 6e4,
          rejectUnauthorized: false
        },
        (res) => {
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            this.fetchXml(res.headers.location).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode && res.statusCode !== 200) {
            reject(new Error(`EPG fetch failed: HTTP ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
          res.on("error", reject);
        }
      );
      req.on("error", reject);
      req.on("timeout", () => {
        req.destroy();
        reject(new Error("EPG fetch timeout"));
      });
    });
  }
  parseAndStore(xml) {
    const parser = new fxpExports.XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name) => name === "programme" || name === "channel"
    });
    let parsed;
    try {
      parsed = parser.parse(xml);
    } catch {
      throw new Error("XMLTV ayrıştırma hatası: Geçersiz XML formatı");
    }
    const tv = parsed.tv;
    if (!tv) {
      throw new Error("XMLTV formatı geçersiz: <tv> elementi bulunamadı");
    }
    const xmlChannels = tv.channel || [];
    const epgChannels = xmlChannels.map((ch) => {
      var _a, _b;
      return {
        id: ch["@_id"],
        displayName: this.extractText(ch["display-name"]),
        iconUrl: Array.isArray(ch.icon) ? ((_a = ch.icon[0]) == null ? void 0 : _a["@_src"]) || "" : ((_b = ch.icon) == null ? void 0 : _b["@_src"]) || ""
      };
    });
    if (epgChannels.length > 0) {
      this.database.insertChannels(epgChannels);
    }
    const xmlProgrammes = tv.programme || [];
    const batchSize = 1e3;
    for (let i = 0; i < xmlProgrammes.length; i += batchSize) {
      const batch = xmlProgrammes.slice(i, i + batchSize);
      const programs = batch.map((prog) => {
        try {
          return {
            channelId: prog["@_channel"],
            title: this.extractText(prog.title),
            description: this.extractText(prog.desc),
            startTime: this.parseXmltvDate(prog["@_start"]),
            endTime: this.parseXmltvDate(prog["@_stop"]),
            category: this.extractText(prog.category)
          };
        } catch {
          return null;
        }
      }).filter((p) => p !== null);
      if (programs.length > 0) {
        this.database.insertPrograms(programs);
      }
    }
  }
  extractText(value) {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
      const first = value[0];
      if (typeof first === "string") return first;
      if (first && typeof first === "object" && "#text" in first) return first["#text"];
      return "";
    }
    if (typeof value === "object" && value !== null && "#text" in value) {
      return value["#text"];
    }
    return String(value);
  }
  parseXmltvDate(dateStr) {
    if (!dateStr) return 0;
    const clean = dateStr.replace(/\s+/g, "");
    const match = clean.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
    if (!match) return 0;
    const [, year, month, day, hour, minute, second, tz] = match;
    let dateString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    if (tz) {
      dateString += `${tz.slice(0, 3)}:${tz.slice(3)}`;
    } else {
      dateString += "+00:00";
    }
    return Math.floor(new Date(dateString).getTime() / 1e3);
  }
  destroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}
let initSqlJs = null;
class EpgDatabase {
  constructor() {
    __publicField(this, "db", null);
    __publicField(this, "dbPath");
    __publicField(this, "initialized", false);
    this.dbPath = path.join(electron.app.getPath("userData"), "epg.db");
    this.init();
  }
  async init() {
    try {
      const sqlJsModule = await import("sql.js");
      initSqlJs = sqlJsModule.default;
      const SQL = await initSqlJs();
      let buffer = null;
      try {
        if (fs.existsSync(this.dbPath)) {
          buffer = fs.readFileSync(this.dbPath);
        }
      } catch {
      }
      this.db = buffer ? new SQL.Database(buffer) : new SQL.Database();
      this.db.run(`
        CREATE TABLE IF NOT EXISTS programs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          channel_id TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT DEFAULT '',
          start_time INTEGER NOT NULL,
          end_time INTEGER NOT NULL,
          category TEXT DEFAULT ''
        );
      `);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_programs_channel_time ON programs(channel_id, start_time);`);
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_programs_time ON programs(start_time, end_time);`);
      this.db.run(`
        CREATE TABLE IF NOT EXISTS channels_epg (
          id TEXT PRIMARY KEY,
          display_name TEXT NOT NULL,
          icon_url TEXT DEFAULT ''
        );
      `);
      this.initialized = true;
      this.save();
    } catch (error) {
      console.error("[EpgDatabase] Init error:", error);
    }
  }
  save() {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    } catch (error) {
      console.error("[EpgDatabase] Save error:", error);
    }
  }
  ensureReady() {
    return this.initialized && this.db !== null;
  }
  insertPrograms(programs) {
    if (!this.ensureReady()) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO programs (channel_id, title, description, start_time, end_time, category)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const p of programs) {
      stmt.run([p.channelId, p.title, p.description, p.startTime, p.endTime, p.category]);
    }
    stmt.free();
    this.save();
  }
  insertChannels(channels) {
    if (!this.ensureReady()) return;
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO channels_epg (id, display_name, icon_url)
      VALUES (?, ?, ?)
    `);
    for (const ch of channels) {
      stmt.run([ch.id, ch.displayName, ch.iconUrl]);
    }
    stmt.free();
    this.save();
  }
  getPrograms(channelId, date) {
    if (!this.ensureReady()) return [];
    const dayStart = new Date(date).getTime() / 1e3;
    const dayEnd = dayStart + 86400;
    const stmt = this.db.prepare(`
      SELECT id, channel_id, title, description, start_time, end_time, category
      FROM programs
      WHERE channel_id = ? AND start_time < ? AND end_time > ?
      ORDER BY start_time ASC
    `);
    stmt.bind([channelId, dayEnd, dayStart]);
    const results = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id,
        channelId: row.channel_id,
        title: row.title,
        description: row.description || "",
        startTime: row.start_time,
        endTime: row.end_time,
        category: row.category || ""
      });
    }
    stmt.free();
    return results;
  }
  getCurrentProgram(channelId) {
    if (!this.ensureReady()) return null;
    const now = Math.floor(Date.now() / 1e3);
    const stmt = this.db.prepare(`
      SELECT id, channel_id, title, description, start_time, end_time, category
      FROM programs
      WHERE channel_id = ? AND start_time <= ? AND end_time > ?
      ORDER BY start_time DESC
      LIMIT 1
    `);
    stmt.bind([channelId, now, now]);
    let result = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      result = {
        id: row.id,
        channelId: row.channel_id,
        title: row.title,
        description: row.description || "",
        startTime: row.start_time,
        endTime: row.end_time,
        category: row.category || ""
      };
    }
    stmt.free();
    return result;
  }
  getNextProgram(channelId) {
    if (!this.ensureReady()) return null;
    const now = Math.floor(Date.now() / 1e3);
    const stmt = this.db.prepare(`
      SELECT id, channel_id, title, description, start_time, end_time, category
      FROM programs
      WHERE channel_id = ? AND start_time > ?
      ORDER BY start_time ASC
      LIMIT 1
    `);
    stmt.bind([channelId, now]);
    let result = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      result = {
        id: row.id,
        channelId: row.channel_id,
        title: row.title,
        description: row.description || "",
        startTime: row.start_time,
        endTime: row.end_time,
        category: row.category || ""
      };
    }
    stmt.free();
    return result;
  }
  getChannels() {
    if (!this.ensureReady()) return [];
    const results = [];
    const stmt = this.db.prepare("SELECT id, display_name, icon_url FROM channels_epg");
    while (stmt.step()) {
      const row = stmt.getAsObject();
      results.push({
        id: row.id,
        displayName: row.display_name,
        iconUrl: row.icon_url || ""
      });
    }
    stmt.free();
    return results;
  }
  hasData() {
    if (!this.ensureReady()) return false;
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM programs");
    stmt.step();
    const row = stmt.getAsObject();
    stmt.free();
    return row.count > 0;
  }
  clearOldData() {
    if (!this.ensureReady()) return;
    const oneDayAgo = Math.floor(Date.now() / 1e3) - 86400;
    this.db.run("DELETE FROM programs WHERE end_time < ?", [oneDayAgo]);
    this.save();
  }
  clearAll() {
    if (!this.ensureReady()) return;
    this.db.run("DELETE FROM programs");
    this.db.run("DELETE FROM channels_epg");
    this.save();
  }
  close() {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
    }
  }
}
class StreamChecker {
  constructor() {
    __publicField(this, "timeout", 5e3);
  }
  async check(url$1) {
    const startTime = Date.now();
    return new Promise((resolve) => {
      let parsedUrl;
      try {
        parsedUrl = new url.URL(url$1);
      } catch {
        resolve({ alive: false, latency: 0, error: "Geçersiz URL" });
        return;
      }
      const requestModule = parsedUrl.protocol === "https:" ? https : http;
      const req = requestModule.request(
        url$1,
        {
          method: "HEAD",
          headers: {
            "User-Agent": "VLC/3.0.20 LibVLC/3.0.20"
          },
          timeout: this.timeout,
          rejectUnauthorized: false
        },
        (res) => {
          const latency = Date.now() - startTime;
          const statusCode = res.statusCode || 0;
          const alive = statusCode >= 200 && statusCode < 400;
          resolve({
            alive,
            latency,
            statusCode,
            contentType: res.headers["content-type"] || void 0
          });
          res.resume();
        }
      );
      req.on("error", (err) => {
        resolve({
          alive: false,
          latency: Date.now() - startTime,
          error: err.message
        });
      });
      req.on("timeout", () => {
        req.destroy();
        resolve({
          alive: false,
          latency: Date.now() - startTime,
          error: "Zaman aşımı"
        });
      });
      req.end();
    });
  }
  async checkMultiple(urls) {
    const results = /* @__PURE__ */ new Map();
    const concurrency = 10;
    for (let i = 0; i < urls.length; i += concurrency) {
      const batch = urls.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (url2) => {
          const result = await this.check(url2);
          return { url: url2, result };
        })
      );
      for (const { url: url2, result } of batchResults) {
        results.set(url2, result);
      }
    }
    return results;
  }
}
function isArray(value) {
  return !Array.isArray ? getTag(value) === "[object Array]" : Array.isArray(value);
}
function baseToString(value) {
  if (typeof value == "string") {
    return value;
  }
  let result = value + "";
  return result == "0" && 1 / value == -Infinity ? "-0" : result;
}
function toString(value) {
  return value == null ? "" : baseToString(value);
}
function isString(value) {
  return typeof value === "string";
}
function isNumber(value) {
  return typeof value === "number";
}
function isBoolean(value) {
  return value === true || value === false || isObjectLike(value) && getTag(value) == "[object Boolean]";
}
function isObject(value) {
  return typeof value === "object";
}
function isObjectLike(value) {
  return isObject(value) && value !== null;
}
function isDefined(value) {
  return value !== void 0 && value !== null;
}
function isBlank(value) {
  return !value.trim().length;
}
function getTag(value) {
  return value == null ? value === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(value);
}
const INCORRECT_INDEX_TYPE = "Incorrect 'index' type";
const LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY = (key) => `Invalid value for key ${key}`;
const PATTERN_LENGTH_TOO_LARGE = (max) => `Pattern length exceeds max of ${max}.`;
const MISSING_KEY_PROPERTY = (name) => `Missing ${name} property in key`;
const INVALID_KEY_WEIGHT_VALUE = (key) => `Property 'weight' in key '${key}' must be a positive integer`;
const hasOwn = Object.prototype.hasOwnProperty;
class KeyStore {
  constructor(keys) {
    this._keys = [];
    this._keyMap = {};
    let totalWeight = 0;
    keys.forEach((key) => {
      let obj = createKey(key);
      this._keys.push(obj);
      this._keyMap[obj.id] = obj;
      totalWeight += obj.weight;
    });
    this._keys.forEach((key) => {
      key.weight /= totalWeight;
    });
  }
  get(keyId) {
    return this._keyMap[keyId];
  }
  keys() {
    return this._keys;
  }
  toJSON() {
    return JSON.stringify(this._keys);
  }
}
function createKey(key) {
  let path2 = null;
  let id = null;
  let src = null;
  let weight = 1;
  let getFn = null;
  if (isString(key) || isArray(key)) {
    src = key;
    path2 = createKeyPath(key);
    id = createKeyId(key);
  } else {
    if (!hasOwn.call(key, "name")) {
      throw new Error(MISSING_KEY_PROPERTY("name"));
    }
    const name = key.name;
    src = name;
    if (hasOwn.call(key, "weight")) {
      weight = key.weight;
      if (weight <= 0) {
        throw new Error(INVALID_KEY_WEIGHT_VALUE(name));
      }
    }
    path2 = createKeyPath(name);
    id = createKeyId(name);
    getFn = key.getFn;
  }
  return { path: path2, id, weight, src, getFn };
}
function createKeyPath(key) {
  return isArray(key) ? key : key.split(".");
}
function createKeyId(key) {
  return isArray(key) ? key.join(".") : key;
}
function get(obj, path2) {
  let list = [];
  let arr = false;
  const deepGet = (obj2, path3, index) => {
    if (!isDefined(obj2)) {
      return;
    }
    if (!path3[index]) {
      list.push(obj2);
    } else {
      let key = path3[index];
      const value = obj2[key];
      if (!isDefined(value)) {
        return;
      }
      if (index === path3.length - 1 && (isString(value) || isNumber(value) || isBoolean(value))) {
        list.push(toString(value));
      } else if (isArray(value)) {
        arr = true;
        for (let i = 0, len = value.length; i < len; i += 1) {
          deepGet(value[i], path3, index + 1);
        }
      } else if (path3.length) {
        deepGet(value, path3, index + 1);
      }
    }
  };
  deepGet(obj, isString(path2) ? path2.split(".") : path2, 0);
  return arr ? list : list[0];
}
const MatchOptions = {
  // Whether the matches should be included in the result set. When `true`, each record in the result
  // set will include the indices of the matched characters.
  // These can consequently be used for highlighting purposes.
  includeMatches: false,
  // When `true`, the matching function will continue to the end of a search pattern even if
  // a perfect match has already been located in the string.
  findAllMatches: false,
  // Minimum number of characters that must be matched before a result is considered a match
  minMatchCharLength: 1
};
const BasicOptions = {
  // When `true`, the algorithm continues searching to the end of the input even if a perfect
  // match is found before the end of the same input.
  isCaseSensitive: false,
  // When `true`, the algorithm will ignore diacritics (accents) in comparisons
  ignoreDiacritics: false,
  // When true, the matching function will continue to the end of a search pattern even if
  includeScore: false,
  // List of properties that will be searched. This also supports nested properties.
  keys: [],
  // Whether to sort the result list, by score
  shouldSort: true,
  // Default sort function: sort by ascending score, ascending index
  sortFn: (a, b) => a.score === b.score ? a.idx < b.idx ? -1 : 1 : a.score < b.score ? -1 : 1
};
const FuzzyOptions = {
  // Approximately where in the text is the pattern expected to be found?
  location: 0,
  // At what point does the match algorithm give up. A threshold of '0.0' requires a perfect match
  // (of both letters and location), a threshold of '1.0' would match anything.
  threshold: 0.6,
  // Determines how close the match must be to the fuzzy location (specified above).
  // An exact letter match which is 'distance' characters away from the fuzzy location
  // would score as a complete mismatch. A distance of '0' requires the match be at
  // the exact location specified, a threshold of '1000' would require a perfect match
  // to be within 800 characters of the fuzzy location to be found using a 0.8 threshold.
  distance: 100
};
const AdvancedOptions = {
  // When `true`, it enables the use of unix-like search commands
  useExtendedSearch: false,
  // The get function to use when fetching an object's properties.
  // The default will search nested paths *ie foo.bar.baz*
  getFn: get,
  // When `true`, search will ignore `location` and `distance`, so it won't matter
  // where in the string the pattern appears.
  // More info: https://fusejs.io/concepts/scoring-theory.html#fuzziness-score
  ignoreLocation: false,
  // When `true`, the calculation for the relevance score (used for sorting) will
  // ignore the field-length norm.
  // More info: https://fusejs.io/concepts/scoring-theory.html#field-length-norm
  ignoreFieldNorm: false,
  // The weight to determine how much field length norm effects scoring.
  fieldNormWeight: 1
};
var Config = {
  ...BasicOptions,
  ...MatchOptions,
  ...FuzzyOptions,
  ...AdvancedOptions
};
const SPACE = /[^ ]+/g;
function norm(weight = 1, mantissa = 3) {
  const cache = /* @__PURE__ */ new Map();
  const m = Math.pow(10, mantissa);
  return {
    get(value) {
      const numTokens = value.match(SPACE).length;
      if (cache.has(numTokens)) {
        return cache.get(numTokens);
      }
      const norm2 = 1 / Math.pow(numTokens, 0.5 * weight);
      const n = parseFloat(Math.round(norm2 * m) / m);
      cache.set(numTokens, n);
      return n;
    },
    clear() {
      cache.clear();
    }
  };
}
class FuseIndex {
  constructor({
    getFn = Config.getFn,
    fieldNormWeight = Config.fieldNormWeight
  } = {}) {
    this.norm = norm(fieldNormWeight, 3);
    this.getFn = getFn;
    this.isCreated = false;
    this.setIndexRecords();
  }
  setSources(docs = []) {
    this.docs = docs;
  }
  setIndexRecords(records = []) {
    this.records = records;
  }
  setKeys(keys = []) {
    this.keys = keys;
    this._keysMap = {};
    keys.forEach((key, idx) => {
      this._keysMap[key.id] = idx;
    });
  }
  create() {
    if (this.isCreated || !this.docs.length) {
      return;
    }
    this.isCreated = true;
    if (isString(this.docs[0])) {
      this.docs.forEach((doc, docIndex) => {
        this._addString(doc, docIndex);
      });
    } else {
      this.docs.forEach((doc, docIndex) => {
        this._addObject(doc, docIndex);
      });
    }
    this.norm.clear();
  }
  // Adds a doc to the end of the index
  add(doc) {
    const idx = this.size();
    if (isString(doc)) {
      this._addString(doc, idx);
    } else {
      this._addObject(doc, idx);
    }
  }
  // Removes the doc at the specified index of the index
  removeAt(idx) {
    this.records.splice(idx, 1);
    for (let i = idx, len = this.size(); i < len; i += 1) {
      this.records[i].i -= 1;
    }
  }
  getValueForItemAtKeyId(item, keyId) {
    return item[this._keysMap[keyId]];
  }
  size() {
    return this.records.length;
  }
  _addString(doc, docIndex) {
    if (!isDefined(doc) || isBlank(doc)) {
      return;
    }
    let record = {
      v: doc,
      i: docIndex,
      n: this.norm.get(doc)
    };
    this.records.push(record);
  }
  _addObject(doc, docIndex) {
    let record = { i: docIndex, $: {} };
    this.keys.forEach((key, keyIndex) => {
      let value = key.getFn ? key.getFn(doc) : this.getFn(doc, key.path);
      if (!isDefined(value)) {
        return;
      }
      if (isArray(value)) {
        let subRecords = [];
        const stack = [{ nestedArrIndex: -1, value }];
        while (stack.length) {
          const { nestedArrIndex, value: value2 } = stack.pop();
          if (!isDefined(value2)) {
            continue;
          }
          if (isString(value2) && !isBlank(value2)) {
            let subRecord = {
              v: value2,
              i: nestedArrIndex,
              n: this.norm.get(value2)
            };
            subRecords.push(subRecord);
          } else if (isArray(value2)) {
            value2.forEach((item, k) => {
              stack.push({
                nestedArrIndex: k,
                value: item
              });
            });
          } else ;
        }
        record.$[keyIndex] = subRecords;
      } else if (isString(value) && !isBlank(value)) {
        let subRecord = {
          v: value,
          n: this.norm.get(value)
        };
        record.$[keyIndex] = subRecord;
      }
    });
    this.records.push(record);
  }
  toJSON() {
    return {
      keys: this.keys,
      records: this.records
    };
  }
}
function createIndex(keys, docs, { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
  const myIndex = new FuseIndex({ getFn, fieldNormWeight });
  myIndex.setKeys(keys.map(createKey));
  myIndex.setSources(docs);
  myIndex.create();
  return myIndex;
}
function parseIndex(data, { getFn = Config.getFn, fieldNormWeight = Config.fieldNormWeight } = {}) {
  const { keys, records } = data;
  const myIndex = new FuseIndex({ getFn, fieldNormWeight });
  myIndex.setKeys(keys);
  myIndex.setIndexRecords(records);
  return myIndex;
}
function computeScore$1(pattern, {
  errors = 0,
  currentLocation = 0,
  expectedLocation = 0,
  distance = Config.distance,
  ignoreLocation = Config.ignoreLocation
} = {}) {
  const accuracy = errors / pattern.length;
  if (ignoreLocation) {
    return accuracy;
  }
  const proximity = Math.abs(expectedLocation - currentLocation);
  if (!distance) {
    return proximity ? 1 : accuracy;
  }
  return accuracy + proximity / distance;
}
function convertMaskToIndices(matchmask = [], minMatchCharLength = Config.minMatchCharLength) {
  let indices = [];
  let start = -1;
  let end = -1;
  let i = 0;
  for (let len = matchmask.length; i < len; i += 1) {
    let match = matchmask[i];
    if (match && start === -1) {
      start = i;
    } else if (!match && start !== -1) {
      end = i - 1;
      if (end - start + 1 >= minMatchCharLength) {
        indices.push([start, end]);
      }
      start = -1;
    }
  }
  if (matchmask[i - 1] && i - start >= minMatchCharLength) {
    indices.push([start, i - 1]);
  }
  return indices;
}
const MAX_BITS = 32;
function search(text, pattern, patternAlphabet, {
  location = Config.location,
  distance = Config.distance,
  threshold = Config.threshold,
  findAllMatches = Config.findAllMatches,
  minMatchCharLength = Config.minMatchCharLength,
  includeMatches = Config.includeMatches,
  ignoreLocation = Config.ignoreLocation
} = {}) {
  if (pattern.length > MAX_BITS) {
    throw new Error(PATTERN_LENGTH_TOO_LARGE(MAX_BITS));
  }
  const patternLen = pattern.length;
  const textLen = text.length;
  const expectedLocation = Math.max(0, Math.min(location, textLen));
  let currentThreshold = threshold;
  let bestLocation = expectedLocation;
  const computeMatches = minMatchCharLength > 1 || includeMatches;
  const matchMask = computeMatches ? Array(textLen) : [];
  let index;
  while ((index = text.indexOf(pattern, bestLocation)) > -1) {
    let score = computeScore$1(pattern, {
      currentLocation: index,
      expectedLocation,
      distance,
      ignoreLocation
    });
    currentThreshold = Math.min(score, currentThreshold);
    bestLocation = index + patternLen;
    if (computeMatches) {
      let i = 0;
      while (i < patternLen) {
        matchMask[index + i] = 1;
        i += 1;
      }
    }
  }
  bestLocation = -1;
  let lastBitArr = [];
  let finalScore = 1;
  let binMax = patternLen + textLen;
  const mask = 1 << patternLen - 1;
  for (let i = 0; i < patternLen; i += 1) {
    let binMin = 0;
    let binMid = binMax;
    while (binMin < binMid) {
      const score2 = computeScore$1(pattern, {
        errors: i,
        currentLocation: expectedLocation + binMid,
        expectedLocation,
        distance,
        ignoreLocation
      });
      if (score2 <= currentThreshold) {
        binMin = binMid;
      } else {
        binMax = binMid;
      }
      binMid = Math.floor((binMax - binMin) / 2 + binMin);
    }
    binMax = binMid;
    let start = Math.max(1, expectedLocation - binMid + 1);
    let finish = findAllMatches ? textLen : Math.min(expectedLocation + binMid, textLen) + patternLen;
    let bitArr = Array(finish + 2);
    bitArr[finish + 1] = (1 << i) - 1;
    for (let j = finish; j >= start; j -= 1) {
      let currentLocation = j - 1;
      let charMatch = patternAlphabet[text.charAt(currentLocation)];
      if (computeMatches) {
        matchMask[currentLocation] = +!!charMatch;
      }
      bitArr[j] = (bitArr[j + 1] << 1 | 1) & charMatch;
      if (i) {
        bitArr[j] |= (lastBitArr[j + 1] | lastBitArr[j]) << 1 | 1 | lastBitArr[j + 1];
      }
      if (bitArr[j] & mask) {
        finalScore = computeScore$1(pattern, {
          errors: i,
          currentLocation,
          expectedLocation,
          distance,
          ignoreLocation
        });
        if (finalScore <= currentThreshold) {
          currentThreshold = finalScore;
          bestLocation = currentLocation;
          if (bestLocation <= expectedLocation) {
            break;
          }
          start = Math.max(1, 2 * expectedLocation - bestLocation);
        }
      }
    }
    const score = computeScore$1(pattern, {
      errors: i + 1,
      currentLocation: expectedLocation,
      expectedLocation,
      distance,
      ignoreLocation
    });
    if (score > currentThreshold) {
      break;
    }
    lastBitArr = bitArr;
  }
  const result = {
    isMatch: bestLocation >= 0,
    // Count exact matches (those with a score of 0) to be "almost" exact
    score: Math.max(1e-3, finalScore)
  };
  if (computeMatches) {
    const indices = convertMaskToIndices(matchMask, minMatchCharLength);
    if (!indices.length) {
      result.isMatch = false;
    } else if (includeMatches) {
      result.indices = indices;
    }
  }
  return result;
}
function createPatternAlphabet(pattern) {
  let mask = {};
  for (let i = 0, len = pattern.length; i < len; i += 1) {
    const char = pattern.charAt(i);
    mask[char] = (mask[char] || 0) | 1 << len - i - 1;
  }
  return mask;
}
const stripDiacritics = String.prototype.normalize ? ((str) => str.normalize("NFD").replace(/[\u0300-\u036F\u0483-\u0489\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08D3-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B62\u0B63\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0C00-\u0C04\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D82\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F\u109A-\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u180B-\u180D\u1885\u1886\u18A9\u1920-\u192B\u1930-\u193B\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F\u1AB0-\u1ABE\u1B00-\u1B04\u1B34-\u1B44\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BE6-\u1BF3\u1C24-\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF2-\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DF9\u1DFB-\u1DFF\u20D0-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\uA66F-\uA672\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA880\uA881\uA8B4-\uA8C5\uA8E0-\uA8F1\uA8FF\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9E5\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F]/g, "")) : ((str) => str);
class BitapSearch {
  constructor(pattern, {
    location = Config.location,
    threshold = Config.threshold,
    distance = Config.distance,
    includeMatches = Config.includeMatches,
    findAllMatches = Config.findAllMatches,
    minMatchCharLength = Config.minMatchCharLength,
    isCaseSensitive = Config.isCaseSensitive,
    ignoreDiacritics = Config.ignoreDiacritics,
    ignoreLocation = Config.ignoreLocation
  } = {}) {
    this.options = {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreDiacritics,
      ignoreLocation
    };
    pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;
    this.chunks = [];
    if (!this.pattern.length) {
      return;
    }
    const addChunk = (pattern2, startIndex) => {
      this.chunks.push({
        pattern: pattern2,
        alphabet: createPatternAlphabet(pattern2),
        startIndex
      });
    };
    const len = this.pattern.length;
    if (len > MAX_BITS) {
      let i = 0;
      const remainder = len % MAX_BITS;
      const end = len - remainder;
      while (i < end) {
        addChunk(this.pattern.substr(i, MAX_BITS), i);
        i += MAX_BITS;
      }
      if (remainder) {
        const startIndex = len - MAX_BITS;
        addChunk(this.pattern.substr(startIndex), startIndex);
      }
    } else {
      addChunk(this.pattern, 0);
    }
  }
  searchIn(text) {
    const { isCaseSensitive, ignoreDiacritics, includeMatches } = this.options;
    text = isCaseSensitive ? text : text.toLowerCase();
    text = ignoreDiacritics ? stripDiacritics(text) : text;
    if (this.pattern === text) {
      let result2 = {
        isMatch: true,
        score: 0
      };
      if (includeMatches) {
        result2.indices = [[0, text.length - 1]];
      }
      return result2;
    }
    const {
      location,
      distance,
      threshold,
      findAllMatches,
      minMatchCharLength,
      ignoreLocation
    } = this.options;
    let allIndices = [];
    let totalScore = 0;
    let hasMatches = false;
    this.chunks.forEach(({ pattern, alphabet, startIndex }) => {
      const { isMatch, score, indices } = search(text, pattern, alphabet, {
        location: location + startIndex,
        distance,
        threshold,
        findAllMatches,
        minMatchCharLength,
        includeMatches,
        ignoreLocation
      });
      if (isMatch) {
        hasMatches = true;
      }
      totalScore += score;
      if (isMatch && indices) {
        allIndices = [...allIndices, ...indices];
      }
    });
    let result = {
      isMatch: hasMatches,
      score: hasMatches ? totalScore / this.chunks.length : 1
    };
    if (hasMatches && includeMatches) {
      result.indices = allIndices;
    }
    return result;
  }
}
class BaseMatch {
  constructor(pattern) {
    this.pattern = pattern;
  }
  static isMultiMatch(pattern) {
    return getMatch(pattern, this.multiRegex);
  }
  static isSingleMatch(pattern) {
    return getMatch(pattern, this.singleRegex);
  }
  search() {
  }
}
function getMatch(pattern, exp) {
  const matches = pattern.match(exp);
  return matches ? matches[1] : null;
}
class ExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "exact";
  }
  static get multiRegex() {
    return /^="(.*)"$/;
  }
  static get singleRegex() {
    return /^=(.*)$/;
  }
  search(text) {
    const isMatch = text === this.pattern;
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, this.pattern.length - 1]
    };
  }
}
class InverseExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "inverse-exact";
  }
  static get multiRegex() {
    return /^!"(.*)"$/;
  }
  static get singleRegex() {
    return /^!(.*)$/;
  }
  search(text) {
    const index = text.indexOf(this.pattern);
    const isMatch = index === -1;
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    };
  }
}
class PrefixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "prefix-exact";
  }
  static get multiRegex() {
    return /^\^"(.*)"$/;
  }
  static get singleRegex() {
    return /^\^(.*)$/;
  }
  search(text) {
    const isMatch = text.startsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, this.pattern.length - 1]
    };
  }
}
class InversePrefixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "inverse-prefix-exact";
  }
  static get multiRegex() {
    return /^!\^"(.*)"$/;
  }
  static get singleRegex() {
    return /^!\^(.*)$/;
  }
  search(text) {
    const isMatch = !text.startsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    };
  }
}
class SuffixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "suffix-exact";
  }
  static get multiRegex() {
    return /^"(.*)"\$$/;
  }
  static get singleRegex() {
    return /^(.*)\$$/;
  }
  search(text) {
    const isMatch = text.endsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [text.length - this.pattern.length, text.length - 1]
    };
  }
}
class InverseSuffixExactMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "inverse-suffix-exact";
  }
  static get multiRegex() {
    return /^!"(.*)"\$$/;
  }
  static get singleRegex() {
    return /^!(.*)\$$/;
  }
  search(text) {
    const isMatch = !text.endsWith(this.pattern);
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices: [0, text.length - 1]
    };
  }
}
class FuzzyMatch extends BaseMatch {
  constructor(pattern, {
    location = Config.location,
    threshold = Config.threshold,
    distance = Config.distance,
    includeMatches = Config.includeMatches,
    findAllMatches = Config.findAllMatches,
    minMatchCharLength = Config.minMatchCharLength,
    isCaseSensitive = Config.isCaseSensitive,
    ignoreDiacritics = Config.ignoreDiacritics,
    ignoreLocation = Config.ignoreLocation
  } = {}) {
    super(pattern);
    this._bitapSearch = new BitapSearch(pattern, {
      location,
      threshold,
      distance,
      includeMatches,
      findAllMatches,
      minMatchCharLength,
      isCaseSensitive,
      ignoreDiacritics,
      ignoreLocation
    });
  }
  static get type() {
    return "fuzzy";
  }
  static get multiRegex() {
    return /^"(.*)"$/;
  }
  static get singleRegex() {
    return /^(.*)$/;
  }
  search(text) {
    return this._bitapSearch.searchIn(text);
  }
}
class IncludeMatch extends BaseMatch {
  constructor(pattern) {
    super(pattern);
  }
  static get type() {
    return "include";
  }
  static get multiRegex() {
    return /^'"(.*)"$/;
  }
  static get singleRegex() {
    return /^'(.*)$/;
  }
  search(text) {
    let location = 0;
    let index;
    const indices = [];
    const patternLen = this.pattern.length;
    while ((index = text.indexOf(this.pattern, location)) > -1) {
      location = index + patternLen;
      indices.push([index, location - 1]);
    }
    const isMatch = !!indices.length;
    return {
      isMatch,
      score: isMatch ? 0 : 1,
      indices
    };
  }
}
const searchers = [
  ExactMatch,
  IncludeMatch,
  PrefixExactMatch,
  InversePrefixExactMatch,
  InverseSuffixExactMatch,
  SuffixExactMatch,
  InverseExactMatch,
  FuzzyMatch
];
const searchersLen = searchers.length;
const SPACE_RE = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/;
const OR_TOKEN = "|";
function parseQuery(pattern, options = {}) {
  return pattern.split(OR_TOKEN).map((item) => {
    let query = item.trim().split(SPACE_RE).filter((item2) => item2 && !!item2.trim());
    let results = [];
    for (let i = 0, len = query.length; i < len; i += 1) {
      const queryItem = query[i];
      let found = false;
      let idx = -1;
      while (!found && ++idx < searchersLen) {
        const searcher = searchers[idx];
        let token = searcher.isMultiMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          found = true;
        }
      }
      if (found) {
        continue;
      }
      idx = -1;
      while (++idx < searchersLen) {
        const searcher = searchers[idx];
        let token = searcher.isSingleMatch(queryItem);
        if (token) {
          results.push(new searcher(token, options));
          break;
        }
      }
    }
    return results;
  });
}
const MultiMatchSet = /* @__PURE__ */ new Set([FuzzyMatch.type, IncludeMatch.type]);
class ExtendedSearch {
  constructor(pattern, {
    isCaseSensitive = Config.isCaseSensitive,
    ignoreDiacritics = Config.ignoreDiacritics,
    includeMatches = Config.includeMatches,
    minMatchCharLength = Config.minMatchCharLength,
    ignoreLocation = Config.ignoreLocation,
    findAllMatches = Config.findAllMatches,
    location = Config.location,
    threshold = Config.threshold,
    distance = Config.distance
  } = {}) {
    this.query = null;
    this.options = {
      isCaseSensitive,
      ignoreDiacritics,
      includeMatches,
      minMatchCharLength,
      findAllMatches,
      ignoreLocation,
      location,
      threshold,
      distance
    };
    pattern = isCaseSensitive ? pattern : pattern.toLowerCase();
    pattern = ignoreDiacritics ? stripDiacritics(pattern) : pattern;
    this.pattern = pattern;
    this.query = parseQuery(this.pattern, this.options);
  }
  static condition(_, options) {
    return options.useExtendedSearch;
  }
  searchIn(text) {
    const query = this.query;
    if (!query) {
      return {
        isMatch: false,
        score: 1
      };
    }
    const { includeMatches, isCaseSensitive, ignoreDiacritics } = this.options;
    text = isCaseSensitive ? text : text.toLowerCase();
    text = ignoreDiacritics ? stripDiacritics(text) : text;
    let numMatches = 0;
    let allIndices = [];
    let totalScore = 0;
    for (let i = 0, qLen = query.length; i < qLen; i += 1) {
      const searchers2 = query[i];
      allIndices.length = 0;
      numMatches = 0;
      for (let j = 0, pLen = searchers2.length; j < pLen; j += 1) {
        const searcher = searchers2[j];
        const { isMatch, indices, score } = searcher.search(text);
        if (isMatch) {
          numMatches += 1;
          totalScore += score;
          if (includeMatches) {
            const type = searcher.constructor.type;
            if (MultiMatchSet.has(type)) {
              allIndices = [...allIndices, ...indices];
            } else {
              allIndices.push(indices);
            }
          }
        } else {
          totalScore = 0;
          numMatches = 0;
          allIndices.length = 0;
          break;
        }
      }
      if (numMatches) {
        let result = {
          isMatch: true,
          score: totalScore / numMatches
        };
        if (includeMatches) {
          result.indices = allIndices;
        }
        return result;
      }
    }
    return {
      isMatch: false,
      score: 1
    };
  }
}
const registeredSearchers = [];
function register(...args) {
  registeredSearchers.push(...args);
}
function createSearcher(pattern, options) {
  for (let i = 0, len = registeredSearchers.length; i < len; i += 1) {
    let searcherClass = registeredSearchers[i];
    if (searcherClass.condition(pattern, options)) {
      return new searcherClass(pattern, options);
    }
  }
  return new BitapSearch(pattern, options);
}
const LogicalOperator = {
  AND: "$and",
  OR: "$or"
};
const KeyType = {
  PATH: "$path",
  PATTERN: "$val"
};
const isExpression = (query) => !!(query[LogicalOperator.AND] || query[LogicalOperator.OR]);
const isPath = (query) => !!query[KeyType.PATH];
const isLeaf = (query) => !isArray(query) && isObject(query) && !isExpression(query);
const convertToExplicit = (query) => ({
  [LogicalOperator.AND]: Object.keys(query).map((key) => ({
    [key]: query[key]
  }))
});
function parse(query, options, { auto = true } = {}) {
  const next = (query2) => {
    let keys = Object.keys(query2);
    const isQueryPath = isPath(query2);
    if (!isQueryPath && keys.length > 1 && !isExpression(query2)) {
      return next(convertToExplicit(query2));
    }
    if (isLeaf(query2)) {
      const key = isQueryPath ? query2[KeyType.PATH] : keys[0];
      const pattern = isQueryPath ? query2[KeyType.PATTERN] : query2[key];
      if (!isString(pattern)) {
        throw new Error(LOGICAL_SEARCH_INVALID_QUERY_FOR_KEY(key));
      }
      const obj = {
        keyId: createKeyId(key),
        pattern
      };
      if (auto) {
        obj.searcher = createSearcher(pattern, options);
      }
      return obj;
    }
    let node = {
      children: [],
      operator: keys[0]
    };
    keys.forEach((key) => {
      const value = query2[key];
      if (isArray(value)) {
        value.forEach((item) => {
          node.children.push(next(item));
        });
      }
    });
    return node;
  };
  if (!isExpression(query)) {
    query = convertToExplicit(query);
  }
  return next(query);
}
function computeScore(results, { ignoreFieldNorm = Config.ignoreFieldNorm }) {
  results.forEach((result) => {
    let totalScore = 1;
    result.matches.forEach(({ key, norm: norm2, score }) => {
      const weight = key ? key.weight : null;
      totalScore *= Math.pow(
        score === 0 && weight ? Number.EPSILON : score,
        (weight || 1) * (ignoreFieldNorm ? 1 : norm2)
      );
    });
    result.score = totalScore;
  });
}
function transformMatches(result, data) {
  const matches = result.matches;
  data.matches = [];
  if (!isDefined(matches)) {
    return;
  }
  matches.forEach((match) => {
    if (!isDefined(match.indices) || !match.indices.length) {
      return;
    }
    const { indices, value } = match;
    let obj = {
      indices,
      value
    };
    if (match.key) {
      obj.key = match.key.src;
    }
    if (match.idx > -1) {
      obj.refIndex = match.idx;
    }
    data.matches.push(obj);
  });
}
function transformScore(result, data) {
  data.score = result.score;
}
function format(results, docs, {
  includeMatches = Config.includeMatches,
  includeScore = Config.includeScore
} = {}) {
  const transformers = [];
  if (includeMatches) transformers.push(transformMatches);
  if (includeScore) transformers.push(transformScore);
  return results.map((result) => {
    const { idx } = result;
    const data = {
      item: docs[idx],
      refIndex: idx
    };
    if (transformers.length) {
      transformers.forEach((transformer) => {
        transformer(result, data);
      });
    }
    return data;
  });
}
class Fuse {
  constructor(docs, options = {}, index) {
    this.options = { ...Config, ...options };
    if (this.options.useExtendedSearch && false) ;
    this._keyStore = new KeyStore(this.options.keys);
    this.setCollection(docs, index);
  }
  setCollection(docs, index) {
    this._docs = docs;
    if (index && !(index instanceof FuseIndex)) {
      throw new Error(INCORRECT_INDEX_TYPE);
    }
    this._myIndex = index || createIndex(this.options.keys, this._docs, {
      getFn: this.options.getFn,
      fieldNormWeight: this.options.fieldNormWeight
    });
  }
  add(doc) {
    if (!isDefined(doc)) {
      return;
    }
    this._docs.push(doc);
    this._myIndex.add(doc);
  }
  remove(predicate = () => false) {
    const results = [];
    for (let i = 0, len = this._docs.length; i < len; i += 1) {
      const doc = this._docs[i];
      if (predicate(doc, i)) {
        this.removeAt(i);
        i -= 1;
        len -= 1;
        results.push(doc);
      }
    }
    return results;
  }
  removeAt(idx) {
    this._docs.splice(idx, 1);
    this._myIndex.removeAt(idx);
  }
  getIndex() {
    return this._myIndex;
  }
  search(query, { limit = -1 } = {}) {
    const {
      includeMatches,
      includeScore,
      shouldSort,
      sortFn,
      ignoreFieldNorm
    } = this.options;
    let results = isString(query) ? isString(this._docs[0]) ? this._searchStringList(query) : this._searchObjectList(query) : this._searchLogical(query);
    computeScore(results, { ignoreFieldNorm });
    if (shouldSort) {
      results.sort(sortFn);
    }
    if (isNumber(limit) && limit > -1) {
      results = results.slice(0, limit);
    }
    return format(results, this._docs, {
      includeMatches,
      includeScore
    });
  }
  _searchStringList(query) {
    const searcher = createSearcher(query, this.options);
    const { records } = this._myIndex;
    const results = [];
    records.forEach(({ v: text, i: idx, n: norm2 }) => {
      if (!isDefined(text)) {
        return;
      }
      const { isMatch, score, indices } = searcher.searchIn(text);
      if (isMatch) {
        results.push({
          item: text,
          idx,
          matches: [{ score, value: text, norm: norm2, indices }]
        });
      }
    });
    return results;
  }
  _searchLogical(query) {
    const expression = parse(query, this.options);
    const evaluate = (node, item, idx) => {
      if (!node.children) {
        const { keyId, searcher } = node;
        const matches = this._findMatches({
          key: this._keyStore.get(keyId),
          value: this._myIndex.getValueForItemAtKeyId(item, keyId),
          searcher
        });
        if (matches && matches.length) {
          return [
            {
              idx,
              item,
              matches
            }
          ];
        }
        return [];
      }
      const res = [];
      for (let i = 0, len = node.children.length; i < len; i += 1) {
        const child = node.children[i];
        const result = evaluate(child, item, idx);
        if (result.length) {
          res.push(...result);
        } else if (node.operator === LogicalOperator.AND) {
          return [];
        }
      }
      return res;
    };
    const records = this._myIndex.records;
    const resultMap = {};
    const results = [];
    records.forEach(({ $: item, i: idx }) => {
      if (isDefined(item)) {
        let expResults = evaluate(expression, item, idx);
        if (expResults.length) {
          if (!resultMap[idx]) {
            resultMap[idx] = { idx, item, matches: [] };
            results.push(resultMap[idx]);
          }
          expResults.forEach(({ matches }) => {
            resultMap[idx].matches.push(...matches);
          });
        }
      }
    });
    return results;
  }
  _searchObjectList(query) {
    const searcher = createSearcher(query, this.options);
    const { keys, records } = this._myIndex;
    const results = [];
    records.forEach(({ $: item, i: idx }) => {
      if (!isDefined(item)) {
        return;
      }
      let matches = [];
      keys.forEach((key, keyIndex) => {
        matches.push(
          ...this._findMatches({
            key,
            value: item[keyIndex],
            searcher
          })
        );
      });
      if (matches.length) {
        results.push({
          idx,
          item,
          matches
        });
      }
    });
    return results;
  }
  _findMatches({ key, value, searcher }) {
    if (!isDefined(value)) {
      return [];
    }
    let matches = [];
    if (isArray(value)) {
      value.forEach(({ v: text, i: idx, n: norm2 }) => {
        if (!isDefined(text)) {
          return;
        }
        const { isMatch, score, indices } = searcher.searchIn(text);
        if (isMatch) {
          matches.push({
            score,
            key,
            value: text,
            idx,
            norm: norm2,
            indices
          });
        }
      });
    } else {
      const { v: text, n: norm2 } = value;
      const { isMatch, score, indices } = searcher.searchIn(text);
      if (isMatch) {
        matches.push({ score, key, value: text, norm: norm2, indices });
      }
    }
    return matches;
  }
}
Fuse.version = "7.1.0";
Fuse.createIndex = createIndex;
Fuse.parseIndex = parseIndex;
Fuse.config = Config;
{
  Fuse.parseQuery = parse;
}
{
  register(ExtendedSearch);
}
class ChannelMatcher {
  constructor() {
    __publicField(this, "matchCache", /* @__PURE__ */ new Map());
  }
  match(channels, epgChannels) {
    if (epgChannels.length === 0) return [];
    const matches = [];
    const fuse = new Fuse(epgChannels, {
      keys: ["displayName", "id"],
      threshold: 0.3,
      includeScore: true
    });
    for (const channel of channels) {
      const cached = this.matchCache.get(channel.id);
      if (cached) {
        matches.push({
          channelId: channel.id,
          epgChannelId: cached,
          score: 1,
          auto: true
        });
        continue;
      }
      const exactMatch = epgChannels.find(
        (epg) => epg.id.toLowerCase() === channel.name.toLowerCase() || epg.displayName.toLowerCase() === channel.name.toLowerCase()
      );
      if (exactMatch) {
        matches.push({
          channelId: channel.id,
          epgChannelId: exactMatch.id,
          score: 1,
          auto: true
        });
        this.matchCache.set(channel.id, exactMatch.id);
        continue;
      }
      const results = fuse.search(channel.name);
      if (results.length > 0 && results[0].score !== void 0 && results[0].score < 0.3) {
        matches.push({
          channelId: channel.id,
          epgChannelId: results[0].item.id,
          score: 1 - results[0].score,
          auto: true
        });
        this.matchCache.set(channel.id, results[0].item.id);
      }
    }
    return matches;
  }
  setManualMatch(channelId, epgChannelId) {
    this.matchCache.set(channelId, epgChannelId);
  }
  removeMatch(channelId) {
    this.matchCache.delete(channelId);
  }
  clearCache() {
    this.matchCache.clear();
  }
}
const defaults = {
  volume: 80,
  muted: false,
  m3uSources: [],
  epgUrls: [],
  favorites: [],
  history: [],
  playerSettings: {
    hwdec: "d3d11va",
    cacheSecs: 8,
    bufferSize: "32MiB"
  },
  lastChannel: null
};
class JsonStore {
  constructor() {
    __publicField(this, "filePath");
    __publicField(this, "data");
    const userDataDir = electron.app.getPath("userData");
    this.filePath = path.join(userDataDir, "settings.json");
    this.data = this.load();
  }
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        return { ...defaults, ...JSON.parse(raw) };
      }
    } catch {
    }
    return { ...defaults };
  }
  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (err) {
      console.error("[Settings] Save error:", err);
    }
  }
  get(key) {
    return this.data[key] ?? defaults[key];
  }
  set(key, value) {
    this.data[key] = value;
    this.save();
  }
  get store() {
    return { ...this.data };
  }
}
let _store = null;
function getStore() {
  if (!_store) _store = new JsonStore();
  return _store;
}
let mpvManager = null;
let m3uParser = null;
let epgManager = null;
let epgDatabase = null;
let streamChecker = null;
let channelMatcher = null;
let loadedChannels = [];
function registerIpcHandlers(mainWindow) {
  const store = getStore();
  mpvManager = new MpvManager(mainWindow);
  m3uParser = new M3uParser();
  epgDatabase = new EpgDatabase();
  epgManager = new EpgManager(epgDatabase, mainWindow);
  streamChecker = new StreamChecker();
  channelMatcher = new ChannelMatcher();
  electron.ipcMain.handle("player:play", async (_event, url2, streamType) => {
    try {
      if (streamType === "hls" || streamType === "mpv") {
        await mpvManager.play(url2);
      }
      mainWindow.webContents.send("player:state-changed", { playing: true, url: url2, streamType });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bilinmeyen oynatma hatası";
      mainWindow.webContents.send("player:error", message);
      throw error;
    }
  });
  electron.ipcMain.handle("player:stop", async () => {
    try {
      await mpvManager.stop();
      mainWindow.webContents.send("player:state-changed", { playing: false, url: null, streamType: null });
    } catch {
    }
  });
  electron.ipcMain.handle("player:set-volume", async (_event, volume) => {
    try {
      await mpvManager.setVolume(volume);
      store.set("volume", volume);
    } catch {
    }
  });
  electron.ipcMain.handle("player:toggle-mute", async () => {
    try {
      const currentMuted = store.get("muted");
      const newMuted = !currentMuted;
      await mpvManager.setMute(newMuted);
      store.set("muted", newMuted);
      return newMuted;
    } catch {
      return false;
    }
  });
  electron.ipcMain.handle("channels:load-source", async (_event, source) => {
    try {
      const channels = await m3uParser.parse(source, (progress) => {
        mainWindow.webContents.send("channels:load-progress", progress);
      });
      loadedChannels = channels;
      const chunkSize = 500;
      for (let i = 0; i < loadedChannels.length; i += chunkSize) {
        const chunk = loadedChannels.slice(i, i + chunkSize);
        mainWindow.webContents.send("channels:loaded", {
          channels: chunk,
          offset: i,
          total: loadedChannels.length,
          done: i + chunkSize >= loadedChannels.length
        });
      }
      const sources = store.get("m3uSources");
      if (!sources.includes(source)) {
        store.set("m3uSources", [...sources, source]);
      }
      if (epgDatabase.hasData()) {
        const matches = channelMatcher.match(loadedChannels, epgDatabase.getChannels());
        mainWindow.webContents.send("epg:matches-updated", matches);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "M3U yüklenirken hata oluştu";
      throw new Error(message);
    }
  });
  electron.ipcMain.handle("channels:get-all", () => loadedChannels);
  electron.ipcMain.handle("epg:get-programs", (_event, channelId, date) => {
    return epgDatabase.getPrograms(channelId, date);
  });
  electron.ipcMain.handle("epg:get-current-program", (_event, channelId) => {
    return epgDatabase.getCurrentProgram(channelId);
  });
  electron.ipcMain.handle("epg:force-refresh", async () => {
    const epgUrls = store.get("epgUrls");
    if (epgUrls.length > 0) {
      await epgManager.refresh(epgUrls);
      mainWindow.webContents.send("epg:updated");
    }
  });
  electron.ipcMain.handle("settings:get", () => store.store);
  electron.ipcMain.handle("settings:set", (_event, key, value) => {
    store.set(key, value);
    if (key === "epgUrls") {
      epgManager.refresh(value).then(() => {
        mainWindow.webContents.send("epg:updated");
      });
    }
  });
  electron.ipcMain.handle("favorites:get-all", () => store.get("favorites"));
  electron.ipcMain.handle("favorites:toggle", (_event, channelId) => {
    const favorites = store.get("favorites");
    const index = favorites.indexOf(channelId);
    if (index >= 0) {
      favorites.splice(index, 1);
      store.set("favorites", favorites);
      return false;
    } else {
      favorites.push(channelId);
      store.set("favorites", favorites);
      return true;
    }
  });
  electron.ipcMain.handle("history:get-all", () => store.get("history"));
  electron.ipcMain.handle("history:add", (_event, channelId) => {
    const history = store.get("history");
    const filtered = history.filter((h) => h.channelId !== channelId);
    filtered.unshift({ channelId, timestamp: Date.now() });
    store.set("history", filtered.slice(0, 50));
  });
  electron.ipcMain.handle("stream:check", async (_event, url2) => {
    return streamChecker.check(url2);
  });
  mainWindow.on("closed", () => {
    mpvManager == null ? void 0 : mpvManager.destroy();
    epgDatabase == null ? void 0 : epgDatabase.close();
  });
}
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
exports.mainWindow = null;
let tray = null;
const WINDOW_STATE_DEFAULTS = {
  width: 1400,
  height: 900,
  minWidth: 960,
  minHeight: 640
};
function createWindow() {
  exports.mainWindow = new electron.BrowserWindow({
    ...WINDOW_STATE_DEFAULTS,
    backgroundColor: "#0a0d1a",
    title: "Coriolis IPTV",
    icon: path.join(__dirname, "../public/icon.ico"),
    frame: false,
    titleBarStyle: "hidden",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // need false for preload script with IPC
      webSecurity: false
      // CORS bypass for IPTV streams
    },
    autoHideMenuBar: true
  });
  electron.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const url2 = details.url;
    if (!url2.startsWith("http://localhost") && !url2.startsWith("https://localhost") && !url2.startsWith("http://127.0.0.1") && !url2.includes("vite")) {
      details.requestHeaders["User-Agent"] = "VLC/3.0.20 LibVLC/3.0.20";
      details.requestHeaders["Connection"] = "keep-alive";
      details.requestHeaders["Accept"] = "*/*";
    }
    callback({ requestHeaders: details.requestHeaders });
  });
  exports.mainWindow.webContents.setWindowOpenHandler(({ url: url2 }) => {
    electron.shell.openExternal(url2);
    return { action: "deny" };
  });
  const isDev = !electron.app.isPackaged;
  if (isDev) {
    const loadDevUrl = () => {
      var _a;
      (_a = exports.mainWindow) == null ? void 0 : _a.loadURL("http://localhost:5173").catch(() => {
        setTimeout(loadDevUrl, 1e3);
      });
    };
    loadDevUrl();
  } else {
    exports.mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  exports.mainWindow.once("ready-to-show", () => {
    var _a;
    (_a = exports.mainWindow) == null ? void 0 : _a.show();
  });
  electron.ipcMain.on("window:minimize", () => {
    var _a;
    return (_a = exports.mainWindow) == null ? void 0 : _a.minimize();
  });
  electron.ipcMain.on("window:maximize", () => {
    var _a, _b;
    if ((_a = exports.mainWindow) == null ? void 0 : _a.isMaximized()) {
      exports.mainWindow.unmaximize();
    } else {
      (_b = exports.mainWindow) == null ? void 0 : _b.maximize();
    }
  });
  electron.ipcMain.on("window:close", () => {
    var _a;
    return (_a = exports.mainWindow) == null ? void 0 : _a.close();
  });
  electron.ipcMain.handle("window:is-maximized", () => {
    var _a;
    return ((_a = exports.mainWindow) == null ? void 0 : _a.isMaximized()) ?? false;
  });
  exports.mainWindow.on("maximize", () => {
    var _a;
    (_a = exports.mainWindow) == null ? void 0 : _a.webContents.send("window:maximized-changed", true);
  });
  exports.mainWindow.on("unmaximize", () => {
    var _a;
    (_a = exports.mainWindow) == null ? void 0 : _a.webContents.send("window:maximized-changed", false);
  });
  exports.mainWindow.on("closed", () => {
    exports.mainWindow = null;
  });
  registerIpcHandlers(exports.mainWindow);
}
function createTray() {
  const iconPath = path.join(__dirname, "../public/icon.ico");
  try {
    const icon = electron.nativeImage.createFromPath(iconPath);
    tray = new electron.Tray(icon.isEmpty() ? electron.nativeImage.createEmpty() : icon);
  } catch {
    tray = new electron.Tray(electron.nativeImage.createEmpty());
  }
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "Göster",
      click: () => {
        var _a;
        return (_a = exports.mainWindow) == null ? void 0 : _a.show();
      }
    },
    {
      label: "Çıkış",
      click: () => {
        electron.app.quit();
      }
    }
  ]);
  tray.setToolTip("Coriolis IPTV");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    var _a;
    return (_a = exports.mainWindow) == null ? void 0 : _a.show();
  });
}
electron.app.whenReady().then(() => {
  createWindow();
  createTray();
});
electron.app.on("window-all-closed", () => {
  electron.app.quit();
});
electron.app.on("activate", () => {
  if (exports.mainWindow === null) createWindow();
});
electron.app.on("before-quit", () => {
  tray == null ? void 0 : tray.destroy();
});
