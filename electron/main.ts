/**
 * 魔作智控 2.0 - Electron主进程
 * 
 * v2.1.8 更新：
 * 1. 深度优化浏览器指纹，添加完整的反检测脚本
 * 2. 伪装navigator.webdriver、Canvas、WebGL等指纹
 * 3. 添加插件列表伪装
 * 
 * v2.1.7 更新：
 * 1. 优化浏览器指纹，设置桌面版Chrome User-Agent
 * 2. 移除Electron特征，避免被检测为非标准浏览器
 * 
 * v2.1.6 更新：
 * 1. 修复水军实例窗口输入框被遮住的问题
 * 2. 修复场控页面标签切换不工作的问题
 * 
 * 功能：
 * 1. 创建主窗口（数据大屏）
 * 2. 管理浏览器实例窗口
 *    - 场控后台：双标签页（场控后台URL + 直播大屏URL），无地址栏
 *    - 水军：单页面，无地址栏
 * 3. 音频捕获（从直播画面标签页）
 * 4. WebSocket通信
 */

import { app, BrowserWindow, BrowserView, ipcMain, session } from 'electron';
import * as path from 'path';

// 存储所有浏览器实例窗口
const browserWindows: Map<string, BrowserWindow> = new Map();

// 存储每个窗口的BrowserView（用于场控后台的多标签页）
const browserViews: Map<string, BrowserView[]> = new Map();

// 存储每个窗口当前激活的标签索引
const activeTabIndex: Map<string, number> = new Map();

// 主窗口
let mainWindow: BrowserWindow | null = null;

/**
 * 标准桌面版Chrome User-Agent
 * 使用最新的Chrome版本，Windows 10平台
 */
const DESKTOP_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 浏览器指纹伪装脚本
 * 在页面加载前注入，伪装各种浏览器特征
 */
const FINGERPRINT_SPOOF_SCRIPT = `
(function() {
  'use strict';
  
  // 1. 伪装 navigator.webdriver
  // 这是最重要的检测点，自动化浏览器会设置为true
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true
  });
  
  // 删除webdriver相关属性
  delete navigator.__proto__.webdriver;

  // 2. 伪装 navigator.plugins
  // 真实浏览器有插件列表，Headless浏览器通常为空
  const fakePlugins = [
    { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
    { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
    { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
  ];
  
  const pluginArray = {
    length: fakePlugins.length,
    item: function(index) { return this[index] || null; },
    namedItem: function(name) {
      for (let i = 0; i < this.length; i++) {
        if (this[i].name === name) return this[i];
      }
      return null;
    },
    refresh: function() {}
  };
  
  fakePlugins.forEach((plugin, i) => {
    pluginArray[i] = plugin;
  });
  
  Object.defineProperty(navigator, 'plugins', {
    get: () => pluginArray,
    configurable: true
  });
  
  // 3. 伪装 navigator.languages
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
    configurable: true
  });
  
  // 4. 伪装 navigator.platform
  Object.defineProperty(navigator
, 'platform', {
    get: () => 'Win32',
    configurable: true
  });
  
  // 5. 伪装 navigator.hardwareConcurrency (CPU核心数)
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8,
    configurable: true
  });
  
  // 6. 伪装 navigator.deviceMemory (设备内存)
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8,
    configurable: true
  });
  
  // 7. 伪装 navigator.maxTouchPoints (触摸点数)
  Object.defineProperty(navigator, 'maxTouchPoints', {
    get: () => 0,  // 桌面设备通常为0
    configurable: true
  });
  
  // 8. 伪装 screen 属性
  const screenProps = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24
  };
  
  Object.keys(screenProps).forEach(prop => {
    Object.defineProperty(screen, prop, {
      get: () => screenProps[prop],
      configurable: true
    });
  });
  
  // 9. 伪装 window.chrome 对象
  // 真实Chrome浏览器有这个对象
  if (!window.chrome) {
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
  }
  
  // 10. 伪装 Permissions API
  const originalQuery = window.navigator.permissions?.query;
  if (originalQuery) {
    window.navigator.permissions.query = function(parameters) {
      if (parameters.name === 'notifications') {
        return Promise.resolve({ state: 'prompt', onchange: null });
      }
      return originalQuery.call(this, parameters);
    };
  }
  
  // 11. Canvas指纹伪装 - 添加微小噪声
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
    // 对于指纹检测的canvas，添加噪声
    if (this.width > 0 && this.height > 0) {
      const ctx = this.getContext('2d');
      if (ctx) {
        // 添加一个几乎不可见的像素噪声
        const imageData = ctx.getImageData(0, 0, 1, 1);
        imageData.data[0] = (imageData.data[0] + 1) % 256;
        ctx.putImageData(imageData, 0, 0);
      }
    }
    return originalToDataURL.call(this, type, quality);
  };
  
  // 12. WebGL指纹伪装
  const getParameterProxyHandler = {
    apply: function(target, thisArg, args) {
      const param = args[0];
      const gl = thisArg;
      
      // 伪装渲染器和厂商信息
      if (param === 37445) { // UNMASKED_VENDOR_WEBGL
        return 'Google Inc. (NVIDIA)';
      }
      if (param === 37446) { // UNMASKED_RENDERER_WEBGL
        return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0, D3D11)';
      }
      
      return target.apply(thisArg, args);
    }
  };
  
  // 代理WebGL getParameter
  const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
  WebGLRenderingContext.prototype.getParameter = new Proxy(originalGetParameter, getParameterProxyHandler);
  
  // WebGL2也需要代理
  if (typeof WebGL2RenderingContext !== 'undefined') {
    const originalGetParameter2 = WebGL2RenderingContext.prototype.getParameter;
    WebGL2RenderingContext.prototype.getParameter = new Proxy(originalGetParameter2, getParameterProxyHandler);
  }
  
  // 13. 移除Electron特征
  delete window.process;
  delete window.require;
  delete window.module;
  delete window.exports;
  delete window.__dirname;
  delete window.__filename;
  
  // 14. 伪装 navigator.connection
  if (!navigator.connection) {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false
      }),
      configurable: true
    });
  }
  
  // 15. 伪装 getBattery API
  if (navigator.getBattery) {
    navigator.getBattery = function() {
      return Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1.0,
        onchargingchange: null,
        onchargingtimechange: null,
        ondischargingtimechange: null,
        onlevelchange: null
      });
    };
  }
  
  console.log('[Fingerprint] Browser fingerprint spoofing applied');
})();
`;

