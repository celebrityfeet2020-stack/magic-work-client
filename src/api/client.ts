/**
 * 魔作智控 2.0 - API客户端
 */

import axios, { AxiosInstance } from 'axios';

// API基础URL
const API_BASE_URL = 'http://212.64.83.18:17821';

// Admin Token (用于访问admin接口)
const ADMIN_TOKEN = 'manus_admin_2819';

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// ==================== 浏览器实例API ====================

// 代理配置接口（匹配后端格式）
export interface ProxyConfig {
  enabled: boolean;
  host?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
}

export interface BrowserInstance {
  id: string;
  name: string;
  platform: string;
  role: string;
  fingerprint_id: string;
  room_url?: string;  // 水军使用的直播间链接
  control_panel_url?: string;  // 场控后台URL（场控后台实例使用）
  live_screen_url?: string;  // 直播大屏专业版URL（场控后台实例使用）
  soldier_nickname?: string;
  proxy_config?: ProxyConfig | null;  // 后端返回的代理配置格式
  is_online: boolean;
  status?: 'online' | 'offline';
  last_heartbeat?: string;
  created_at: string;
}

export interface CreateInstanceRequest {
  name: string;
  platform: string;
  role: string;
  room_url?: string;  // 水军使用的直播间链接
  control_panel_url?: string;  // 场控后台URL（场控后台实例使用）
  live_screen_url?: string;  // 直播大屏专业版URL（场控后台实例使用）
  soldier_nickname?: string;
  proxy_enabled?: boolean;
  proxy_host?: string;
  proxy_port?: number;
  proxy_username?: string;
  proxy_password?: string;
}

export const instanceAPI = {
  // 获取实例列表
  list: (role?: string): Promise<BrowserInstance[]> => 
    apiClient.get('/api/v1/instances', { params: { role } }),
  
  // 获取单个实例
  get: (id: string): Promise<BrowserInstance> => 
    apiClient.get(`/api/v1/instances/${id}`),
  
  // 创建实例 - 转换代理配置格式以匹配后端API
  create: (data: CreateInstanceRequest): Promise<BrowserInstance> => {
    const requestData = {
      name: data.name,
      platform: data.platform,
      role: data.role,
      room_url: data.room_url || null,
      control_panel_url: data.control_panel_url || null,
      live_screen_url: data.live_screen_url || null,
      soldier_nickname: data.soldier_nickname || null,
      proxy_config: data.proxy_enabled ? {
        enabled: true,
        host: data.proxy_host || null,
        port: data.proxy_port || null,
        username: data.proxy_username || null,
        password: data.proxy_password || null,
      } : null,
    };
    return apiClient.post('/api/v1/instances', requestData);
  },
  
  // 删除实例
  delete: (id: string): Promise<void> => 
    apiClient.delete(`/api/v1/instances/${id}`),
  
  // 更新状态
  updateStatus: (id: string, isOnline: boolean): Promise<void> => 
    apiClient.put(`/api/v1/instances/${id}/status`, { is_online: isOnline }),
  
  // 心跳
  heartbeat: (id: string): Promise<void> => 
    apiClient.post(`/api/v1/instances/${id}/heartbeat`),
  
  // 获取水军列表
  getSoldiers: (): Promise<BrowserInstance[]> => 
    apiClient.get('/api/v1/soldiers'),
  
  // 获取平台选项
  getPlatforms: (): Promise<string[]> => 
    apiClient.get('/api/v1/options/platforms'),
  
  // 获取角色选项
  getRoles: (): Promise<string[]> => 
    apiClient.get('/api/v1/options/roles'),
};

// ==================== 智能控制配置API ====================

export interface ClickButton {
  name: string;
  color: string;
  auto_loop: boolean;
  loop_interval: number;
}

// ButtonConfig 别名，与 ClickButton 相同
export type ButtonConfig = ClickButton;

// 每个按钮的关键词配置
export interface ButtonKeywordConfig {
  button_index: number;      // 按钮索引
  keywords: string[];        // 该按钮的触发关键词
}

export interface LinkConfig {
  title?: string;
  product_title?: string;
  // 新版：每个按钮独立配置关键词
  button_keyword_configs?: ButtonKeywordConfig[];
  // 旧版兼容字段
  keywords?: string[];
  button_bindings?: Record<string, boolean>;
  button_index?: number;
}

