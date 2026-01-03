/**
 * 魔作智控 2.0 - 主应用组件
 * 
 * v2.1.6 更新：
 * - 优化日志输出，减少不重要的信息（如ASR服务已连接）
 * - 只在状态变化时输出日志，避免重复
 */

import React, { useEffect, useRef } from 'react';
import { useStore } from './store/useStore';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import InstancesPage from './pages/InstancesPage';
import ControlConfigPage from './pages/ControlConfigPage';
import ReplyConfigPage from './pages/ReplyConfigPage';
import BarrageSyncPage from './pages/BarrageSyncPage';
import SettingsPage from './pages/SettingsPage';
import { systemAPI, instanceAPI, controlConfigAPI, scriptAPI, asrAPI, pluginAPI } from './api/client';

const App: React.FC = () => {
  const { 
    currentPage, 
    setConnected, 
    setInstances,
    setControlConfigs,
    setScriptBooks,
    addLog,
    updateInstanceStatus,
    setTriggerWordCount,
    setAsrStatus,
    setPluginStatus,
  } = useStore();

  // 用于追踪状态变化，避免重复日志
  const prevStatusRef = useRef({
    asrStatus: 'disconnected' as string,
    isConnected: false,
    initialized: false,
  });

  // 初始化：加载数据
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 检查后端连接
        const health = await systemAPI.health();
        if (health.status === 'healthy') {
          setConnected(true);
          // 只在首次连接时输出日志
          if (!prevStatusRef.current.initialized) {
            addLog({ type: 'success', source: '系统', message: '后端服务连接成功' });
          }
        }

        // 加载实例列表
        const instances = await instanceAPI.list();
        setInstances(instances);
        
        // 只在首次加载时输出日志
        if (!prevStatusRef.current.initialized && instances.length > 0) {
          addLog({ type: 'info', source: '系统', message: `已加载 ${instances.length} 个浏览器实例` });
        }

        // 更新实例在线状态
        const controlPanel: Record<string, boolean> = {};
        const liveRoom: Record<string, boolean> = {};
        const soldiers: Record<string, Array<{ id: string; nickname: string }>> = {};

        instances.forEach((inst) => {
          if (inst.role === '场控后台') {
            controlPanel[inst.platform] = inst.is_online;
            liveRoom[inst.platform] = inst.is_online; // 暂时同步
          } else if (inst.role === '水军') {
            if (!soldiers[inst.platform]) {
              soldiers[inst.platform] = [];
            }
            if (inst.is_online) {
              soldiers[inst.platform].push({
                id: inst.id,
                nickname: inst.soldier_nickname || inst.name,
              });
            }
          }
        });

        updateInstanceStatus({ controlPanel, liveRoom, soldiers });

        // 加载智能控制配置
        const configs = await controlConfigAPI.list();
        setControlConfigs(configs);

        // 计算触发词数量
        let triggerCount = 0;
        configs.forEach((config) => {
          config.link_configs.forEach((link) => {
            // 新格式：button_keyword_configs
            if (link.button_keyword_configs) {
              link.button_keyword_configs.forEach(cfg => {
                triggerCount += cfg.keywords.length;
              });
            }
            // 旧格式兼容
            else if (link.keywords) {
              triggerCount += link.keywords.length;
            }
          });
        });
        setTriggerWordCount(triggerCount);

        // 加载话术本
        const books = await scriptAPI.list();
        setScriptBooks(books);

        // 标记初始化完成
        prevStatusRef.current.initialized = true;

      } catch (error) {
        console.error('初始化失败:', error);
        setConnected(false);
        // 只在首次失败时输出日志
        if (!prevStatusRef.current.initialized) {
          addLog({ type: 'error', source: '系统', message: '后端服务连接失败' });
          prevStatusRef.current.initialized = true;
        }
      }
    };

    initializeApp();

    // 检查ASR和插件状态（静默检查，不输出日志）
    const checkServiceStatus = async () => {
      try {
        // 检查ASR状态
        const asrHealth = await asrAPI.health();
        const newAsrStatus = asrHealth.status;
        
        // 只在状态变化时更新和输出日志
        if (newAsrStatus !== prevStatusRef.current.asrStatus) {
          setAsrStatus(newAsrStatus);
          
          // 只在从断开变为连接时输出日志
          if (newAsrStatus === 'connected' && prevStatusRef.current.asrStatus === 'disconnected') {
            addLog({ type: 'success', source: '语音引擎', message: '语音识别服务已连接' });
          } else if (newAsrStatus === 'disconnected' && prevStatusRef.current.asrStatus === 'connected') {
            addLog({ type: 'warning', source: '语音引擎', message: '语音识别服务已断开' });
          }
          
          prevStatusRef.current.asrStatus = newAsrStatus;
        }
      } catch {
        if (prevStatusRef.current.asrStatus !== 'disconnected') {
          setAsrStatus('disconnected');
          // 只在首次断开时输出日志
          if (prevStatusRef.current.asrStatus === 'connected') {
            addLog({ type: 'warning', source: '语音引擎', message: '语音识别服务已断开' });
          }
          prevStatusRef.current.asrStatus = 'disconnected';
        }
      }

      try {
        // 检查插件状态（静默检查，不输出日志）
        const pluginStatus = await pluginAPI.status();
        setPluginStatus(pluginStatus.status);
      } catch {
        setPluginStatus('disconnected');
      }
    };

    // 初始检查服务状态
    checkServiceStatus();

    // 定时心跳检查（静默检查，不输出日志）
    const heartbeatInterval = setInterval(async () => {
      try {
        await systemAPI.health();
        const wasConnected = prevStatusRef.current.isConnected;
        setConnected(true);
        
        // 只在从断开变为连接时输出日志
        if (!wasConnected) {
          addLog({ type: 'success', source: '系统', message: '后端服务已恢复连接' });
        }
        prevStatusRef.current.isConnected = true;
      } catch {
        const wasConnected = prevStatusRef.current.isConnected;
        setConnected(false);
        
        // 只在从连接变为断开时输出日志
        if (wasConnected) {
          addLog({ type: 'error', source: '系统', message: '后端服务连接断开' });
        }
        prevStatusRef.current.isConnected = false;
      }

      // 定时检查ASR状态
      checkServiceStatus();
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  }, []);

  // 渲染当前页面
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'instances':
        return <InstancesPage />;
      case 'control':
        return <ControlConfigPage />;
      case 'reply':
        return <ReplyConfigPage />;
      case 'barrage':
        return <BarrageSyncPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-magic-bg text-magic-text overflow-hidden">
      {/* 自定义标题栏 */}
      <TitleBar />

      {/* 主内容区域 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar />

        {/* 页面内容 */}
        <main className="flex-1 overflow-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default App;