/**
 * 配置session的浏览器指纹
 * 设置User-Agent和其他HTTP头，使其看起来像标准桌面浏览器
 */
function configureSessionFingerprint(instanceSession: Electron.Session) {
  // 设置桌面版Chrome User-Agent
  instanceSession.setUserAgent(DESKTOP_USER_AGENT);
  
  // 修改HTTP请求头，移除Electron特征
  instanceSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    
    // 确保User-Agent是桌面版Chrome
    headers['User-Agent'] = DESKTOP_USER_AGENT;
    
    // 设置标准的Accept-Language
    headers['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
    
    // 设置sec-ch-ua头（Client Hints），模拟Chrome
    headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
    headers['sec-ch-ua-mobile'] = '?0';  // 非移动设备
    headers['sec-ch-ua-platform'] = '"Windows"';
    
    callback({ requestHeaders: headers });
  });
  
  // 修改响应头，处理一些安全策略
  instanceSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    
    // 移除一些可能阻止嵌入的头
    delete headers['x-frame-options'];
    delete headers['X-Frame-Options'];
    
    callback({ responseHeaders: headers });
  });
}

/**
 * 为webContents注入指纹伪装脚本
 */
function injectFingerprintSpoof(webContents: Electron.WebContents) {
  // 在每个页面加载前注入脚本
  webContents.on('did-start-loading', () => {
    webContents.executeJavaScript(FINGERPRINT_SPOOF_SCRIPT).catch(() => {
      // 忽略错误（页面可能还没准备好）
    });
  });
  
  // 页面导航时也注入
  webContents.on('did-navigate', () => {
    webContents.executeJavaScript(FINGERPRINT_SPOOF_SCRIPT).catch(() => {});
  });
  
  webContents.on('did-navigate-in-page', () => {
    webContents.executeJavaScript(FINGERPRINT_SPOOF_SCRIPT).catch(() => {});
  });
}