export interface ControlConfig {
  id: string;
  name: string;
  platform: string;
  click_buttons?: ClickButton[];
  button_configs: ButtonConfig[];
  link_configs: LinkConfig[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateControlConfigRequest {
  name: string;
  platform: string;
  click_buttons?: ClickButton[];
  button_configs?: ButtonConfig[];
  link_configs?: LinkConfig[];
}

// 转换后端返回的配置数据为前端格式
const transformControlConfig = (data: any): ControlConfig => {
  return {
    ...data,
    // 后端使用 click_buttons，前端使用 button_configs
    button_configs: data.click_buttons || data.button_configs || [],
    // 确保 link_configs 存在，并转换为新格式
    link_configs: (data.link_configs || []).map((link: any) => {
      // 如果已经是新格式，直接使用
      if (link.button_keyword_configs && link.button_keyword_configs.length > 0) {
        return {
          ...link,
          product_title: link.product_title || link.title || '',
        };
      }
      // 旧格式转换为新格式
      const buttonKeywordConfigs: ButtonKeywordConfig[] = [];
      // 如果有 button_bindings，转换为新格式
      if (link.button_bindings) {
        Object.entries(link.button_bindings).forEach(([key, value]) => {
          if (value) {
            buttonKeywordConfigs.push({
              button_index: parseInt(key),
              keywords: link.keywords || [],
            });
          }
        });
      } else if (link.button_index !== undefined) {
        // 单按钮旧格式
        buttonKeywordConfigs.push({
          button_index: link.button_index,
          keywords: link.keywords || [],
        });
      }
      return {
        ...link,
        product_title: link.product_title || link.title || '',
        button_keyword_configs: buttonKeywordConfigs,
      };
    }),
  };
};

export const controlConfigAPI = {
  // 获取配置列表
  list: async (platform?: string): Promise<ControlConfig[]> => {
    const data = await apiClient.get('/api/v1/control-configs', { params: { platform } }) as any[];
    return (data || []).map(transformControlConfig);
  },
  
  // 获取单个配置
  get: async (id: string): Promise<ControlConfig> => {
    const data = await apiClient.get(`/api/v1/control-configs/${id}`);
    return transformControlConfig(data);
  },
  
  // 创建配置
  create: async (data: CreateControlConfigRequest): Promise<ControlConfig> => {
    // 转换 button_configs 为 click_buttons
    const requestData = {
      ...data,
      click_buttons: data.button_configs || data.click_buttons || [],
    };
    const result = await apiClient.post('/api/v1/control-configs', requestData);
    return transformControlConfig(result);
  },
  
  // 更新配置
  update: async (id: string, data: Partial<CreateControlConfigRequest>): Promise<ControlConfig> => {
    // 转换 button_configs 为 click_buttons
    const requestData = {
      ...data,
      click_buttons: data.button_configs || data.click_buttons || [],
    };
    const result = await apiClient.put(`/api/v1/control-configs/${id}`, requestData);
    return transformControlConfig(result);
  },
  
  // 删除配置
  delete: (id: string): Promise<void> => 
    apiClient.delete(`/api/v1/control-configs/${id}`),
  
  // 激活配置
  activate: (id: string): Promise<void> => 
    apiClient.post(`/api/v1/control-configs/${id}/activate`),
  
  // 获取当前激活的配置
  getActive: (platform: string): Promise<ControlConfig | null> => 
    apiClient.get(`/api/v1/control-configs/active/${platform}`),
  
  // 检查标题重复
  checkDuplicate: (title: string, excludeId?: string): Promise<{ duplicate: boolean; conflictWith?: string }> => 
    apiClient.post('/api/v1/control-configs/check-duplicate', { title, exclude_id: excludeId }),
  
  // 检查关键词冲突
  checkKeywordConflict: (keywords: string[], excludeId?: string): Promise<{ conflict: boolean; conflictKeywords?: string[] }> => 
    apiClient.post('/api/v1/control-configs/check-keyword-conflict', { keywords, exclude_id: excludeId }),
  
  // 匹配触发词
  matchTrigger: (platform: string, text: string): Promise<{ matched: boolean; button?: string; link?: string }> => 
    apiClient.post('/api/v1/control-configs/match-trigger', { platform, text }),
};

// ==================== 话术本API ====================

// 后端返回的问答对格式
export interface ScriptPairBackend {
  questions: string[];  // 后端使用复数形式
  answers: string[];
  vector?: any;
}

// 前端使用的问答对格式（兼容旧代码）
export interface ScriptPair {
  question: string;  // 前端使用单数形式（第一个问题）
  answers: string[];
}

// 后端返回的话术本格式
export interface ScriptBookBackend {
  id: string;
  name: string;
  pairs: ScriptPairBackend[];
  similarity_threshold?: number;
  conflict_warnings?: string[];
  enabled?: boolean;
  created_at: string;
}

// 下单回复配置
export interface OrderReplyConfig {
  enabled: boolean;           // 是否启用
  probability: number;        // 回复概率 (0-100)
  replies: string[];          // 回复语列表
}

// 自动飘屏配置
export interface AutoFloatConfig {
  enabled: boolean;           // 是否启用
  min_interval: number;       // 最小间隔(秒)
  max_interval: number;       // 最大间隔(秒)
  messages: string[];         // 飘屏消息列表
}

// 前端使用的话术本格式
export interface ScriptBook {
  id: string;
  name: string;
  pairs: ScriptPair[];
  blocked_keywords: string[];  // 屏蔽关键词列表
  order_reply?: OrderReplyConfig;  // 下单回复配置
  auto_float?: AutoFloatConfig;    // 自动飘屏配置
  created_at: string;
  updated_at: string;
}

// 转换后端数据到前端格式
function transformScriptBook(backend: ScriptBookBackend): ScriptBook {
  return {
    id: backend.id,
    name: backend.name,
    pairs: backend.pairs.map(p => ({
      question: p.questions?.[0] || '',  // 取第一个问题
      answers: p.answers || [],
    })),
    blocked_keywords: [],  // 后端暂不支持，默认为空
    order_reply: {         // 默认下单回复配置
      enabled: false,
      probability: 50,
      replies: [],
    },
    auto_float: {          // 默认自动飘屏配置
      enabled: false,
      min_interval: 30,
      max_interval: 60,
      messages: [],
    },
    created_at: backend.created_at,
    updated_at: backend.created_at,  // 后端暂不返回，使用created_at
  };
}

export const scriptAPI = {
  // 获取话术本列表
  list: async (): Promise<ScriptBook[]> => {
    const backendList: ScriptBookBackend[] = await apiClient.get('/api/v1/scripts');
    return backendList.map(transformScriptBook);
  },
  
  // 获取单个话术本
  get: async (id: string): Promise<ScriptBook> => {
    const backend: ScriptBookBackend = await apiClient.get(`/api/v1/scripts/${id}`);
    return transformScriptBook(backend);
  },
  
  // 创建/更新话术本
  create: async (name: string, pairs?: ScriptPair[], blocked_keywords?: string[]): Promise<ScriptBook> => {
    // 转换前端格式到后端格式
    const backendPairs = pairs?.map(p => ({
      questions: [p.question],  // 单个问题转换为数组
      answers: p.answers,
    }));
    
    const backend: ScriptBookBackend = await apiClient.post('/api/v1/scripts', { 
      name, 
      pairs: backendPairs,
      // blocked_keywords 后端暂不支持
    });
    
    // 转换后端响应到前端格式，并保留blocked_keywords
    const result = transformScriptBook(backend);
    result.blocked_keywords = blocked_keywords || [];
    return result;
  },
  
  // 更新话术本
  update: async (id: string, name: string, pairs?: ScriptPair[], blocked_keywords?: string[]): Promise<ScriptBook> => {
    // 转换前端格式到后端格式
    const backendPairs = pairs?.map(p => ({
      questions: [p.question],  // 单个问题转换为数组
      answers: p.answers,
    }));
    
    const backend: ScriptBookBackend = await apiClient.put(`/api/v1/scripts/${id}`, { 
      name, 
      pairs: backendPairs,
    });
    
    // 转换后端响应到前端格式，并保留blocked_keywords
    const result = transformScriptBook(backend);
    result.blocked_keywords = blocked_keywords || [];
    return result;
  },
  
  // 删除话术本
  delete: (id: string): Promise<void> => 
    apiClient.delete(`/api/v1/scripts/${id}`),
  
  // 添加问答对
  addPair: async (bookId: string, pair: ScriptPair): Promise<ScriptBook> => {
    const backendPair = {
      questions: [pair.question],
      answers: pair.answers,
    };
    const backend: ScriptBookBackend = await apiClient.post(`/api/v1/scripts/${bookId}/add-pair`, backendPair);
    return transformScriptBook(backend);
  },
  
  // 删除问答对
  deletePair: async (bookId: string, pairIndex: number): Promise<ScriptBook> => {
    const backend: ScriptBookBackend = await apiClient.delete(`/api/v1/scripts/${bookId}/pairs/${pairIndex}`);
    return transformScriptBook(backend);
  },
  
  // 匹配问题
  match: (question: string): Promise<{ matched: boolean; answer?: string }> => 
    apiClient.post('/api/v1/scripts/match', { question }),
  
  // 检查问题冲突
  checkConflicts: (bookId: string): Promise<{ conflicts: Array<{ pair1: number; pair2: number; similarity: number }> }> => 
    apiClient.post('/api/v1/scripts/check-conflicts', { book_id: bookId }),
};

// ==================== 弹幕API ====================

export interface BarrageTask {
  id: string;
  content: string;
  source_platform: string;
  source_user: string;
  target_platform: string;
  status: string;
  created_at: string;
}

export const barrageAPI = {
  // 上传弹幕
  upload: (content: string, platform: string, username: string): Promise<{ success: boolean; task_id?: string }> => 
    apiClient.post('/api/v1/barrages/upload', { content, platform, username }),
  
  // 获取待发送任务
  getTasks: (soldierId: string): Promise<BarrageTask[]> => 
    apiClient.get(`/api/v1/barrages/tasks/${soldierId}`),
  
  // 完成任务
  completeTask: (taskId: string): Promise<void> => 
    apiClient.post(`/api/v1/barrages/tasks/${taskId}/complete`),
  
  // 获取弹幕队列
  getQueue: (): Promise<BarrageTask[]> => 
    apiClient.get('/api/v1/barrages/queue'),
  
  // 获取黑名单
  getBlacklist: (): Promise<string[]> => 
    apiClient.get('/api/v1/barrages/blacklist'),
  
  // 添加到黑名单
  addToBlacklist: (userId: string, username: string, isPermanent: boolean): Promise<void> => 
    apiClient.post('/api/v1/barrages/blacklist', { user_id: userId, username, is_permanent: isPermanent }),
  
  // 从黑名单移除
  removeFromBlacklist: (username: string): Promise<void> => 
    apiClient.delete(`/api/v1/barrages/blacklist/${encodeURIComponent(username)}`),
  
  // 获取过滤关键词（使用admin接口）
  getFilterKeywords: async (): Promise<string[]> => {
    const response = await apiClient.get('/api/v1/admin/block-keywords', {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    }) as { keywords: string[] };
    return response.keywords || [];
  },
  
  // 添加过滤关键词（使用admin接口）
  addFilterKeyword: (keyword: string): Promise<void> => 
    apiClient.post('/api/v1/admin/block-keywords', { keywords: [keyword] }, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    }),
  
  // 移除过滤关键词（使用admin接口）
  removeFilterKeyword: (keyword: string): Promise<void> => 
    apiClient.delete(`/api/v1/admin/block-keywords/${encodeURIComponent(keyword)}`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    }),
};

