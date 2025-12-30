import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import puppeteer from 'puppeteer-core'
import { RPAEngine } from './rpa_engine'
import { ASRClient } from './asr_client'

// 配置常量（从环境变量或默认值）
const CONFIG = {
  API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://212.64.83.18:17821',
  ASR_WS_URL: process.env.VITE_ASR_WS_URL || 'ws://10.98.98.5:10095',
  RPA_BASE_URL: process.env.VITE_RPA_BASE_URL || 'http://127.0.0.1:17821',
  RPA_AUTH_TOKEN: process.env.VITE_RPA_AUTH_TOKEN || 'Vsig2IOr',
  CHROME_PATH: process.env.VITE_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  PROFILES_DIR: process.env.VITE_PROFILES_DIR || 'C:\\MagicWork\\Profiles'
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: '魔作智控 2.0',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// ===== Puppeteer 指纹浏览器管理 =====
let browserInstance: any = null
let pageInstance: any = null

ipcMain.handle('launch-browser', async (_event, config) => {
  try {
    console.log('[Main] Launching browser with config:', config)
    
    const browser = await puppeteer.launch({
      executablePath: config.executablePath || CONFIG.CHROME_PATH,
      headless: false,
      args: [
        `--user-data-dir=${config.userDataDir || join(CONFIG.PROFILES_DIR, 'Default')}`,
        config.proxy ? `--proxy-server=${config.proxy}` : '',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars'
      ].filter(Boolean),
      defaultViewport: null,
      ignoreDefaultArgs: ['--enable-automation']
    })
    
    browserInstance = browser
    const pages = await browser.pages()
    pageInstance = pages.length > 0 ? pages[0] : await browser.newPage()
    
    // 设置用户代理
    await pageInstance.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    
    console.log('[Main] Browser launched successfully, PID:', browser.process()?.pid)
    return { success: true, pid: browser.process()?.pid }
  } catch (error: any) {
    console.error('[Main] Browser launch failed:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('close-browser', async () => {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
    pageInstance = null
    return { success: true }
  }
  return { success: false, error: 'No browser instance' }
})

ipcMain.handle('navigate-to', async (_event, url: string) => {
  if (!pageInstance) return { success: false, error: 'Browser not started' }
  
  try {
    await pageInstance.goto(url, { waitUntil: 'networkidle2' })
    return { success: true, url }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ===== ASR 语音识别集成 =====
let asrClient: ASRClient | null = null

ipcMain.handle('start-asr', (_event, controlId: string) => {
  if (asrClient) {
    console.log('[Main] ASR already running')
    return { success: false, error: 'ASR already running' }
  }
  
  console.log('[Main] Starting ASR for control:', controlId)
  
  asrClient = new ASRClient(CONFIG.ASR_WS_URL, (text: string) => {
    console.log('[Main] ASR Result:', text)
    
    // 广播ASR结果到所有窗口
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('asr-result', { controlId, text, timestamp: Date.now() })
    })
  })
  
  asrClient.connect()
  return { success: true }
})

ipcMain.handle('stop-asr', () => {
  if (asrClient) {
    asrClient.disconnect()
    asrClient = null
    return { success: true }
  }
  return { success: false, error: 'ASR not running' }
})

// ===== RPA 自动化执行 =====
ipcMain.handle('run-rpa', async (_event, { action, params }) => {
  console.log('[Main] Running RPA action:', action, params)
  
  try {
    // 调用本地RPA服务
    const response = await fetch(`${CONFIG.RPA_BASE_URL}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Token': CONFIG.RPA_AUTH_TOKEN
      },
      body: JSON.stringify({ action, params })
    })
    
    const result = await response.json()
    return result
  } catch (error: any) {
    console.error('[Main] RPA execution failed:', error)
    return { success: false, error: error.message }
  }
})

// ===== 应用生命周期 =====
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.magicwork.client')
  
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  
  createWindow()
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // 清理资源
  if (asrClient) {
    asrClient.disconnect()
    asrClient = null
  }
  if (browserInstance) {
    browserInstance.close()
    browserInstance = null
  }
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// 导出配置供其他模块使用
export { CONFIG }