/**
 * 创建主窗口（数据大屏）
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    title: '魔作智控 2.0',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    // 无边框窗口（自定义标题栏）
    frame: false,
    titleBarStyle: 'hidden',
  });

  // 开发模式加载本地服务，生产模式加载打包文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // 关闭所有浏览器实例窗口
    browserWindows.forEach((win) => win.close());
    browserWindows.clear();
    browserViews.clear();
  });
}

/**
 * 创建浏览器实例窗口
 * 
 * 场控后台：双标签页（场控后台 + 直播大屏），有标签栏切换
 * 水军：单页面，直接显示直播间
 */
async function createBrowserInstanceWindow(instanceId: string, config: {
  name: string;
  platform: string;
  role: string;
  controlPanelUrl?: string;  // 场控后台URL
  liveScreenUrl?: string;    // 直播大屏URL
  roomUrl?: string;          // 水军直播间URL
  proxyConfig?: {
    enabled: boolean;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
  };
}) {
  console.log('[Main] Creating browser instance:', instanceId, config);
  
  // 如果已存在，聚焦到该窗口
  if (browserWindows.has(instanceId)) {
    const existingWin = browserWindows.get(instanceId);
    existingWin?.focus();
    return;
  }

  // 创建独立session（用于指纹隔离）
  const partition = `persist:instance-${instanceId}`;
  const instanceSession = session.fromPartition(partition);

  // 配置浏览器指纹（重要：解决环境检测异常问题）
  configureSessionFingerprint(instanceSession);

  // 配置代理
  if (config.proxyConfig?.enabled && config.proxyConfig.host && config.proxyConfig.port) {
    const proxyUrl = config.proxyConfig.username && config.proxyConfig.password
      ? `socks5://${config.proxyConfig.username}:${config.proxyConfig.password}@${config.proxyConfig.host}:${config.proxyConfig.port}`
      : `socks5://${config.proxyConfig.host}:${config.proxyConfig.port}`;
    
    console.log('[Main] Setting proxy:', proxyUrl.replace(/:[^:@]+@/, ':****@'));
    try {
      await instanceSession.setProxy({ proxyRules: proxyUrl });
      console.log('[Main] Proxy configured successfully');
    } catch (error) {
      console.error('[Main] Failed to set proxy:', error);
    }
  }

  // 窗口标题：显示角色类型
  const windowTitle = config.role === '场控后台' 
    ? `场控：${config.name} - ${config.platform}`
    : `水军：${config.name} - ${config.platform}`;

  // 场控后台需要标签栏高度
  const TAB_BAR_HEIGHT = config.role === '场控后台' ? 40 : 0;

  const browserWin = new BrowserWindow({
    width: 1280,
    height: 900,  // 增加窗口高度，确保内容不被遮挡
    title: windowTitle,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,  // 标签栏需要访问ipcRenderer
      contextIsolation: false,  // 允许标签栏使用require
      preload: path.join(__dirname, 'browser-preload.js'),
    },
  });

  // 完全移除菜单栏
  browserWin.setMenu(null);

  // 场控后台：创建带标签栏的界面
  if (config.role === '场控后台') {
    createControlPanelWindow(browserWin, instanceId, config, partition, TAB_BAR_HEIGHT);
  } else {
    // 水军：直接加载直播间页面
    createSoldierWindow(browserWin, instanceId, config, partition);
  }

  browserWindows.set(instanceId, browserWin);

  browserWin.on('closed', () => {
    browserWindows.delete(instanceId);
    activeTabIndex.delete(instanceId);
    // 清理BrowserView
    const views = browserViews.get(instanceId);
    if (views) {
      views.forEach(view => {
        try {
          (view.webContents as any).destroy?.();
        } catch (e) {}
      });
      browserViews.delete(instanceId);
    }
    // 移除IPC监听器
    ipcMain.removeAllListeners(`switch-tab-${instanceId}`);
    ipcMain.removeAllListeners(`refresh-tab-${instanceId}`);
    // 通知渲染进程
    mainWindow?.webContents.send('instance-closed', instanceId);
  });
}

/**
 * 创建场控后台窗口（双标签页）
 */
