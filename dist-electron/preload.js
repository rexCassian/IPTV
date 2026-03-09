"use strict";
const electron = require("electron");
function createEventUnsubscriber(channel, handler) {
  return () => {
    electron.ipcRenderer.removeListener(channel, handler);
  };
}
const electronAPI = {
  window: {
    minimize: () => electron.ipcRenderer.send("window:minimize"),
    maximize: () => electron.ipcRenderer.send("window:maximize"),
    close: () => electron.ipcRenderer.send("window:close"),
    isMaximized: () => electron.ipcRenderer.invoke("window:is-maximized"),
    onMaximizedChanged: (callback) => {
      const handler = (_event, maximized) => callback(maximized);
      electron.ipcRenderer.on("window:maximized-changed", handler);
      return createEventUnsubscriber("window:maximized-changed", handler);
    },
    toggleFullscreen: () => electron.ipcRenderer.send("window:toggle-fullscreen"),
    setFullscreen: (fullscreen) => electron.ipcRenderer.send("window:set-fullscreen", fullscreen),
    isFullscreen: () => electron.ipcRenderer.invoke("window:is-fullscreen"),
    onFullscreenChanged: (callback) => {
      const handler = (_event, fullscreen) => callback(fullscreen);
      electron.ipcRenderer.on("window:fullscreen-changed", handler);
      return createEventUnsubscriber("window:fullscreen-changed", handler);
    }
  },
  player: {
    play: (url, streamType) => electron.ipcRenderer.invoke("player:play", url, streamType),
    stop: () => electron.ipcRenderer.invoke("player:stop"),
    setVolume: (volume) => electron.ipcRenderer.invoke("player:set-volume", volume),
    toggleMute: () => electron.ipcRenderer.invoke("player:toggle-mute"),
    onStateChanged: (callback) => {
      const handler = (_event, state) => callback(state);
      electron.ipcRenderer.on("player:state-changed", handler);
      return createEventUnsubscriber("player:state-changed", handler);
    },
    onError: (callback) => {
      const handler = (_event, error) => callback(error);
      electron.ipcRenderer.on("player:error", handler);
      return createEventUnsubscriber("player:error", handler);
    },
    onBuffering: (callback) => {
      const handler = (_event, percent) => callback(percent);
      electron.ipcRenderer.on("player:buffering", handler);
      return createEventUnsubscriber("player:buffering", handler);
    }
  },
  channels: {
    loadSource: (source) => electron.ipcRenderer.invoke("channels:load-source", source),
    getAll: () => electron.ipcRenderer.invoke("channels:get-all"),
    onLoaded: (callback) => {
      const handler = (_event, channels) => callback(channels);
      electron.ipcRenderer.on("channels:loaded", handler);
      return createEventUnsubscriber("channels:loaded", handler);
    },
    onLoadProgress: (callback) => {
      const handler = (_event, data) => callback(data);
      electron.ipcRenderer.on("channels:load-progress", handler);
      return createEventUnsubscriber("channels:load-progress", handler);
    }
  },
  epg: {
    getPrograms: (channelId, date) => electron.ipcRenderer.invoke("epg:get-programs", channelId, date),
    getCurrentProgram: (channelId) => electron.ipcRenderer.invoke("epg:get-current-program", channelId),
    forceRefresh: () => electron.ipcRenderer.invoke("epg:force-refresh"),
    onUpdated: (callback) => {
      const handler = () => callback();
      electron.ipcRenderer.on("epg:updated", handler);
      return createEventUnsubscriber("epg:updated", handler);
    },
    getMeta: () => electron.ipcRenderer.invoke("epg:get-meta"),
    clearDatabase: () => electron.ipcRenderer.invoke("epg:clear-database")
  },
  settings: {
    get: () => electron.ipcRenderer.invoke("settings:get"),
    set: (key, value) => electron.ipcRenderer.invoke("settings:set", key, value),
    exportData: () => electron.ipcRenderer.invoke("settings:export"),
    importData: () => electron.ipcRenderer.invoke("settings:import")
  },
  favorites: {
    getAll: () => electron.ipcRenderer.invoke("favorites:get-all"),
    toggle: (channelId) => electron.ipcRenderer.invoke("favorites:toggle", channelId)
  },
  history: {
    getAll: () => electron.ipcRenderer.invoke("history:get-all"),
    add: (channelId) => electron.ipcRenderer.invoke("history:add", channelId)
  },
  stream: {
    check: (url) => electron.ipcRenderer.invoke("stream:check", url)
  },
  proxy: {
    getPort: () => electron.ipcRenderer.invoke("proxy:get-port")
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
