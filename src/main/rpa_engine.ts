import { Page } from 'puppeteer-core'
import axios from 'axios'

// RPA动作类型定义
interface RPAAction {
  action_type: 'click' | 'input' | 'wait' | 'scroll' | 'hotkey' | 'delay'
  selector?: string
  value?: string
  keys?: string[]
  delay_ms?: number
  description: string
}

interface RPAScript {
  platform: string
  version: string
  actions: RPAAction[]
}

// 本地RPA Tool配置
interface LocalRPAConfig {
  baseUrl: string
  authToken: string
}

export class RPAEngine {
  private page: Page | null
  private apiBaseUrl: string
  private localRPA: LocalRPAConfig

  constructor(page: Page | null, apiBaseUrl: string, localRPA?: LocalRPAConfig) {
    this.page = page
    this.apiBaseUrl = apiBaseUrl
    this.localRPA = localRPA || {
      baseUrl: 'http://127.0.0.1:17821',
      authToken: 'Vsig2IOr'
    }
  }

  // 构建RPA API的完整URL
  private buildRPAUrl(endpoint: string): string {
    return `${this.localRPA.baseUrl}/${this.localRPA.authToken}/api${endpoint}`
  }

  // 从后端加载RPA脚本
  async loadScript(platform: string): Promise<RPAScript> {
    console.log(`[RPA] Loading script for platform: ${platform}`)
    const response = await axios.get(`${this.apiBaseUrl}/api/v1/rpa/scripts/${platform}`)
    return response.data
  }

  // 执行单个动作（浏览器内）
  async executeAction(action: RPAAction, context: Record<string, string> = {}): Promise<void> {
    console.log(`[RPA] Executing: ${action.description} (${action.action_type})`)

    if (!this.page && action.action_type !== 'hotkey' && action.action_type !== 'delay') {
      throw new Error('Browser page not available')
    }

    try {
      switch (action.action_type) {
        case 'wait':
          if (action.selector && this.page) {
            await this.page.waitForSelector(action.selector, { timeout: 10000 })
          }
          break

        case 'input':
          if (action.selector && this.page) {
            await this.page.waitForSelector(action.selector)
            let value = action.value || ''
            // 替换占位符
            for (const key in context) {
              value = value.replace(`{${key}}`, context[key])
            }
            await this.page.type(action.selector, value)
          }
          break

        case 'click':
          if (action.selector && this.page) {
            await this.page.waitForSelector(action.selector)
            await this.page.click(action.selector)
          }
          break

        case 'scroll':
          if (action.selector && this.page) {
            await this.page.evaluate((sel) => {
              document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' })
            }, action.selector)
          }
          break

        case 'hotkey':
          // 通过本地RPA Tool执行快捷键
          if (action.keys && action.keys.length > 0) {
            await this.executeLocalHotkey(action.keys)
          }
          break

        case 'delay':
          await new Promise(resolve => setTimeout(resolve, action.delay_ms || 1000))
          break
      }
    } catch (error) {
      console.error(`[RPA] Action failed: ${action.description}`, error)
      throw error
    }
  }

  // 通过本地RPA Tool执行快捷键（修复：使用正确的API格式）
  async executeLocalHotkey(keys: string[]): Promise<any> {
    console.log(`[RPA] Executing local hotkey:`, keys)
    
    try {
      const url = this.buildRPAUrl('/keyboard/hotkey')
      console.log(`[RPA] Hotkey API URL:`, url)
      
      const response = await axios.post(
        url,
        { keys },  // 直接发送keys数组
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      )
      
      console.log(`[RPA] Local hotkey result:`, response.data)
      return response.data
    } catch (error) {
      console.error(`[RPA] Local hotkey failed:`, error)
      throw error
    }
  }

  // 执行鼠标点击
  async executeLocalClick(x: number, y: number, button: string = 'left'): Promise<any> {
    console.log(`[RPA] Executing local click: (${x}, ${y}) ${button}`)
    
    try {
      const url = this.buildRPAUrl('/mouse/click')
      const response = await axios.post(
        url,
        { x, y, button },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        }
      )
      
      return response.data
    } catch (error) {
      console.error(`[RPA] Local click failed:`, error)
      throw error
    }
  }

  // 执行键盘输入
  async executeLocalType(text: string): Promise<any> {
    console.log(`[RPA] Executing local type:`, text)
    
    try {
      const url = this.buildRPAUrl('/keyboard/type')
      const response = await axios.post(
        url,
        { text },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      )
      
      return response.data
    } catch (error) {
      console.error(`[RPA] Local type failed:`, error)
      throw error
    }
  }

  // 执行命令
  async executeLocalCommand(command: string, timeout: number = 30): Promise<any> {
    console.log(`[RPA] Executing local command:`, command)
    
    try {
      const url = this.buildRPAUrl('/execute')
      const response = await axios.post(
        url,
        { command, timeout },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: (timeout + 5) * 1000  // 给axios多5秒超时
        }
      )
      
      return response.data
    } catch (error) {
      console.error(`[RPA] Local command failed:`, error)
      throw error
    }
  }

  // 获取屏幕截图
  async getScreenshot(): Promise<Buffer> {
    console.log(`[RPA] Getting screenshot`)
    
    try {
      const url = this.buildRPAUrl('/screenshot')
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000
      })
      
      return Buffer.from(response.data)
    } catch (error) {
      console.error(`[RPA] Screenshot failed:`, error)
      throw error
    }
  }

  // 执行本地RPA动作（通用）
  async executeLocalAction(action: string, params: Record<string, any>): Promise<any> {
    console.log(`[RPA] Executing local action: ${action}`, params)
    
    switch (action) {
      case 'hotkey':
        return this.executeLocalHotkey(params.keys || [])
      case 'click':
        return this.executeLocalClick(params.x, params.y, params.button)
      case 'type':
        return this.executeLocalType(params.text)
      case 'execute':
        return this.executeLocalCommand(params.command, params.timeout)
      case 'screenshot':
        return this.getScreenshot()
      default:
        throw new Error(`Unknown action: ${action}`)
    }
  }

  // 运行完整脚本
  async runScript(platform: string, context: Record<string, string> = {}): Promise<void> {
    const script = await this.loadScript(platform)
    console.log(`[RPA] Running script for ${platform} v${script.version}`)

    for (const action of script.actions) {
      await this.executeAction(action, context)
      // 动作之间默认延迟200ms
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    console.log(`[RPA] Script completed for ${platform}`)
  }

  // 预定义的智控动作
  static readonly ACTIONS = {
    // F1/F2 语音智控触发动作
    KAIJIA: { action: 'hotkey', keys: ['ctrl', 'shift', 'k'] },      // 开价
    JIESHAO: { action: 'hotkey', keys: ['ctrl', 'shift', 'j'] },     // 讲解
    YURE: { action: 'hotkey', keys: ['ctrl', 'shift', 'y'] },        // 预热
    SHANGPIN: { action: 'hotkey', keys: ['ctrl', 'shift', 's'] },    // 上品
    XIAJIA: { action: 'hotkey', keys: ['ctrl', 'shift', 'x'] },      // 下架
    
    // 通用动作
    PAUSE: { action: 'hotkey', keys: ['space'] },                     // 暂停
    SCREENSHOT: { action: 'hotkey', keys: ['win', 'shift', 's'] },   // 截图
    REFRESH: { action: 'hotkey', keys: ['f5'] }                       // 刷新
  }
}
