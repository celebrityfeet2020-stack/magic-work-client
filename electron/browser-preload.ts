/**
 * 浏览器实例窗口的preload脚本
 * 用于地址栏和标签页的IPC通信
 */

import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('browserAPI', {
  // 导航
  navigate: (url: string) => ipcRenderer.send('navigate', url),
  goBack: () => ipcRenderer.send('nav-back'),
  goForward: () => ipcRenderer.send('nav-forward'),
  refresh: () => ipcRenderer.send('nav-refresh'),
  
  // 标签页
  switchTab: (index: number) => ipcRenderer.send('switch-tab', index),
  newTab: () => ipcRenderer.send('new-tab'),
  
  // 事件监听
  onUrlChanged: (callback: (url: string, tabIndex: number) => void) => {
    ipcRenderer.on('url-changed', (_, url, tabIndex) => callback(url, tabIndex));
  },
  onInitTabs: (callback: (tabs: Array<{url: string, title: string}>) => void) => {
    ipcRenderer.on('init-tabs', (_, tabs) => callback(tabs));
  },
  onTabCreated: (callback: (tab: {url: string, title: string}, index: number) => void) => {
    ipcRenderer.on('tab-created', (_, tab, index) => callback(tab, index));
  },
  onTabTitleUpdated: (callback: (title: string, index: number) => void) => {
    ipcRenderer.on('tab-title-updated', (_, title, index) => callback(title, index));
  },
});