function createControlPanelWindow(
  browserWin: BrowserWindow, 
  instanceId: string, 
  config: any, 
  partition: string,
  tabBarHeight: number
) {
  // 标签栏HTML - 使用nodeIntegration访问ipcRenderer
  const tabBarHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #1e293b;
          height: ${tabBarHeight}px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          gap: 8px;
          -webkit-app-region: drag;
        }
        .tabs {
          display: flex;
          gap: 4px;
          flex: 1;
          -webkit-app-region: no-drag;
        }
        .tab {
          padding: 8px 20px;
          background: #334155;
          color: #94a3b8;
          border: none;
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;
        }
        .tab.active { 
          background: #3b82f6; 
          color: white; 
        }
        .tab:hover:not(.active) { 
          background: #475569; 
          color: #e2e8f0;
        }
        .refresh-btn {
          width: 32px;
          height: 32px;
          border: none;
          background: #334155;
          color: #94a3b8;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          -webkit-app-region: no-drag;
        }
        .refresh-btn:hover { background: #475569; color: #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="tabs">
        <button class="tab active" id="tab0">场控后台</button>
        <button class="tab" id="tab1">直播大屏</button>
      </div>
      <button class="refresh-btn" id="refreshBtn" title="刷新当前页面">↻</button>
    </body>
    <script>
      const { ipcRenderer } = require('electron');
      let currentTab = 0;
      
      function switchTab(index) {
        currentTab = index;
        document.querySelectorAll('.tab').forEach((t, i) => {
          t.classList.toggle('active', i === index);
        });
        console.log('[TabBar] Switching to tab:', index);
        ipcRenderer.send('switch-tab-${instanceId}', index);
      }
      
      document.getElementById('tab0').addEventListener('click', () => switchTab(0));
      document.getElementById('tab1').addEventListener('click', () => switchTab(1));
      document.getElementById('refreshBtn').addEventListener('click', () => {
        console.log('[TabBar] Refreshing tab:', currentTab);
        ipcRenderer.send('refresh-tab-${instanceId}', currentTab);
      });
      
      console.log('[TabBar] Initialized for instance: ${instanceId}');
    </script>
    </html>
  `;

  const tabBarDataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(tabBarHtml)}`;
  browserWin.loadURL(tabBarDataUrl);

  // 创建两个BrowserView
  const views: BrowserView[] = [];

  const createView = (url: string) => {
    const view = new BrowserView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: partition,
      },
    });
    
    const [winWidth, winHeight] = browserWin.getContentSize();
    view.setBounds({ x: 0, y: tabBarHeight, width: winWidth, height: winHeight - tabBarHeight });
    view.setAutoResize({ width: true, height: true });
    
    // 注入指纹伪装脚本
    injectFingerprintSpoof(view.webContents);
    
    // 添加加载事件监听
    view.webContents.on('did-start-loading', () => {
      console.log('[Main] View started loading:', url);
    });
    
    view.webContents.on('did-finish-load', () => {
      console.log('[Main] View finished loading:', url);
    });
    
    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error('[Main] View failed to load:', validatedURL, errorCode, errorDescription);
    });
    
    if (url) {
      view.webContents.loadURL(url, {
        userAgent: DESKTOP_USER_AGENT,
      }).catch(err => {
        console.error('[Main] Failed to load URL:', url, err);
      });
    }
    
    views.push(view);
    return view;
  };

  // 窗口加载完成后创建标签页
  browserWin.webContents.on('did-finish-load', () => {
    console.log('[Main] Tab bar loaded, creating views...');
    
    // 标签页1: 场控后台
    if (config.controlPanelUrl) {
      createView(config.controlPanelUrl);
      console.log('[Main] Created control panel view:', config.controlPanelUrl);
    } else {
      createView('about:blank');
    }
    
    // 标签页2: 直播大屏
    if (config.liveScreenUrl) {
      createView(config.liveScreenUrl);
      console.log('[Main] Created live screen view:', config.liveScreenUrl);
    } else {
      createView('about:blank');
    }
    
    // 显示第一个标签页
    if (views[0]) {
      browserWin.setBrowserView(views[0]);
      activeTabIndex.set(instanceId, 0);
    }
    
    browserViews.set(instanceId, views);
  });

  // IPC: 切换标签页
  ipcMain.on(`switch-tab-${instanceId}`, (_, index) => {
    console.log('[Main] Switching tab for', instanceId, 'to index:', index);
    const instanceViews = browserViews.get(instanceId);
    if (instanceViews && instanceViews[index]) {
      browserWin.setBrowserView(instanceViews[index]);
      activeTabIndex.set(instanceId, index);
    }
  });

  // IPC: 刷新标签页
  ipcMain.on(`refresh-tab-${instanceId}`, (_, index) => {
    console.log('[Main] Refreshing tab for', instanceId, 'index:', index);
    const instanceViews = browserViews.get(instanceId);
    if (instanceViews && instanceViews[index]) {
      instanceViews[index].webContents.reload();
    }
  });

  // 窗口大小变化时更新BrowserView bounds
  browserWin.on('resize', () => {
    const instanceViews = browserViews.get(instanceId);
    if (instanceViews) {
      const [winWidth, winHeight] = browserWin.getContentSize();
      instanceViews.forEach(view => {
        view.setBounds({ x: 0, y: tabBarHeight, width: winWidth, height: winHeight - tabBarHeight });
      });
    }
  });
}

