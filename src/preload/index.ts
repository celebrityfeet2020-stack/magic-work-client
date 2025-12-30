import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 定义API类型
interface BrowserConfig {
  userDataDir?: string
  proxy?: string
  executablePath?: string
}

interface RPAParams {
  action: string
  params: Record<string, any>
}

// 暴露给渲染进程的API
const api = {
  // ===== 浏览器控制 =====
  launchBrowser: (config: BrowserConfig) => 
    ipcRenderer.invoke('launch-browser', config),
  
  closeBrowser: () => 
    ipcRenderer.invoke('close-browser'),
  
  navigateTo: (url: string) => 
    ipcRenderer.invoke('navigate-to', url),

  // ===== ASR语音识别 =====
  startASR: (controlId: string) => 
    ipcRenderer.invoke('start-asr', controlId),
  
  stopASR: () => 
    ipcRenderer.invoke('stop-asr'),
  
  onASRResult: (callback: (data: { controlId: string; text: string; timestamp: number }) => void) => {
    const handler = (_event: any, data: any) => callback(data)
    ipcRenderer.on('asr-result', handler)
    return () => ipcRenderer.removeListener('asr-result', handler)
  },

  // ===== RPA自动化 =====
  runRPA: (params: RPAParams) => 
    ipcRenderer.invoke('run-rpa', params),

  // ===== 系统事件 =====
  onLog: (callback: (log: string) => void) => {
    const handler = (_event: any, log: string) => callback(log)
    ipcRenderer.on('log', handler)
    return () => ipcRenderer.removeListener('log', handler)
  },

  onError: (callback: (error: string) => void) => {
    const handler = (_event: any, error: string) => callback(error)
    ipcRenderer.on('error', handler)
    return () => ipcRenderer.removeListener('error', handler)
  },

  // ===== 配置 =====
  getConfig: () => ipcRenderer.invoke('get-config'),
  
  // ===== 版本信息 =====
  versions: {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron
  }
}

// 使用contextBridge安全地暴露API
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('[Preload] Failed to expose APIs:', error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}

// 类型声明（供TypeScript使用）
declare global {
  interface Window {
    electron: typeof electronAPI
    api: typeof api
  }
}