// ==================== ASR语音识别API ====================

export interface ASRHealthStatus {
  status: 'connected' | 'disconnected';
  model?: string;
  backend_status?: string;
  error?: string;
}

export interface LLMHealthStatus {
  status: 'connected' | 'disconnected';
  models?: string[];
  error?: string;
}

export const asrAPI = {
  // 检查ASR服务健康状态
  health: (): Promise<ASRHealthStatus> => 
    apiClient.get('/api/v1/asr/health'),
  
  // 检查LLM服务健康状态
  llmHealth: (): Promise<LLMHealthStatus> => 
    apiClient.get('/api/v1/llm/health'),
  
  // 调用LLM生成回复
  chat: (message: string, systemPrompt?: string, maxTokens?: number): Promise<{ success: boolean; reply?: string; error?: string }> => 
    apiClient.post('/api/v1/llm/chat', { message, system_prompt: systemPrompt, max_tokens: maxTokens }),
};

// ==================== 插件状态API ====================

export interface PluginInfo {
  id: string;
  platform: string;
  room_id: string;
  nickname?: string;
  connected_at: string;
  connected: boolean;
}

export interface PluginStatus {
  status: 'connected' | 'disconnected';
  connected_count: number;
  plugins: PluginInfo[];
}

export const pluginAPI = {
  // 获取插件连接状态
  status: (): Promise<PluginStatus> => 
    apiClient.get('/api/v1/plugin/status'),
  
  // 获取已连接插件列表
  list: (): Promise<{ plugins: PluginInfo[] }> => 
    apiClient.get('/api/v1/plugin/list'),
  
  // 向插件发送任务
  sendTask: (pluginId: string, action: string, content?: string, params?: Record<string, any>): Promise<{ success: boolean; message: string }> => 
    apiClient.post('/api/v1/plugin/send_task', { plugin_id: pluginId, action, content, params }),
  
  // 广播任务到所有插件
  broadcastTask: (action: string, content?: string, params?: Record<string, any>): Promise<{ success: boolean; message: string }> => 
    apiClient.post('/api/v1/plugin/broadcast_task', { action, content, params }),
};

// ==================== 系统API ====================

export const systemAPI = {
  // 健康检查
  health: (): Promise<{ status: string; database: string; timestamp: string }> => 
    apiClient.get('/health'),
  
  // 结束场次
  endSession: (): Promise<void> => 
    apiClient.post('/api/v1/session/end'),
  
  // 获取公告
  getAnnouncements: (): Promise<Array<{ id: string; content: string; created_at: string }>> => 
    apiClient.get('/api/v1/announcements'),
};

export default apiClient;
