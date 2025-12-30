import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import puppeteer from 'puppeteer-core'
import axios from 'axios'
import { RPAEngine } from './rpa_engine'
import { ASRClient } from './asr_client'

// 版本号 - 用于确认客户端版本
const CLIENT_VERSION = '2.0.1'

// 配置常量（从环境变量或默认值）
const CONFIG = {
  API_BASE_URL: process.env.VITE_API_BASE_URL || 'http://212.64.83.18:17821',
  ASR_WS_URL: process.env.VITE_ASR_WS_URL || 'ws://10.98.98.5:10095',
  RPA_BASE_URL: process.env.VITE_RPA_BASE_URL || 'http://127.0.0.1:17821',
  RPA_AUTH_TOKEN: process.env.VITE_RPA_AUTH_TOKEN || 'Vsig2IOr',
  CHROME_PATH: process.env.VITE_CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  PROFILES_DIR: process.env.VITE_PROFILES_DIR || 'C:\\MagicWork\\Profiles'
}

// 主窗口引用
let mainWindow: BrowserWindow | null = null

// 发送日志到渲染进程
function sendLog(message: string): void {
  console.log(`[Main] ${message}`)
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('log', message)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: `魔作智控 2.0 (v${CLIENT_VERSION})`,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    sendLog(`客户端版本: v${CLIENT_VERSION}`)
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
    sendLog('正在启动浏览器...')
    
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
    
    sendLog(`浏览器启动成功, PID: ${browser.process()?.pid}`)
    return { success: true, pid: browser.process()?.pid }
  } catch (error: any) {
    sendLog(`浏览器启动失败: ${error.message}`)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('close-browser', async () => {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
    pageInstance = null
    sendLog('浏览器已关闭')
    return { success: true }
  }
  return { success: false, error: 'No browser instance' }
})

ipcMain.handle('navigate-to', async (_event, url: string) => {
  if (!pageInstance) return { success: false, error: 'Browser not started' }
  
  try {
    await pageInstance.goto(url, { waitUntil: 'networkidle2' })
    sendLog(`导航到: ${url}`)
    return { success: true, url }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// ===== ASR 语音识别集成 =====
let asrClient: ASRClient | null = null

ipcMain.handle('start-asr', (_event, controlId: string) => {
  if (asrClient) {
    sendLog('ASR已在运行中')
    return { success: false, error: 'ASR already running' }
  }
  
  sendLog(`启动ASR, 智控ID: ${controlId}`)
  
  asrClient = new ASRClient(CONFIG.ASR_WS_URL, (text: string) => {
    sendLog(`ASR识别结果: ${text}`)
    
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
    sendLog('ASR已停止')
    return { success: true }
  }
  return { success: false, error: 'ASR not running' }
})

// ===== RPA 自动化执行 =====
// 使用axios替代fetch，更可靠
ipcMain.handle('run-rpa', async (_event, { action, params }) => {
  sendLog(`执行RPA动作: ${action}, 参数: ${JSON.stringify(params)}`)
  
  try {
    // 根据action类型构建正确的API URL
    let apiUrl: string
    let requestBody: any
    
    if (action === 'hotkey' && params.keys) {
      // 快捷键操作
      apiUrl = `${CONFIG.RPA_BASE_URL}/${CONFIG.RPA_AUTH_TOKEN}/api/keyboard/hotkey`
      requestBody = { keys: params.keys }
    } else if (action === 'click' && params.x !== undefined && params.y !== undefined) {
      // 鼠标点击操作
      apiUrl = `${CONFIG.RPA_BASE_URL}/${CONFIG.RPA_AUTH_TOKEN}/api/mouse/click`
      requestBody = { x: params.x, y: params.y, button: params.button || 'left' }
    } else if (action === 'type' && params.text) {
      // 键盘输入操作
      apiUrl = `${CONFIG.RPA_BASE_URL}/${CONFIG.RPA_AUTH_TOKEN}/api/keyboard/type`
      requestBody = { text: params.text }
    } else if (action === 'screenshot') {
      // 截图操作
      apiUrl = `${CONFIG.RPA_BASE_URL}/${CONFIG.RPA_AUTH_TOKEN}/api/screenshot`
      sendLog(`RPA截图请求: ${apiUrl}`)
      const response = await axios.get(apiUrl, { responseType: 'arraybuffer', timeout: 10000 })
      if (response.status === 200) {
        sendLog('RPA截图成功')
        return { success: true, message: 'Screenshot captured' }
      } else {
        sendLog('RPA截图失败')
        return { success: false, error: 'Screenshot failed' }
      }
    } else if (action === 'execute' && params.command) {
      // 执行命令
      apiUrl = `${CONFIG.RPA_BASE_URL}/${CONFIG.RPA_AUTH_TOKEN}/api/execute`
      requestBody = { command: params.command, timeout: params.timeout || 30 }
    } else {
      sendLog(`未知的RPA动作: ${action}`)
      return { success: false, error: `Unknown action: ${action}` }
    }
    
    sendLog(`RPA请求URL: ${apiUrl}`)
    sendLog(`RPA请求体: ${JSON.stringify(requestBody)}`)
    
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    })
    
    const result = response.data
    sendLog(`RPA响应: ${JSON.stringify(result)}`)
    
    // RPA Tool返回的结果中success字段表示执行是否成功
    if (result.success !== undefined) {
      sendLog(result.success ? 'RPA执行成功' : `RPA执行失败: ${result.error || '未知错误'}`)
      return result
    } else {
      // 兼容不同的返回格式
      sendLog('RPA执行完成')
      return { success: true, data: result }
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message || '未知错误'
    sendLog(`RPA执行异常: ${errorMsg}`)
    return { success: false, error: errorMsg }
  }
})

// ===== 获取配置 =====
ipcMain.handle('get-config', () => {
  return {
    version: CLIENT_VERSION,
    apiBaseUrl: CONFIG.API_BASE_URL,
    rpaBaseUrl: CONFIG.RPA_BASE_URL
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
export { CONFIG, CLIENT_VERSION }
