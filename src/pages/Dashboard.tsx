/**
 * 魔作智控 2.0 - 数据大屏（主界面）
 * 
 * 布局优化：
 * - 实例分布图和实时日志左右布局
 * - 场控/直播间/水军统一使用分组列表样式
 */

import React from 'react';
import { useStore } from '../store/useStore';
import { Mic, AlertTriangle, CheckCircle, XCircle, Monitor, Users, Tv } from 'lucide-react';

// 平台列表
const PLATFORMS = ['抖音', '视频号', '快手', '小红书', '淘宝', '拼多多', '京东'];

const Dashboard: React.FC = () => {
  const { 
    triggerWordCount, 
    transcripts, 
    logs, 
    asrStatus,
    instances,
  } = useStore();

  // 从实例列表中分类
  const controlInstances = instances.filter(i => i.role === '场控后台');
  const soldierInstances = instances.filter(i => i.role === '水军');
  
  // 按平台分组场控实例
  const controlByPlatform: Record<string, Array<{ id: string; name: string; isOnline: boolean }>> = {};
  PLATFORMS.forEach(p => { controlByPlatform[p] = []; });
  controlInstances.forEach(instance => {
    if (controlByPlatform[instance.platform]) {
      controlByPlatform[instance.platform].push({
        id: instance.id,
        name: instance.name,
        isOnline: instance.is_online,
      });
    }
  });
  
  // 按平台分组水军
  const soldiersByPlatform: Record<string, Array<{ id: string; nickname: string; isOnline: boolean }>> = {};
  PLATFORMS.forEach(p => { soldiersByPlatform[p] = []; });
  soldierInstances.forEach(instance => {
    if (soldiersByPlatform[instance.platform]) {
      soldiersByPlatform[instance.platform].push({
        id: instance.id,
        nickname: instance.soldier_nickname || instance.name,
        isOnline: instance.is_online,
      });
    }
  });

  // 统计在线数量
  const controlOnlineCount = controlInstances.filter(i => i.is_online).length;
  const soldierOnlineCount = soldierInstances.filter(i => i.is_online).length;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 顶部：实时语音转写 + 状态模块 */}
      <div className="grid grid-cols-3 gap-4">
        {/* 实时语音转写模块 */}
        <div className="col-span-2 bg-magic-card rounded-lg border border-magic-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <Mic size={18} className={asrStatus === 'connected' ? 'text-green-400' : 'text-magic-text-secondary'} />
            <h3 className="text-magic-text font-medium">实时语音转写</h3>
            <span className="text-magic-text-secondary text-sm">
              (已配置 {triggerWordCount} 个触发词)
            </span>
          </div>
          
          <div className="bg-magic-bg rounded-lg p-4 h-32 overflow-y-auto log-container">
            {transcripts.length === 0 ? (
              <p className="text-magic-text-secondary text-sm">等待语音输入...</p>
            ) : (
              transcripts.map((t) => (
                <div key={t.id} className="flex items-start gap-2 mb-2">
                  <span className="text-magic-text-secondary text-xs">{t.timestamp}</span>
                  <span className={`text-sm ${t.triggered ? 'text-green-400 font-medium' : 'text-magic-text'}`}>
                    {t.text}
                    {t.triggered && (
                      <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                        触发: {t.triggerButton}
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 状态模块 */}
        <div className="bg-magic-card rounded-lg border border-magic-border p-4">
          <h3 className="text-magic-text font-medium mb-3">系统状态</h3>
          <div className="space-y-3">
            <StatusItem 
              label="后端服务" 
              status={useStore.getState().isConnected ? 'online' : 'offline'} 
            />
            <StatusItem 
              label="语音引擎" 
              status={asrStatus === 'connected' ? 'online' : asrStatus === 'connecting' ? 'connecting' : 'offline'} 
            />
            <StatusItem 
              label="场控实例" 
              status={controlOnlineCount > 0 ? 'online' : 'offline'} 
            />
            <StatusItem 
              label="水军实例" 
              status={soldierOnlineCount > 0 ? 'online' : 'offline'} 
            />
          </div>
        </div>
      </div>

      {/* 中下部：实例分布图（左）+ 实时日志（右）- 左右布局 */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* 左侧：实例分布图 */}
        <div className="bg-magic-card rounded-lg border border-magic-border p-4 flex flex-col min-h-0">
          <h3 className="text-magic-text font-medium mb-4">实例分布图</h3>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* 场控后台在线情况 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Monitor size={16} className="text-magic-primary" />
                <span className="text-sm text-magic-text-secondary">
                  场控后台在线情况 ({controlOnlineCount}/{controlInstances.length})
                </span>
              </div>
              <div className="bg-magic-bg rounded-lg p-3">
                {controlInstances.length === 0 ? (
                  <p className="text-magic-text-secondary text-sm text-center py-2">
                    暂无场控实例
                  </p>
                ) : (
                  <div className="space-y-2">
                    {PLATFORMS.map((platform) => {
                      const controls = controlByPlatform[platform];
                      if (controls.length === 0) return null;
                      
                      return (
                        <div key={platform} className="flex items-start gap-2">
                          <span className="text-sm text-magic-text-secondary w-16 flex-shrink-0">{platform}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {controls.map((control) => (
                              <InstanceBadge 
                                key={control.id}
                                name={control.name}
                                isOnline={control.isOnline}
                                color="blue"
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 直播间页面在线情况 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tv size={16} className="text-green-400" />
                <span className="text-sm text-magic-text-secondary">
                  直播间页面在线情况 ({controlOnlineCount}/{controlInstances.length})
                </span>
              </div>
              <div className="bg-magic-bg rounded-lg p-3">
                {controlInstances.length === 0 ? (
                  <p className="text-magic-text-secondary text-sm text-center py-2">
                    暂无场控实例
                  </p>
                ) : (
                  <div className="space-y-2">
                    {PLATFORMS.map((platform) => {
                      const controls = controlByPlatform[platform];
                      if (controls.length === 0) return null;
                      
                      return (
                        <div key={platform} className="flex items-start gap-2">
                          <span className="text-sm text-magic-text-secondary w-16 flex-shrink-0">{platform}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {controls.map((control) => (
                              <InstanceBadge 
                                key={control.id}
                                name={control.name}
                                isOnline={control.isOnline}
                                color="green"
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 水军在线情况 */}
            <div className="flex-1 min-h-0">
              <div className="flex items-center gap-2 mb-2">
                <Users size={16} className="text-yellow-400" />
                <span className="text-sm text-magic-text-secondary">
                  水军在线情况 ({soldierOnlineCount}/{soldierInstances.length})
                </span>
              </div>
              <div className="bg-magic-bg rounded-lg p-3 max-h-48 overflow-y-auto">
                {soldierInstances.length === 0 ? (
                  <p className="text-magic-text-secondary text-sm text-center py-2">
                    暂无水军账号，请在"浏览器实例"中创建
                  </p>
                ) : (
                  <div className="space-y-2">
                    {PLATFORMS.map((platform) => {
                      const soldiers = soldiersByPlatform[platform];
                      if (soldiers.length === 0) return null;
                      
                      return (
                        <div key={platform} className="flex items-start gap-2">
                          <span className="text-sm text-magic-text-secondary w-16 flex-shrink-0">{platform}</span>
                          <div className="flex flex-wrap gap-1.5">
                            {soldiers.map((soldier) => (
                              <InstanceBadge 
                                key={soldier.id}
                                name={soldier.nickname}
                                isOnline={soldier.isOnline}
                                color="yellow"
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 右侧：实时日志 */}
        <div className="bg-magic-card rounded-lg border border-magic-border p-4 flex flex-col min-h-0">
          <h3 className="text-magic-text font-medium mb-3">实时日志</h3>
          <div className="flex-1 bg-magic-bg rounded-lg p-4 overflow-y-auto log-container min-h-0">
            {logs.length === 0 ? (
              <p className="text-magic-text-secondary text-sm">暂无日志</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex items-start gap-2 mb-2">
                  <span className="text-magic-text-secondary text-xs whitespace-nowrap">
                    {log.timestamp}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                    log.type === 'error' ? 'bg-red-500/20 text-red-400' :
                    log.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                    log.type === 'success' ? 'bg-green-500/20 text-green-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    [{log.source}]
                  </span>
                  <span className={`text-sm ${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'warning' ? 'text-yellow-400' :
                    log.type === 'success' ? 'text-green-400' :
                    'text-magic-text'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 状态项组件
const StatusItem: React.FC<{ 
  label: string; 
  status: 'online' | 'offline' | 'connecting';
}> = ({ label, status }) => {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-magic-text-secondary">{label}</span>
      <div className={`flex items-center gap-1.5 text-xs ${
        status === 'online' ? 'text-green-400' :
        status === 'connecting' ? 'text-yellow-400' :
        'text-red-400'
      }`}>
        {status === 'online' ? <CheckCircle size={14} /> :
         status === 'connecting' ? <AlertTriangle size={14} /> :
         <XCircle size={14} />}
        <span>{status === 'online' ? '在线' : status === 'connecting' ? '连接中' : '离线'}</span>
      </div>
    </div>
  );
};

// 统一的实例徽章组件
const InstanceBadge: React.FC<{
  name: string;
  isOnline: boolean;
  color: 'blue' | 'green' | 'yellow';
}> = ({ name, isOnline, color }) => {
  const colorClasses = {
    blue: {
      online: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      offline: 'bg-magic-border/50 text-magic-text-secondary border-magic-border',
      dot: isOnline ? 'bg-blue-400' : 'bg-gray-500',
    },
    green: {
      online: 'bg-green-500/20 text-green-400 border-green-500/30',
      offline: 'bg-magic-border/50 text-magic-text-secondary border-magic-border',
      dot: isOnline ? 'bg-green-400' : 'bg-gray-500',
    },
    yellow: {
      online: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      offline: 'bg-magic-border/50 text-magic-text-secondary border-magic-border',
      dot: isOnline ? 'bg-yellow-400' : 'bg-gray-500',
    },
  };
  
  const classes = colorClasses[color];
  
  return (
    <div className={`px-2 py-1 rounded text-xs flex items-center gap-1.5 border ${
      isOnline ? classes.online : classes.offline
    }`}>
      <div className={`w-1.5 h-1.5 rounded-full ${classes.dot}`} />
      <span>{name}</span>
    </div>
  );
};

export default Dashboard;