/**
 * 创建水军窗口（单页面）
 * 
 * v2.1.6修复：使用getContentSize()获取内容区域大小，避免输入框被遮挡
 * v2.1.7更新：设置桌面版User-Agent
 * v2.1.8更新：注入指纹伪装脚本
 */
function createSoldierWindow(
  browserWin: BrowserWindow, 
  instanceId: string, 
  config: any, 
  partition: string
) {
  // 直接创建BrowserView加载直播间
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: partition,
    },
  });

  // 使用getContentSize获取内容区域大小（不包括标题栏）
  const [winWidth, winHeight] = browserWin.getContentSize();
  view.setBounds({ x: 0, y: 0, width: winWidth, height: winHeight });
  view.setAutoResize({ width: true, height: true });

  browserWin.setBrowserView(view);
  
  // 注入指纹伪装脚本
  injectFingerprintSpoof(view.webContents);
  
  // 添加加载事件监听
  view.webContents.on('did-start-loading', () => {
    console.log('[Main] Soldier view started loading:', config.roomUrl);
  });
  
  view.webContents.on('did-finish-load', () => {
    console.log('[Main] Soldier view finished loading:', config.roomUrl);
  });
  
  view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('[Main] Soldier view failed to load:', validatedURL, errorCode, errorDescription);
  });

  if (config.roomUrl) {
    console.log('[Main] Loading soldier room URL:', config.roomUrl);
    view.webContents.loadURL(config.roomUrl, {
      userAgent: DESKTOP_USER_AGENT,
    }).catch(err => {
      console.error('[Main] Failed to load soldier room URL:', config.roomUrl, err);
    });
  } else {
    console.warn('[Main] No room URL provided for soldier instance');
  }

  browserViews.set(instanceId, [view]);

  // 窗口大小变化时更新BrowserView bounds
  browserWin.on('resize', () => {
    const [newWidth, newHeight] = browserWin.getContentSize();
    view.setBounds({ x: 0, y: 0, width: newWidth, height: newHeight });
  });
}

/**
 * 关闭浏览器实例窗口
 */
function closeBrowserInstanceWindow(instanceId: string) {
  const win = browserWindows.get(instanceId);
  if (win) {
    win.close();
  }
}

// ==================== IPC 处理 ====================

// 窗口控制 - 使用冒号分隔的命名方式
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());

// 浏览器实例管理 - 使用冒号分隔的命名方式
ipcMain.handle('instance:create', async (_, instanceId, config) => {
  console.log('[Main] IPC instance:create received:', instanceId, config);
  createBrowserInstanceWindow(instanceId, config);
  return true;
});

ipcMain.handle('instance:close', async (_, instanceId) => {
  closeBrowserInstanceWindow(instanceId);
  return true;
});

ipcMain.handle('instance:list', async () => {
  return Array.from(browserWindows.keys());
});

// 兼容旧的IPC通道名称（以防有其他地方使用）
ipcMain.handle('create-browser-instance', async (_, instanceId, config) => {
  createBrowserInstanceWindow(instanceId, config);
  return true;
});

ipcMain.handle('close-browser-instance', async (_, instanceId) => {
  closeBrowserInstanceWindow(instanceId);
  return true;
});

// API基础URL
ipcMain.handle('api:getBaseUrl', () => {
  return 'http://212.64.83.18:17821';
});

// ==================== 应用生命周期 ====================

app.whenReady().then(() => {
  // 配置默认session的指纹（用于主窗口）
  configureSessionFingerprint(session.defaultSession);
  
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 处理证书错误（开发环境）
app.on('certificate-error', (event, _webContents, _url, _error, _certificate, callback) => {
  // 在开发环境中忽略证书错误
  event.preventDefault();
  callback(true);
});
