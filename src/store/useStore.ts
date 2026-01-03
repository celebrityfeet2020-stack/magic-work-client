/**
 * 魔作智控 2.0 - 全局状态管理
 */

import { create } from 'zustand';
import { BrowserInstance, ControlConfig, ScriptBook } from '../api/client';

// 日志类型
export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success';
  source: string;
  message: string;
}

// 语音转写记录
export interface TranscriptEntry {
  id: string;
  timestamp: string;
  text: string;
  triggered?: boolean;
  triggerButton?: string;
}

// 实例在线状态
export interface InstanceStatus {
  // 场控后台在线状态（按平台）
  controlPanel: Record<string, boolean>;
  // 直播间页面在线状态（按平台）- 能抓到声音
  liveRoom: Record<string, boolean>;
  // 水军在线状态（按平台，包含昵称列表）
  soldiers: Record<string, Array<{ id: string; nickname: string }>>;
}

// 全局状态
interface AppState {
  // 连接状态
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // 语音引擎状态
  asrStatus: 'connected' | 'disconnected' | 'connecting';
  setAsrStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;

  // 插件状态
  pluginStatus: 'connected' | 'disconnected';
  setPluginStatus: (status: 'connected' | 'disconnected') => void;

  // 实例列表
  instances: BrowserInstance[];
  setInstances: (instances: BrowserInstance[]) => void;
  addInstance: (instance: BrowserInstance) => void;
  removeInstance: (id: string) => void;
  updateInstance: (id: string, updates: Partial<BrowserInstance>) => void;

  // 实例在线状态
  instanceStatus: InstanceStatus;
  updateInstanceStatus: (status: Partial<InstanceStatus>) => void;

  // 智能控制配置
  controlConfigs: ControlConfig[];
  setControlConfigs: (configs: ControlConfig[]) => void;
  activeConfig: ControlConfig | null;
  setActiveConfig: (config: ControlConfig | null) => void;

  // 话术本
  scriptBooks: ScriptBook[];
  setScriptBooks: (books: ScriptBook[]) => void;

  // 实时日志
  logs: LogEntry[];
  addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;

  // 语音转写记录
  transcripts: TranscriptEntry[];
  addTranscript: (transcript: Omit<TranscriptEntry, 'id' | 'timestamp'>) => void;
  clearTranscripts: () => void;

  // 触发词数量
  triggerWordCount: number;
  setTriggerWordCount: (count: number) => void;

  // 当前选中的平台
  selectedPlatform: string;
  setSelectedPlatform: (platform: string) => void;

  // 当前页面
  currentPage: 'dashboard' | 'instances' | 'control' | 'reply' | 'barrage' | 'settings';
  setCurrentPage: (page: 'dashboard' | 'instances' | 'control' | 'reply' | 'barrage' | 'settings') => void;
}

// 生成唯一ID
const generateId = () => Math.random().toString(36).substring(2, 15);

// 获取当前时间戳
const getTimestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('zh-CN', { hour12: false });
};

export const useStore = create<AppState>((set) => ({
  // 连接状态
  isConnected: false,
  setConnected: (connected) => set({ isConnected: connected }),

  // 语音引擎状态
  asrStatus: 'disconnected',
  setAsrStatus: (status) => set({ asrStatus: status }),

  // 插件状态
  pluginStatus: 'disconnected',
  setPluginStatus: (status) => set({ pluginStatus: status }),

  // 实例列表
  instances: [],
  setInstances: (instances) => set({ instances }),
  addInstance: (instance) => set((state) => ({ 
    instances: [...state.instances, instance] 
  })),
  removeInstance: (id) => set((state) => ({ 
    instances: state.instances.filter((i) => i.id !== id) 
  })),
  updateInstance: (id, updates) => set((state) => ({
    instances: state.instances.map((i) => 
      i.id === id ? { ...i, ...updates } : i
    ),
  })),

  // 实例在线状态
  instanceStatus: {
    controlPanel: {},
    liveRoom: {},
    soldiers: {},
  },
  updateInstanceStatus: (status) => set((state) => ({
    instanceStatus: { ...state.instanceStatus, ...status },
  })),

  // 智能控制配置
  controlConfigs: [],
  setControlConfigs: (configs) => set({ controlConfigs: configs }),
  activeConfig: null,
  setActiveConfig: (config) => set({ activeConfig: config }),

  // 话术本
  scriptBooks: [],
  setScriptBooks: (books) => set({ scriptBooks: books }),

  // 实时日志
  logs: [],
  addLog: (log) => set((state) => ({
    logs: [
      { ...log, id: generateId(), timestamp: getTimestamp() },
      ...state.logs.slice(0, 99), // 最多保留100条
    ],
  })),
  clearLogs: () => set({ logs: [] }),

  // 语音转写记录
  transcripts: [],
  addTranscript: (transcript) => set((state) => ({
    transcripts: [
      { ...transcript, id: generateId(), timestamp: getTimestamp() },
      ...state.transcripts.slice(0, 49), // 最多保留50条
    ],
  })),
  clearTranscripts: () => set({ transcripts: [] }),

  // 触发词数量
  triggerWordCount: 0,
  setTriggerWordCount: (count) => set({ triggerWordCount: count }),

  // 当前选中的平台
  selectedPlatform: '抖音',
  setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),

  // 当前页面
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),
}));
