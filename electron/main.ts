/**
 * 魔作智控 2.0 - Electron主进程
 * 
 * v2.2.0 更新：
 * 1. 修复代理实例黑屏问题（setProxy改为异步等待）
 * 2. 添加代理认证处理
 * 3. 增强错误处理和日志
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
 * v2.2.0 增强版浏览器指纹伪装脚本
 * 基于 puppeteer-extra-plugin-stealth 最佳实践
 */
const FINGERPRINT_SPOOF_SCRIPT = `
/**
 * 魔作智控 v2.2.0 增强版浏览器指纹伪装脚本
 * 基于 puppeteer-extra-plugin-stealth 最佳实践
 * 
 * 覆盖的检测点：
 * 1. navigator.webdriver
 * 2. navigator.plugins
 * 3. navigator.languages
 * 4. navigator.platform
 * 5. navigator.hardwareConcurrency
 * 6. navigator.deviceMemory
 * 7. navigator.maxTouchPoints
 * 8. navigator.vendor
 * 9. navigator.connection
 * 10. screen属性
 * 11. window.chrome
 * 12. chrome.runtime
 * 13. chrome.app
 * 14. chrome.csi
 * 15. chrome.loadTimes
 * 16. Permissions API
 * 17. Canvas指纹噪声
 * 18. WebGL指纹
 * 19. getBattery API
 * 20. iframe.contentWindow
 * 21. window.outerWidth/outerHeight
 * 22. 移除Electron特征
 * 23. 移除自动化标志
 * 24. sourceurl隐藏
 */

(function() {
  'use strict';
  
  // ========== 1. navigator.webdriver ==========
  // 使用ES6 Proxy来通过instanceof测试
  const navigatorProto = Object.getPrototypeOf(navigator);
  Object.defineProperty(navigatorProto, 'webdriver', {
    get: () => undefined,
    configurable: true
  });
  
  // 删除webdriver属性
  delete Object.getPrototypeOf(navigator).webdriver;
  
  // ========== 2. navigator.plugins ==========
  // 创建逼真的插件列表
  const makePlugin = (name, description, filename, mimeTypes) => {
    const plugin = Object.create(Plugin.prototype);
    Object.defineProperties(plugin, {
      name: { value: name, enumerable: true },
      description: { value: description, enumerable: true },
      filename: { value: filename, enumerable: true },
      length: { value: mimeTypes.length, enumerable: true }
    });
    mimeTypes.forEach((mt, i) => {
      const mimeType = Object.create(MimeType.prototype);
      Object.defineProperties(mimeType, {
        type: { value: mt.type, enumerable: true },
        suffixes: { value: mt.suffixes, enumerable: true },
        description: { value: mt.description, enumerable: true },
        enabledPlugin: { value: plugin, enumerable: true }
      });
      Object.defineProperty(plugin, i, { value: mimeType, enumerable: true });
      Object.defineProperty(plugin, mt.type, { value: mimeType, enumerable: false });
    });
    return plugin;
  };
  
  const pluginsData = [
    {
      name: 'Chrome PDF Plugin',
      description: 'Portable Document Format',
      filename: 'internal-pdf-viewer',
      mimeTypes: [
        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
      ]
    },
    {
      name: 'Chrome PDF Viewer',
      description: '',
      filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
      mimeTypes: [
        { type: 'application/pdf', suffixes: 'pdf', description: '' }
      ]
    },
    {
      name: 'Native Client',
      description: '',
      filename: 'internal-nacl-plugin',
      mimeTypes: [
        { type: 'application/x-nacl', suffixes: '', description: 'Native Client Executable' },
        { type: 'application/x-pnacl', suffixes: '', description: 'Portable Native Client Executable' }
      ]
    }
  ];
  
  const plugins = pluginsData.map(p => makePlugin(p.name, p.description, p.filename, p.mimeTypes));
  const pluginArray = Object.create(PluginArray.prototype);
  plugins.forEach((plugin, i) => {
    Object.defineProperty(pluginArray, i, { value: plugin, enumerable: true });
    Object.defineProperty(pluginArray, plugin.name, { value: plugin, enumerable: false });
  });
  Object.defineProperty(pluginArray, 'length', { value: plugins.length, enumerable: true });
  pluginArray.item = function(index) { return this[index] || null; };
  pluginArray.namedItem = function(name) { return this[name] || null; };
  pluginArray.refresh = function() {};
  
  Object.defineProperty(navigator, 'plugins', {
    get: () => pluginArray,
    configurable: true
  });
  
  // ========== 3. navigator.languages ==========
  Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en-US', 'en'],
    configurable: true
  });
  
  // ========== 4. navigator.platform ==========
  Object.defineProperty(navigator, 'platform', {
    get: () => 'Win32',
    configurable: true
  });
  
  // ========== 5. navigator.hardwareConcurrency ==========
  Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8,
    configurable: true
  });
  
  // ========== 6. navigator.deviceMemory ==========
  Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8,
    configurable: true
  });
  
  // ========== 7. navigator.maxTouchPoints ==========
  Object.defineProperty(navigator, 'maxTouchPoints', {
    get: () => 0,
    configurable: true
  });
  
  // ========== 8. navigator.vendor ==========
  Object.defineProperty(navigator, 'vendor', {
    get: () => 'Google Inc.',
    configurable: true
  });
  
  // ========== 9. navigator.connection ==========
  if (!navigator.connection) {
    const connection = {
      effectiveType: '4g',
      rtt: 50,
      downlink: 10,
      saveData: false,
      onchange: null,
      addEventListener: function() {},
      removeEventListener: function() {},
      dispatchEvent: function() { return true; }
    };
    Object.defineProperty(navigator, 'connection', {
      get: () => connection,
      configurable: true
    });
  }
  
  // ========== 10. screen属性 ==========
  const screenProps = {
    width: 1920,
    height: 1080,
    availWidth: 1920,
    availHeight: 1040,
    colorDepth: 24,
    pixelDepth: 24,
    availLeft: 0,
    availTop: 0
  };
  Object.keys(screenProps).forEach(key => {
    Object.defineProperty(screen, key, {
      get: () => screenProps[key],
      configurable: true
    });
  });
  
  // ========== 11. window.chrome ==========
  if (!window.chrome) {
    window.chrome = {};
  }
  
  // ========== 12. chrome.runtime ==========
  // 这是检测Electron的关键点之一
  if (!window.chrome.runtime) {
    window.chrome.runtime = {
      connect: function() {
        return {
          onMessage: { addListener: function() {} },
          onDisconnect: { addListener: function() {} },
          postMessage: function() {}
        };
      },
      sendMessage: function(extensionId, message, options, responseCallback) {
        if (typeof options === 'function') {
          responseCallback = options;
        }
        if (responseCallback) {
          setTimeout(() => responseCallback(), 0);
        }
      },
      onMessage: {
        addListener: function() {},
        removeListener: function() {},
        hasListener: function() { return false; }
      },
      onConnect: {
        addListener: function() {},
        removeListener: function() {},
        hasListener: function() { return false; }
      },
      id: undefined,
      getManifest: function() { return {}; },
      getURL: function(path) { return ''; },
      getPlatformInfo: function(callback) {
        callback({ os: 'win', arch: 'x86-64', nacl_arch: 'x86-64' });
      }
    };
  }
  
  // ========== 13. chrome.app ==========
  if (!window.chrome.app) {
    window.chrome.app = {
      isInstalled: false,
      InstallState: {
        DISABLED: 'disabled',
        INSTALLED: 'installed',
        NOT_INSTALLED: 'not_installed'
      },
      RunningState: {
        CANNOT_RUN: 'cannot_run',
        READY_TO_RUN: 'ready_to_run',
        RUNNING: 'running'
      },
      getDetails: function() { return null; },
      getIsInstalled: function() { return false; },
      installState: function(callback) {
        callback('not_installed');
      },
      runningState: function() { return 'cannot_run'; }
    };
  }
  
  // ========== 14. chrome.csi ==========
  if (!window.chrome.csi) {
    window.chrome.csi = function() {
      return {
        startE: Date.now(),
        onloadT: Date.now(),
        pageT: Date.now() - performance.timing.navigationStart,
        tran: 15
      };
    };
  }
  
  // ========== 15. chrome.loadTimes ==========
  if (!window.chrome.loadTimes) {
    window.chrome.loadTimes = function() {
      const timing = performance.timing;
      return {
        commitLoadTime: timing.responseStart / 1000,
        connectionInfo: 'h2',
        finishDocumentLoadTime: timing.domContentLoadedEventEnd / 1000,
        finishLoadTime: timing.loadEventEnd / 1000,
        firstPaintAfterLoadTime: 0,
        firstPaintTime: timing.responseEnd / 1000,
        navigationType: 'Other',
        npnNegotiatedProtocol: 'h2',
        requestTime: timing.requestStart / 1000,
        startLoadTime: timing.navigationStart / 1000,
        wasAlternateProtocolAvailable: false,
        wasFetchedViaSpdy: true,
        wasNpnNegotiated: true
      };
    };
  }
  
  // ========== 16. Permissions API ==========
  const originalQuery = window.navigator.permissions.query;
  window.navigator.permissions.query = function(parameters) {
    if (parameters.name === 'notifications') {
      return Promise.resolve({ state: Notification.permission, onchange: null });
    }
    return originalQuery.call(this, parameters);
  };
  
  // ========== 17. Canvas指纹噪声 ==========
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
  HTMLCanvasElement.prototype.toDataURL = function(type) {
    if (type === 'image/png' || type === undefined) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        // 添加微小噪声
        for (let i = 0; i < data.length; i += 4) {
          data[i] = data[i] ^ (Math.random() * 2 | 0);
        }
        context.putImageData(imageData, 0, 0);
      }
    }
    return originalToDataURL.apply(this, arguments);
  };
  
  // ========== 18. WebGL指纹 ==========
  const getParameterProxy = new Proxy(WebGLRenderingContext.prototype.getParameter, {
    apply: function(target, thisArg, args) {
      const param = args[0];
      // UNMASKED_VENDOR_WEBGL
      if (param === 37445) {
        return 'Google Inc. (NVIDIA)';
      }
      // UNMASKED_RENDERER_WEBGL
      if (param === 37446) {
        return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB Direct3D11 vs_5_0 ps_5_0, D3D11)';
      }
      return Reflect.apply(target, thisArg, args);
    }
  });
  WebGLRenderingContext.prototype.getParameter = getParameterProxy;
  
  // WebGL2也需要处理
  if (typeof WebGL2RenderingContext !== 'undefined') {
    WebGL2RenderingContext.prototype.getParameter = getParameterProxy;
  }
  
  // ========== 19. getBattery API ==========
  if (navigator.getBattery) {
    navigator.getBattery = function() {
      return Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1,
        onchargingchange: null,
        onchargingtimechange: null,
        ondischargingtimechange: null,
        onlevelchange: null,
        addEventListener: function() {},
        removeEventListener: function() {},
        dispatchEvent: function() { return true; }
      });
    };
  }
  
  // ========== 20. iframe.contentWindow ==========
  // 代理iframe的contentWindow，使其行为像普通Chrome
  const iframeProto = HTMLIFrameElement.prototype;
  const originalContentWindow = Object.getOwnPropertyDescriptor(iframeProto, 'contentWindow');
  
  Object.defineProperty(iframeProto, 'contentWindow', {
    get: function() {
      const iframe = this;
      const contentWindow = originalContentWindow.get.call(iframe);
      
      if (!contentWindow) return contentWindow;
      
      // 创建代理来处理特殊情况
      return new Proxy(contentWindow, {
        get: function(target, key) {
          if (key === 'self') {
            return target;
          }
          if (key === 'frameElement') {
            return iframe;
          }
          const value = target[key];
          if (typeof value === 'function') {
            return value.bind(target);
          }
          return value;
        }
      });
    },
    configurable: true
  });
  
  // ========== 21. window.outerWidth/outerHeight ==========
  // 确保outerWidth/outerHeight与innerWidth/innerHeight的差值合理
  Object.defineProperty(window, 'outerWidth', {
    get: () => window.innerWidth + 16,
    configurable: true
  });
  Object.defineProperty(window, 'outerHeight', {
    get: () => window.innerHeight + 88,
    configurable: true
  });
  
  // ========== 22. 移除Electron特征 ==========
  // 删除Electron相关的全局变量
  delete window.process;
  delete window.require;
  delete window.module;
  delete window.exports;
  delete window.__dirname;
  delete window.__filename;
  delete window.Buffer;
  delete window.global;
  
  // 移除navigator中的Electron特征
  if (navigator.userAgent.includes('Electron')) {
    Object.defineProperty(navigator, 'userAgent', {
      get: () => navigator.userAgent.replace(/Electron\/[\d.]+\s?/g, ''),
      configurable: true
    });
  }
  
  // ========== 23. 移除自动化标志 ==========
  // 移除可能暴露自动化的属性
  Object.defineProperty(navigator, 'webdriver', {
    get: () => undefined,
    configurable: true
  });
  
  // 移除document.hidden的异常行为
  Object.defineProperty(document, 'hidden', {
    get: () => false,
    configurable: true
  });
  
  Object.defineProperty(document, 'visibilityState', {
    get: () => 'visible',
    configurable: true
  });
  
  // ========== 24. 函数toString伪装 ==========
  // 确保被修改的函数的toString返回原生代码
  const nativeToString = Function.prototype.toString;
  const proxyToString = function() {
    if (this === navigator.permissions.query) {
      return 'function query() { [native code] }';
    }
    if (this === HTMLCanvasElement.prototype.toDataURL) {
      return 'function toDataURL() { [native code] }';
    }
    if (this === WebGLRenderingContext.prototype.getParameter) {
      return 'function getParameter() { [native code] }';
    }
    return nativeToString.call(this);
  };
  Function.prototype.toString = proxyToString;
  
  // 确保toString本身也返回原生代码
  Function.prototype.toString.toString = function() {
    return 'function toString() { [native code] }';
  };
  
  // ========== 25. 媒体编解码器伪装 ==========
  // 伪装支持常见的专有编解码器
  const originalCanPlayType = HTMLMediaElement.prototype.canPlayType;
  HTMLMediaElement.prototype.canPlayType = function(type) {
    // H.264 和 AAC 是专有编解码器，Chromium默认不支持
    if (type.includes('avc1') || type.includes('mp4a')) {
      return 'probably';
    }
    return originalCanPlayType.call(this, type);
  };
  
  console.log('[Stealth] 浏览器指纹伪装已加载 v2.2.0');
})();

`;

