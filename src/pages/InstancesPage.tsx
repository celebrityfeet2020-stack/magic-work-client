/**
 * 魔作智控 2.0 - 浏览器实例管理页面
 * 
 * 场控后台实例：需要填写场控后台URL和直播大屏URL两个网址
 * 水军实例：只需要填写直播间URL一个网址
 */

import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { instanceAPI, BrowserInstance, CreateInstanceRequest } from '../api/client';
import { 
  Plus, 
  Trash2, 
  Play, 
  Square, 
  Monitor, 
  Users,
  Globe,
  Shield,
  Tv
} from 'lucide-react';

// 平台列表
const PLATFORMS = ['抖音', '视频号', '快手', '小红书', '淘宝', '拼多多', '京东'];

// 角色列表
const ROLES = ['场控后台', '水军'];

const InstancesPage: React.FC = () => {
  const { instances, setInstances, addInstance, removeInstance, addLog } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 刷新实例列表
  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const list = await instanceAPI.list();
      setInstances(list);
      addLog({ type: 'info', source: '实例管理', message: `已刷新，共 ${list.length} 个实例` });
    } catch (error) {
      addLog({ type: 'error', source: '实例管理', message: '刷新实例列表失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // 删除实例
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除实例 "${name}" 吗？`)) return;
    
    try {
      await instanceAPI.delete(id);
      removeInstance(id);
      addLog({ type: 'success', source: '实例管理', message: `已删除实例: ${name}` });
    } catch (error) {
      addLog({ type: 'error', source: '实例管理', message: `删除实例失败: ${name}` });
    }
  };

  // 启动实例
  const handleStart = async (instance: BrowserInstance) => {
    try {
      // 从后端返回的proxy_config中获取代理配置
      const proxyConfig = instance.proxy_config;
      const hasProxy = proxyConfig?.enabled && proxyConfig?.host && proxyConfig?.port;
      
      // 调用Electron API创建浏览器窗口
      await window.electronAPI?.instance.create(instance.id, {
        name: instance.name,
        platform: instance.platform,
        role: instance.role,
        // 场控后台使用双URL，水军使用单URL
        controlPanelUrl: instance.control_panel_url,
        liveScreenUrl: instance.live_screen_url,
        roomUrl: instance.room_url,
        proxyConfig: hasProxy ? {
          enabled: true,
          host: proxyConfig.host,
          port: proxyConfig.port,
          username: proxyConfig.username || undefined,
          password: proxyConfig.password || undefined,
        } : { enabled: false },
      });
      
      // 更新状态
      await instanceAPI.updateStatus(instance.id, true);
      addLog({ type: 'success', source: '实例管理', message: `已启动实例: ${instance.name}` });
      handleRefresh();
    } catch (error) {
      addLog({ type: 'error', source: '实例管理', message: `启动实例失败: ${instance.name}` });
    }
  };

  // 停止实例
  const handleStop = async (instance: BrowserInstance) => {
    try {
      await window.electronAPI?.instance.close(instance.id);
      await instanceAPI.updateStatus(instance.id, false);
      addLog({ type: 'info', source: '实例管理', message: `已停止实例: ${instance.name}` });
      handleRefresh();
    } catch (error) {
      addLog({ type: 'error', source: '实例管理', message: `停止实例失败: ${instance.name}` });
    }
  };

  // 按角色分组实例
  const controlInstances = instances.filter(i => i.role === '场控后台');
  const soldierInstances = instances.filter(i => i.role === '水军');

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-magic-text">浏览器实例管理</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-magic-border text-magic-text rounded-lg hover:bg-magic-border/80 transition-colors disabled:opacity-50"
          >
            {isLoading ? '刷新中...' : '刷新'}
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            新建实例
          </button>
        </div>
      </div>

      {/* 实例列表 */}
      <div className="flex-1 overflow-auto space-y-6">
        {/* 场控后台实例 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Monitor size={20} className="text-magic-primary" />
            <h2 className="text-lg font-medium text-magic-text">场控后台实例</h2>
            <span className="text-magic-text-secondary text-sm">({controlInstances.length})</span>
          </div>
          
          {controlInstances.length === 0 ? (
            <div className="bg-magic-card rounded-lg border border-magic-border p-8 text-center text-magic-text-secondary">
              暂无场控后台实例，点击"新建实例"创建
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {controlInstances.map((instance) => (
                <InstanceCard 
                  key={instance.id} 
                  instance={instance}
                  onStart={() => handleStart(instance)}
                  onStop={() => handleStop(instance)}
                  onDelete={() => handleDelete(instance.id, instance.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 水军实例 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users size={20} className="text-yellow-400" />
            <h2 className="text-lg font-medium text-magic-text">水军实例</h2>
            <span className="text-magic-text-secondary text-sm">({soldierInstances.length})</span>
          </div>
          
          {soldierInstances.length === 0 ? (
            <div className="bg-magic-card rounded-lg border border-magic-border p-8 text-center text-magic-text-secondary">
              暂无水军实例，点击"新建实例"创建
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {soldierInstances.map((instance) => (
                <InstanceCard 
                  key={instance.id} 
                  instance={instance}
                  onStart={() => handleStart(instance)}
                  onStop={() => handleStop(instance)}
                  onDelete={() => handleDelete(instance.id, instance.name)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建实例弹窗 */}
      {showCreateModal && (
        <CreateInstanceModal 
          onClose={() => setShowCreateModal(false)}
          onCreated={(instance) => {
            addInstance(instance);
            setShowCreateModal(false);
            addLog({ type: 'success', source: '实例管理', message: `已创建实例: ${instance.name}` });
          }}
        />
      )}
    </div>
  );
};

// 实例卡片组件
const InstanceCard: React.FC<{
  instance: BrowserInstance;
  onStart: () => void;
  onStop: () => void;
  onDelete: () => void;
}> = ({ instance, onStart, onStop, onDelete }) => {
  return (
    <div className="bg-magic-card rounded-lg border border-magic-border p-4">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-magic-text font-medium">{instance.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-magic-primary/20 text-magic-primary rounded">
              {instance.platform}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              instance.role === '场控后台' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {instance.role}
            </span>
          </div>
        </div>
        <div className={`w-3 h-3 rounded-full ${instance.is_online ? 'bg-green-400' : 'bg-gray-500'}`} />
      </div>

      {/* 详情 */}
      <div className="space-y-2 text-sm text-magic-text-secondary mb-4">
        {instance.role === '场控后台' ? (
          <>
            <div className="flex items-center gap-2">
              <Monitor size={14} />
              <span className="truncate">{instance.control_panel_url || '未设置场控后台链接'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tv size={14} />
              <span className="truncate">{instance.live_screen_url || '未设置直播大屏链接'}</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Globe size={14} />
            <span className="truncate">{instance.room_url || '未设置直播间链接'}</span>
          </div>
        )}
        {instance.role === '水军' && (
          <div className="flex items-center gap-2">
            <Users size={14} />
            <span>昵称: {instance.soldier_nickname || '未设置'}</span>
          </div>
        )}
        {instance.proxy_config?.enabled && instance.proxy_config?.host && (
          <div className="flex items-center gap-2">
            <Shield size={14} />
            <span>代理: {instance.proxy_config.host}:{instance.proxy_config.port}</span>
          </div>
        )}
        <div className="text-xs text-magic-text-secondary/60">
          指纹ID: {instance.fingerprint_id}
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {instance.is_online ? (
          <button
            onClick={onStop}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            <Square size={14} />
            停止
          </button>
        ) : (
          <button
            onClick={onStart}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
          >
            <Play size={14} />
            启动
          </button>
        )}
        <button
          onClick={onDelete}
          className="px-3 py-2 bg-magic-border text-magic-text-secondary rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// 创建实例弹窗组件
const CreateInstanceModal: React.FC<{
  onClose: () => void;
  onCreated: (instance: BrowserInstance) => void;
}> = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState<CreateInstanceRequest>({
    name: '',
    platform: '抖音',
    role: '场控后台',
    control_panel_url: '',
    live_screen_url: '',
    room_url: '',
    soldier_nickname: '',
    proxy_enabled: false,
    proxy_host: '',
    proxy_port: undefined,
    proxy_username: '',
    proxy_password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证
    if (!formData.name.trim()) {
      setError('请输入实例名称');
      return;
    }
    
    // 场控后台验证：需要两个URL
    if (formData.role === '场控后台') {
      if (!formData.control_panel_url?.trim()) {
        setError('场控后台实例必须设置场控后台链接');
        return;
      }
      if (!formData.live_screen_url?.trim()) {
        setError('场控后台实例必须设置直播大屏链接');
        return;
      }
    }
    
    // 水军验证：需要一个URL和昵称
    if (formData.role === '水军') {
      if (!formData.room_url?.trim()) {
        setError('水军实例必须设置直播间链接');
        return;
      }
      if (!formData.soldier_nickname?.trim()) {
        setError('水军实例必须设置昵称');
        return;
      }
    }
    
    if (formData.proxy_enabled) {
      if (!formData.proxy_host?.trim() || !formData.proxy_port) {
        setError('请完整填写代理配置');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const instance = await instanceAPI.create(formData);
      onCreated(instance);
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-magic-card rounded-lg border border-magic-border w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-magic-text mb-6">新建浏览器实例</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 名称 */}
          <div>
            <label className="block text-sm text-magic-text-secondary mb-1">实例名称 *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="例如：抖音直播间1"
              className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
            />
          </div>

          {/* 平台 */}
          <div>
            <label className="block text-sm text-magic-text-secondary mb-1">平台 *</label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* 角色 */}
          <div>
            <label className="block text-sm text-magic-text-secondary mb-1">角色 *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* 场控后台：双URL输入 */}
          {formData.role === '场控后台' && (
            <>
              <div>
                <label className="block text-sm text-magic-text-secondary mb-1">
                  <div className="flex items-center gap-2">
                    <Monitor size={14} />
                    场控后台链接 *
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.control_panel_url || ''}
                  onChange={(e) => setFormData({ ...formData, control_panel_url: e.target.value })}
                  placeholder="https://buyin.jinritemai.com/..."
                  className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
                />
                <p className="text-xs text-magic-text-secondary/60 mt-1">抖音百应后台地址</p>
              </div>
              <div>
                <label className="block text-sm text-magic-text-secondary mb-1">
                  <div className="flex items-center gap-2">
                    <Tv size={14} />
                    直播大屏链接 *
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.live_screen_url || ''}
                  onChange={(e) => setFormData({ ...formData, live_screen_url: e.target.value })}
                  placeholder="https://compass.jinritemai.com/..."
                  className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
                />
                <p className="text-xs text-magic-text-secondary/60 mt-1">直播大屏专业版地址</p>
              </div>
            </>
          )}

          {/* 水军：单URL输入 */}
          {formData.role === '水军' && (
            <>
              <div>
                <label className="block text-sm text-magic-text-secondary mb-1">
                  <div className="flex items-center gap-2">
                    <Globe size={14} />
                    直播间链接 *
                  </div>
                </label>
                <input
                  type="text"
                  value={formData.room_url || ''}
                  onChange={(e) => setFormData({ ...formData, room_url: e.target.value })}
                  placeholder="https://live.douyin.com/..."
                  className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
                />
              </div>
              <div>
                <label className="block text-sm text-magic-text-secondary mb-1">水军昵称 *</label>
                <input
                  type="text"
                  value={formData.soldier_nickname || ''}
                  onChange={(e) => setFormData({ ...formData, soldier_nickname: e.target.value })}
                  placeholder="例如：抖音1、抖音2"
                  className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
                />
                <p className="text-xs text-magic-text-secondary/60 mt-1">显示在实例分布图和水军在线列表中</p>
              </div>
            </>
          )}

          {/* 代理配置 */}
          <div>
            <label className="flex items-center gap-2 text-sm text-magic-text-secondary mb-2">
              <input
                type="checkbox"
                checked={formData.proxy_enabled}
                onChange={(e) => setFormData({ ...formData, proxy_enabled: e.target.checked })}
                className="rounded"
              />
              启用S5代理
            </label>
            
            {formData.proxy_enabled && (
              <div className="grid grid-cols-2 gap-3 pl-6">
                <input
                  type="text"
                  value={formData.proxy_host || ''}
                  onChange={(e) => setFormData({ ...formData, proxy_host: e.target.value })}
                  placeholder="代理地址"
                  className="px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary"
                />
                <input
                  type="number"
                  value={formData.proxy_port || ''}
                  onChange={(e) => setFormData({ ...formData, proxy_port: parseInt(e.target.value) || undefined })}
                  placeholder="端口"
                  className="px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary"
                />
                <input
                  type="text"
                  value={formData.proxy_username || ''}
                  onChange={(e) => setFormData({ ...formData, proxy_username: e.target.value })}
                  placeholder="用户名（可选）"
                  className="px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary"
                />
                <input
                  type="password"
                  value={formData.proxy_password || ''}
                  onChange={(e) => setFormData({ ...formData, proxy_password: e.target.value })}
                  placeholder="密码（可选）"
                  className="px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary"
                />
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="text-red-400 text-sm">{error}</div>
          )}

          {/* 按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-magic-border text-magic-text rounded-lg hover:bg-magic-border/80 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstancesPage;
