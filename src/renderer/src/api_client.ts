import axios, { AxiosInstance, AxiosError } from 'axios'

// 从环境变量获取配置，或使用默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://212.64.83.18:17821'
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000')

// 创建axios实例
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 添加认证token（如果存在）
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API] Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    console.error('[API] Response error:', error.message)
    
    if (error.response?.status === 401) {
      // 未授权，清除token
      localStorage.removeItem('auth_token')
      // 可以触发重新登录
    }
    
    return Promise.reject(error)
  }
)

// ===== 健康检查 =====
export const checkHealth = async (): Promise<{ status: string; timestamp: string }> => {
  const response = await apiClient.get('/health')
  return response.data
}

// ===== 认证相关 =====
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    id: string
    username: string
    role: string
  }
}

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post('/api/v1/auth/login', credentials)
  const data = response.data
  
  // 保存token
  if (data.access_token) {
    localStorage.setItem('auth_token', data.access_token)
  }
  
  return data
}

export const logout = (): void => {
  localStorage.removeItem('auth_token')
}

// ===== 智控实例相关 =====
export interface ControlInstance {
  id: string
  name: string
  status: 'offline' | 'online' | 'working'
  fingerprint_id: string
  room_url: string
  role_tag: string
  created_at: string
  updated_at: string
}

export interface CreateControlRequest {
  name: string
  fingerprint_id: string
  room_url: string
  role_tag?: string
}

export const getControls = async (): Promise<ControlInstance[]> => {
  const response = await apiClient.get('/api/v1/controls')
  return response.data
}

export const getControl = async (id: string): Promise<ControlInstance> => {
  const response = await apiClient.get(`/api/v1/controls/${id}`)
  return response.data
}

export const createControl = async (data: CreateControlRequest): Promise<ControlInstance> => {
  const response = await apiClient.post('/api/v1/controls', data)
  return response.data
}

export const updateControl = async (id: string, data: Partial<CreateControlRequest>): Promise<ControlInstance> => {
  const response = await apiClient.put(`/api/v1/controls/${id}`, data)
  return response.data
}

export const deleteControl = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/v1/controls/${id}`)
}

// ===== 话术本相关 =====
export interface ScriptEntry {
  id: string
  question: string
  answer: string
  keywords: string[]
  priority: number
}

export interface ScriptBook {
  id: string
  name: string
  control_id: string
  entries: ScriptEntry[]
}

export const getScriptBooks = async (controlId: string): Promise<ScriptBook[]> => {
  const response = await apiClient.get(`/api/v1/controls/${controlId}/scripts`)
  return response.data
}

export const createScriptBook = async (controlId: string, data: { name: string; entries: Omit<ScriptEntry, 'id'>[] }): Promise<ScriptBook> => {
  const response = await apiClient.post(`/api/v1/controls/${controlId}/scripts`, data)
  return response.data
}

// ===== 智能回复 (F3) =====
export interface ChatRequest {
  control_id: string
  message: string
  context?: string
}

export interface ChatResponse {
  reply: string
  matched_script?: ScriptEntry
  is_blocked: boolean
  is_silent: boolean
  confidence: number
}

export const sendChat = async (data: ChatRequest): Promise<ChatResponse> => {
  const response = await apiClient.post('/api/v1/chat/reply', data)
  return response.data
}

// ===== 智控逻辑配置 =====
export interface ControlLogic {
  trigger_keywords: {
    kaijia: string[]    // 开价触发词
    jieshao: string[]   // 讲解触发词
    yure: string[]      // 预热触发词
  }
  hard_block_words: string[]  // 硬屏蔽词
  silent_duration: number     // 强制沉默时长（秒）
}

export const getControlLogic = async (controlId: string): Promise<ControlLogic> => {
  const response = await apiClient.get(`/api/v1/controls/${controlId}/logic`)
  return response.data
}

export const updateControlLogic = async (controlId: string, logic: Partial<ControlLogic>): Promise<ControlLogic> => {
  const response = await apiClient.put(`/api/v1/controls/${controlId}/logic`, logic)
  return response.data
}

// ===== 导出默认实例 =====
export default apiClient