/**
 * 配置session的浏览器指纹
 */
function configureSessionFingerprint(instanceSession: Electron.Session) {
  instanceSession.setUserAgent(DESKTOP_USER_AGENT);
  
  instanceSession.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    headers['User-Agent'] = DESKTOP_USER_AGENT;
    headers['Accept-Language'] = 'zh-CN,zh;q=0.9,en;q=0.8';
    headers['sec-ch-ua'] = '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
    callback({ requestHeaders: headers });
  });
  
  instanceSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers['x-frame-options'];
    delete headers['X-Frame-Options'];
    callback({ responseHeaders: headers });
  });
}

/**
 * 为webContents注入指纹伪装脚本
 */
function injectFingerprintSpoof(webContents: Electron.WebContents) {
  webContents.on('did-start-loading', () => {
    webContents.executeJavaScript(FINGERPRINT_SPOOF_SCRIPT).catch(() => {});
  });
  
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
    frame: false,
    titleBarStyle: 'hidden',
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    browserWindows.forEach((win) => win.close());
    browserWindows.clear();
    browserViews.clear();
  });
}

/**
 * v2.2.0: 配置代理（异步，带错误处理）
 */
async function configureProxy(
  instanceSession: Electron.Session, 
  proxyConfig: { enabled: boolean; host?: string; port?: number; username?: string; password?: string },
  instanceId: string
): Promise<boolean> {
  if (!proxyConfig?.enabled || !proxyConfig.host || !proxyConfig.port) {
    console.log(`[Main] Instance ${instanceId}: No proxy configured`);
    return true;
  }

  try {
    // 构建代理URL（SOCKS5）
    const proxyUrl = `socks5://${proxyConfig.host}:${proxyConfig.port}`;
    console.log(`[Main] Instance ${instanceId}: Setting proxy to ${proxyUrl}`);
    
    // 异步设置代理
    await instanceSession.setProxy({ proxyRules: proxyUrl });
    console.log(`[Main] Instance ${instanceId}: Proxy configured successfully`);
    
    // 如果有认证信息，设置代理认证处理
    if (proxyConfig.username && proxyConfig.password) {
      console.log(`[Main] Instance ${instanceId}: Setting up proxy authentication`);
      
      // 处理代理认证请求
      instanceSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (_details, callback) => {
        callback({});
      });
      
      // 监听认证请求
      app.on('login', (loginEvent, _webContents, _request, authInfo, callback) => {
        // 检查是否是代理认证
        if (authInfo.isProxy) {
          loginEvent.preventDefault();
          console.log(`[Main] Instance ${instanceId}: Providing proxy credentials`);
          callback(proxyConfig.username!, proxyConfig.password!);
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error(`[Main] Instance ${instanceId}: Failed to configure proxy:`, error);
    return false;
  }
}

/**
 * 创建浏览器实例窗口
 * 
 * v2.2.0: 修复代理黑屏问题
 */
async function createBrowserInstanceWindow(instanceId: string, config: {
  name: string;
  platform: string;
  role: string;
  controlPanelUrl?: string;
  liveScreenUrl?: string;
  roomUrl?: string;
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

  // 配置浏览器指纹
  configureSessionFingerprint(instanceSession);

  // v2.2.0: 异步配置代理，等待完成
  if (config.proxyConfig?.enabled) {
    const proxySuccess = await configureProxy(instanceSession, config.proxyConfig, instanceId);
    if (!proxySuccess) {
      console.error(`[Main] Instance ${instanceId}: Proxy configuration failed, continuing without proxy`);
      // 通知主窗口代理配置失败
      mainWindow?.webContents.send('instance-proxy-error', {
        instanceId,
        error: 'Proxy configuration failed'
      });
    }
  }

  // 窗口标题
  const windowTitle = config.role === '场控后台' 
    ? `场控：${config.name} - ${config.platform}`
    : `水军：${config.name} - ${config.platform}`;

  // 场控后台需要标签栏高度
  const TAB_BAR_HEIGHT = config.role === '场控后台' ? 40 : 0;

  const browserWin = new BrowserWindow({
    width: 1280,
    height: 900,
    title: windowTitle,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'browser-preload.js'),
    },
  });

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
    const views = browserViews.get(instanceId);
    if (views) {
      views.forEach(view => {
        try {
          (view.webContents as any).destroy?.();
        } catch (e) {}
      });
      browserViews.delete(instanceId);
    }
    ipcMain.removeAllListeners(`switch-tab-${instanceId}`);
    ipcMain.removeAllListeners(`refresh-tab-${instanceId}`);
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
    
    injectFingerprintSpoof(view.webContents);
    
    // v2.2.0: 添加加载错误处理
    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(`[Main] View load failed: ${errorCode} - ${errorDescription} - ${validatedURL}`);
      // 如果是代理相关错误，显示错误页面
      if (errorCode === -130 || errorCode === -105 || errorCode === -106) {
        view.webContents.loadURL(`data:text/html,<html><body style="background:#1e293b;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h2>页面加载失败</h2><p>错误代码: ${errorCode}</p><p>${errorDescription}</p><p>请检查代理配置是否正确</p></div></body></html>`);
      }
    });
    
    if (url) {
      view.webContents.loadURL(url, {
        userAgent: DESKTOP_USER_AGENT,
      });
    }
    
    views.push(view);
    return view;
  };

  browserWin.webContents.on('did-finish-load', () => {
    console.log('[Main] Tab bar loaded, creating views...');
    
    if (config.controlPanelUrl) {
      createView(config.controlPanelUrl);
      console.log('[Main] Created control panel view:', config.controlPanelUrl);
    } else {
      createView('about:blank');
    }
    
    if (config.liveScreenUrl) {
      createView(config.liveScreenUrl);
      console.log('[Main] Created live screen view:', config.liveScreenUrl);
    } else {
      createView('about:blank');
    }
    
    if (views[0]) {
      browserWin.setBrowserView(views[0]);
      activeTabIndex.set(instanceId, 0);
    }
    
    browserViews.set(instanceId, views);
  });

  ipcMain.on(`switch-tab-${instanceId}`, (_, index) => {
    console.log('[Main] Switching tab for', instanceId, 'to index:', index);
    const instanceViews = browserViews.get(instanceId);
    if (instanceViews && instanceViews[index]) {
      browserWin.setBrowserView(instanceViews[index]);
      activeTabIndex.set(instanceId, index);
    }
  });

  ipcMain.on(`refresh-tab-${instanceId}`, (_, index) => {
    console.log('[Main] Refreshing tab for', instanceId, 'index:', index);
    const instanceViews = browserViews.get(instanceId);
    if (instanceViews && instanceViews[index]) {
      instanceViews[index].webContents.reload();
    }
  });

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
 * v2.2.0: 添加加载错误处理
 */
