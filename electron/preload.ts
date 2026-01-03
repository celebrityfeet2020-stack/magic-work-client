/**
 * 魔作智控 2.0 - Preload脚本
 * 
 * 在渲染进程中暴露安全的API
 */

import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },

  // 浏览器实例管理
  instance: {
    create: (instanceId: string, config: any) => 
      ipcRenderer.invoke('instance:create', instanceId, config),
    close: (instanceId: string) => 
      ipcRenderer.invoke('instance:close', instanceId),
    list: () => ipcRenderer.invoke('instance:list'),
    onClosed: (callback: (instanceId: string) => void) => {
      ipcRenderer.on('instance-closed', (_, instanceId) => callback(instanceId));
    },
  },

  // 音频捕获
  audio: {
    getSources: () => ipcRenderer.invoke('audio:getSources'),
  },

  // API
  api: {
    getBaseUrl: () => ipcRenderer.invoke('api:getBaseUrl'),
  },
});

// 类型声明
declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => Promise<void>;
        maximize: () => Promise<void>;
        close: () => Promise<void>;
      };
      instance: {
        create: (instanceId: string, config: any) => Promise<any>;
        close: (instanceId: string) => Promise<boolean>;
        list: () => Promise<string[]>;
        onClosed: (callback: (instanceId: string) => void) => void;
      };
      audio: {
        getSources: () => Promise<Array<{ id: string; name: string }>>;
      };
      api: {
        getBaseUrl: () => Promise<string>;
      };
    };
  }
}