function createSoldierWindow(
  browserWin: BrowserWindow, 
  instanceId: string, 
  config: any, 
  partition: string
) {
  const view = new BrowserView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: partition,
    },
  });

  const [winWidth, winHeight] = browserWin.getContentSize();
  view.setBounds({ x: 0, y: 0, width: winWidth, height: winHeight });
  view.setAutoResize({ width: true, height: true });

  browserWin.setBrowserView(view);
  
  injectFingerprintSpoof(view.webContents);

  // v2.2.0: 添加加载错误处理
  view.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[Main] Soldier view load failed: ${errorCode} - ${errorDescription} - ${validatedURL}`);
    if (errorCode === -130 || errorCode === -105 || errorCode === -106) {
      view.webContents.loadURL(`data:text/html,<html><body style="background:#1e293b;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;"><div style="text-align:center;"><h2>页面加载失败</h2><p>错误代码: ${errorCode}</p><p>${errorDescription}</p><p>请检查代理配置是否正确</p></div></body></html>`);
    }
  });

  if (config.roomUrl) {
    view.webContents.loadURL(config.roomUrl, {
      userAgent: DESKTOP_USER_AGENT,
    });
  }

  browserViews.set(instanceId, [view]);

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

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('window:close', () => mainWindow?.close());

ipcMain.handle('instance:create', async (_, instanceId, config) => {
  console.log('[Main] IPC instance:create received:', instanceId, config);
  await createBrowserInstanceWindow(instanceId, config);
  return true;
});

ipcMain.handle('instance:close', async (_, instanceId) => {
  closeBrowserInstanceWindow(instanceId);
  return true;
});

ipcMain.handle('instance:list', async () => {
  return Array.from(browserWindows.keys());
});

// 兼容旧的IPC通道名称
ipcMain.handle('create-browser-instance', async (_, instanceId, config) => {
  await createBrowserInstanceWindow(instanceId, config);
  return true;
});

ipcMain.handle('close-browser-instance', async (_, instanceId) => {
  closeBrowserInstanceWindow(instanceId);
  return true;
});

ipcMain.handle('api:getBaseUrl', () => {
  return 'http://212.64.83.18:17821';
});

// ==================== 应用生命周期 ====================

app.whenReady().then(() => {
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

app.on('certificate-error', (_event, _webContents, _url, _error, _certificate, callback) => {
  callback(true);
});
