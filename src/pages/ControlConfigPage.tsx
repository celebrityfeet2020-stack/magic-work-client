/**
 * 魔作智控 2.0 - 智能控制配置页面
 * 
 * 功能：
 * - 按平台管理智能控制配置
 * - 配置点击按钮（最多7个，赤橙黄绿青蓝紫）
 * - 配置链接（商品标题、每个按钮独立的触发关键词）
 * - 重复关键词弹窗提示
 * 
 * v2.1.5 更新：
 * - 每个按钮独立配置关键词（而非共享关键词）
 * - 新的UI设计：按钮卡片式关键词配置
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { controlConfigAPI, ControlConfig, ButtonConfig, LinkConfig } from '../api/client';
import { 
  Plus, 
  Trash2, 
  Save, 
  ChevronDown,
  ChevronUp,
  Play,
  X,
  AlertCircle,
} from 'lucide-react';

// 平台列表
const PLATFORMS = ['抖音', '视频号', '快手', '小红书', '淘宝', '拼多多', '京东'];

// 按钮颜色（赤橙黄绿青蓝紫）
const BUTTON_COLORS = [
  { name: '赤', color: '#ef4444', bg: 'bg-red-500' },
  { name: '橙', color: '#f97316', bg: 'bg-orange-500' },
  { name: '黄', color: '#eab308', bg: 'bg-yellow-500' },
  { name: '绿', color: '#22c55e', bg: 'bg-green-500' },
  { name: '青', color: '#06b6d4', bg: 'bg-cyan-500' },
  { name: '蓝', color: '#3b82f6', bg: 'bg-blue-500' },
  { name: '紫', color: '#a855f7', bg: 'bg-purple-500' },
];

const ControlConfigPage: React.FC = () => {
  const { controlConfigs, setControlConfigs, addLog } = useStore();
  const [selectedPlatform, setSelectedPlatform] = useState('抖音');
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // 弹窗状态
  const [alertModal, setAlertModal] = useState<{ show: boolean; title: string; message: string }>({
    show: false,
    title: '',
    message: '',
  });

  // 当前平台的配置列表
  const platformConfigs = controlConfigs.filter(c => c.platform === selectedPlatform);
  
  // 当前选中的配置
  const selectedConfig = controlConfigs.find(c => c.id === selectedConfigId);

  // 显示弹窗
  const showAlert = (title: string, message: string) => {
    setAlertModal({ show: true, title, message });
  };

  // 加载配置列表
  const loadConfigs = async () => {
    setIsLoading(true);
    try {
      const configs = await controlConfigAPI.list(selectedPlatform);
      setControlConfigs(configs);
    } catch (error) {
      addLog({ type: 'error', source: '智能控制', message: '加载配置失败' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, [selectedPlatform]);

  // 删除配置
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除配置 "${name}" 吗？`)) return;
    
    try {
      await controlConfigAPI.delete(id);
      setControlConfigs(controlConfigs.filter(c => c.id !== id));
      if (selectedConfigId === id) {
        setSelectedConfigId(null);
      }
      addLog({ type: 'success', source: '智能控制', message: `已删除配置: ${name}` });
    } catch (error) {
      addLog({ type: 'error', source: '智能控制', message: `删除配置失败: ${name}` });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-magic-text">智能控制配置</h1>
          <p className="text-magic-text-secondary text-sm mt-1">
            根据不同平台配置智能控制逻辑（RPA点击、语音触发等）
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          新建配置
        </button>
      </div>

      {/* 平台选择 */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-magic-text-secondary text-sm">选择平台：</span>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <button
              key={platform}
              onClick={() => {
                setSelectedPlatform(platform);
                setSelectedConfigId(null);
              }}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                selectedPlatform === platform
                  ? 'bg-magic-primary text-white'
                  : 'bg-magic-card border border-magic-border text-magic-text-secondary hover:text-magic-text'
              }`}
            >
              {platform}
            </button>
          ))}
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：配置列表 */}
        <div className="w-64 bg-magic-card rounded-lg border border-magic-border p-4 overflow-y-auto">
          <h3 className="text-magic-text font-medium mb-3">
            {selectedPlatform} 配置列表
          </h3>
          
          {isLoading ? (
            <p className="text-magic-text-secondary text-sm">加载中...</p>
          ) : platformConfigs.length === 0 ? (
            <p className="text-magic-text-secondary text-sm">暂无配置</p>
          ) : (
            <div className="space-y-2">
              {platformConfigs.map((config) => (
                <div
                  key={config.id}
                  onClick={() => setSelectedConfigId(config.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConfigId === config.id
                      ? 'bg-magic-primary/20 border border-magic-primary'
                      : 'bg-magic-bg border border-magic-border hover:border-magic-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-magic-text text-sm font-medium truncate">
                      {config.name}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(config.id, config.name);
                      }}
                      className="text-magic-text-secondary hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p className="text-magic-text-secondary text-xs mt-1">
                    {config.link_configs.length} 个链接配置
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：配置详情 */}
        <div className="flex-1 bg-magic-card rounded-lg border border-magic-border p-4 overflow-y-auto">
          {selectedConfig ? (
            <ConfigEditor 
              config={selectedConfig}
              onUpdate={(updated) => {
                setControlConfigs(controlConfigs.map(c => c.id === updated.id ? updated : c));
              }}
              onLog={addLog}
              onAlert={showAlert}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-magic-text-secondary">
              请从左侧选择一个配置进行编辑
            </div>
          )}
        </div>
      </div>

      {/* 创建配置弹窗 */}
      {showCreateModal && (
        <CreateConfigModal
          platform={selectedPlatform}
          onClose={() => setShowCreateModal(false)}
          onCreated={(config) => {
            setControlConfigs([...controlConfigs, config]);
            setSelectedConfigId(config.id);
            setShowCreateModal(false);
            addLog({ type: 'success', source: '智能控制', message: `已创建配置: ${config.name}` });
          }}
        />
      )}

      {/* 提示弹窗 */}
      {alertModal.show && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          onClose={() => setAlertModal({ ...alertModal, show: false })}
        />
      )}
    </div>
  );
};

// 提示弹窗组件
const AlertModal: React.FC<{
  title: string;
  message: string;
  onClose: () => void;
}> = ({ title, message, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-magic-card rounded-lg border border-magic-border w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle size={24} className="text-yellow-400" />
          <h3 className="text-lg font-bold text-magic-text">{title}</h3>
        </div>
        <p className="text-magic-text-secondary mb-6">{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};

// 配置编辑器组件
const ConfigEditor: React.FC<{
  config: ControlConfig;
  onUpdate: (config: ControlConfig) => void;
  onLog: (log: { type: 'info' | 'warning' | 'error' | 'success'; source: string; message: string }) => void;
  onAlert: (title: string, message: string) => void;
}> = ({ config, onUpdate, onLog, onAlert }) => {
  const [editedConfig, setEditedConfig] = useState<ControlConfig>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedLink, setExpandedLink] = useState<number | null>(0);

  useEffect(() => {
    setEditedConfig(config);
  }, [config]);

  // 获取所有已使用的关键词（用于全局唯一性检查）
  // 返回: Map<关键词, { linkIndex, buttonIndex, buttonName }>
  const getAllKeywords = (): Map<string, { linkIndex: number; buttonIndex: number; buttonName: string }> => {
    const keywordMap = new Map<string, { linkIndex: number; buttonIndex: number; buttonName: string }>();
    editedConfig.link_configs.forEach((link, linkIndex) => {
      // 新格式：button_keyword_configs
      if (link.button_keyword_configs) {
        link.button_keyword_configs.forEach(btnConfig => {
          const btn = editedConfig.button_configs[btnConfig.button_index];
          btnConfig.keywords.forEach(keyword => {
            keywordMap.set(keyword, { 
              linkIndex, 
              buttonIndex: btnConfig.button_index,
              buttonName: btn?.name || `按钮${btnConfig.button_index + 1}`,
            });
          });
        });
      }
      // 旧格式兼容
      else if (link.keywords) {
        link.keywords.forEach(keyword => {
          const btnIndex = link.button_index ?? 0;
          const btn = editedConfig.button_configs[btnIndex];
          keywordMap.set(keyword, { 
            linkIndex, 
            buttonIndex: btnIndex,
            buttonName: btn?.name || `按钮${btnIndex + 1}`,
          });
        });
      }
    });
    return keywordMap;
  };

  // 获取链接配置的总关键词数
  const getTotalKeywordsCount = (link: LinkConfig): number => {
    if (link.button_keyword_configs) {
      return link.button_keyword_configs.reduce((sum, cfg) => sum + cfg.keywords.length, 0);
    }
    return link.keywords?.length || 0;
  };

  // 获取链接配置中已配置的按钮
  const getConfiguredButtons = (link: LinkConfig): number[] => {
    if (link.button_keyword_configs) {
      return link.button_keyword_configs
        .filter(cfg => cfg.keywords.length > 0)
        .map(cfg => cfg.button_index);
    }
    if (link.keywords && link.keywords.length > 0) {
      return [link.button_index ?? 0];
    }
    return [];
  };

  // 颜色代码到中文名称的映射
  const colorCodeToName: Record<string, string> = {
    '#ef4444': '赤',
    '#f97316': '橙',
    '#eab308': '黄',
    '#22c55e': '绿',
    '#06b6d4': '青',
    '#3b82f6': '蓝',
    '#a855f7': '紫',
  };

  // 保存配置
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 转换为后端格式，将颜色代码转换为中文名称
      const dataToSave = {
        name: editedConfig.name,
        platform: editedConfig.platform,
        click_buttons: editedConfig.button_configs.map(btn => ({
          ...btn,
          color: colorCodeToName[btn.color] || btn.color,  // 转换颜色代码为中文名称
        })),
        link_configs: editedConfig.link_configs.map(link => ({
          product_title: link.product_title,
          button_keyword_configs: link.button_keyword_configs,
          // 保留旧字段用于兼容
          keywords: link.keywords || [],
          button_index: link.button_index ?? 0,
        })),
      };
      
      const updated = await controlConfigAPI.update(editedConfig.id, dataToSave);
      onUpdate(updated);
      onLog({ type: 'success', source: '智能控制', message: `配置已保存: ${editedConfig.name}` });
    } catch (error) {
      onLog({ type: 'error', source: '智能控制', message: '保存配置失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 添加按钮配置
  const addButtonConfig = () => {
    if (editedConfig.button_configs.length >= 7) return;
    
    const colorIndex = editedConfig.button_configs.length;
    const newButton: ButtonConfig = {
      name: `按钮${colorIndex + 1}`,
      color: BUTTON_COLORS[colorIndex].color,
      auto_loop: false,
      loop_interval: 30,
    };
    
    setEditedConfig({
      ...editedConfig,
      button_configs: [...editedConfig.button_configs, newButton],
    });
  };

  // 删除按钮配置
  const removeButtonConfig = (index: number) => {
    // 同时清理链接配置中对该按钮的引用
    const updatedLinkConfigs = editedConfig.link_configs.map(link => {
      if (link.button_keyword_configs) {
        return {
          ...link,
          button_keyword_configs: link.button_keyword_configs.filter(cfg => cfg.button_index !== index),
        };
      }
      return link;
    });
    
    setEditedConfig({
      ...editedConfig,
      button_configs: editedConfig.button_configs.filter((_, i) => i !== index),
      link_configs: updatedLinkConfigs,
    });
  };

  // 更新按钮配置
  const updateButtonConfig = (index: number, updates: Partial<ButtonConfig>) => {
    setEditedConfig({
      ...editedConfig,
      button_configs: editedConfig.button_configs.map((btn, i) => 
        i === index ? { ...btn, ...updates } : btn
      ),
    });
  };

  // 添加链接配置
  const addLinkConfig = () => {
    const newLink: LinkConfig = {
      product_title: '',
      button_keyword_configs: [],
      keywords: [],
      button_index: 0,
    };
    
    setEditedConfig({
      ...editedConfig,
      link_configs: [...editedConfig.link_configs, newLink],
    });
    setExpandedLink(editedConfig.link_configs.length);
  };

  // 删除链接配置
  const removeLinkConfig = (index: number) => {
    setEditedConfig({
      ...editedConfig,
      link_configs: editedConfig.link_configs.filter((_, i) => i !== index),
    });
    if (expandedLink === index) {
      setExpandedLink(null);
    }
  };

  // 更新链接配置
  const updateLinkConfig = (index: number, updates: Partial<LinkConfig>) => {
    setEditedConfig({
      ...editedConfig,
      link_configs: editedConfig.link_configs.map((link, i) => 
        i === index ? { ...link, ...updates } : link
      ),
    });
  };

  // 删除按钮关键词配置
  const removeButtonKeywordConfig = (linkIndex: number, buttonIndex: number) => {
    const link = editedConfig.link_configs[linkIndex];
    const existingConfigs = link.button_keyword_configs || [];
    
    updateLinkConfig(linkIndex, {
      button_keyword_configs: existingConfigs.filter(cfg => cfg.button_index !== buttonIndex),
    });
  };

  // 添加关键词到指定按钮
  const addKeywordToButton = (linkIndex: number, buttonIndex: number, keyword: string) => {
    const trimmedKeyword = keyword.trim();
    if (!trimmedKeyword) return;
    
    const link = editedConfig.link_configs[linkIndex];
    const existingConfigs = link.button_keyword_configs || [];
    const btnConfig = existingConfigs.find(cfg => cfg.button_index === buttonIndex);
    
    // 检查当前按钮是否已有此关键词
    if (btnConfig?.keywords.includes(trimmedKeyword)) {
      onAlert('关键词重复', `关键词 "${trimmedKeyword}" 已存在于当前按钮配置中`);
      return;
    }
    
    // 检查全局是否已有此关键词
    const allKeywords = getAllKeywords();
    const existing = allKeywords.get(trimmedKeyword);
    if (existing) {
      onAlert('关键词重复', `关键词 "${trimmedKeyword}" 已被 #${existing.linkIndex + 1} 链接的 "${existing.buttonName}" 使用`);
      return;
    }
    
    // 添加关键词
    if (btnConfig) {
      // 更新已存在的按钮配置
      updateLinkConfig(linkIndex, {
        button_keyword_configs: existingConfigs.map(cfg => 
          cfg.button_index === buttonIndex 
            ? { ...cfg, keywords: [...cfg.keywords, trimmedKeyword] }
            : cfg
        ),
      });
    } else {
      // 创建新的按钮配置
      updateLinkConfig(linkIndex, {
        button_keyword_configs: [...existingConfigs, {
          button_index: buttonIndex,
          keywords: [trimmedKeyword],
        }],
      });
    }
    
    onLog({ type: 'success', source: '智能控制', message: `已添加关键词: ${trimmedKeyword}` });
  };

  // 删除关键词
  const removeKeywordFromButton = (linkIndex: number, buttonIndex: number, keyword: string) => {
    const link = editedConfig.link_configs[linkIndex];
    const existingConfigs = link.button_keyword_configs || [];
    
    updateLinkConfig(linkIndex, {
      button_keyword_configs: existingConfigs.map(cfg => 
        cfg.button_index === buttonIndex 
          ? { ...cfg, keywords: cfg.keywords.filter(k => k !== keyword) }
          : cfg
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* 配置名称 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={editedConfig.name}
            onChange={(e) => setEditedConfig({ ...editedConfig, name: e.target.value })}
            className="text-xl font-bold text-magic-text bg-transparent border-b border-transparent hover:border-magic-border focus:border-magic-primary focus:outline-none"
          />
          <span className="text-magic-text-secondary text-sm">({editedConfig.platform})</span>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={16} />
          {isSaving ? '保存中...' : '保存配置'}
        </button>
      </div>

      {/* 点击按钮配置 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-magic-text font-medium">点击按钮配置（最多7个）</h3>
          <button
            onClick={addButtonConfig}
            disabled={editedConfig.button_configs.length >= 7}
            className="text-sm text-magic-primary hover:text-magic-primary/80 disabled:text-magic-text-secondary disabled:cursor-not-allowed"
          >
            + 添加按钮
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {editedConfig.button_configs.map((button, index) => (
            <div 
              key={index}
              className="bg-magic-bg rounded-lg border border-magic-border p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: button.color }}
                  />
                  <input
                    type="text"
                    value={button.name}
                    onChange={(e) => updateButtonConfig(index, { name: e.target.value })}
                    className="text-sm text-magic-text bg-transparent border-b border-transparent hover:border-magic-border focus:border-magic-primary focus:outline-none w-20"
                  />
                </div>
                <button
                  onClick={() => removeButtonConfig(index)}
                  className="text-magic-text-secondary hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1 text-magic-text-secondary">
                  <input
                    type="checkbox"
                    checked={button.auto_loop}
                    onChange={(e) => updateButtonConfig(index, { auto_loop: e.target.checked })}
                    className="rounded"
                  />
                  自动循环
                </label>
                {button.auto_loop && (
                  <input
                    type="number"
                    value={button.loop_interval}
                    onChange={(e) => updateButtonConfig(index, { loop_interval: parseInt(e.target.value) || 30 })}
                    className="w-12 px-1 py-0.5 bg-magic-card border border-magic-border rounded text-magic-text text-xs"
                    min={5}
                  />
                )}
              </div>
            </div>
          ))}

          {editedConfig.button_configs.length === 0 && (
            <p className="text-magic-text-secondary text-sm col-span-full text-center py-4">
              暂无按钮配置，点击"添加按钮"创建
            </p>
          )}
        </div>
      </div>

      {/* 链接配置 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-magic-text font-medium">链接配置</h3>
          <button
            onClick={addLinkConfig}
            className="text-sm text-magic-primary hover:text-magic-primary/80"
          >
            + 添加配置
          </button>
        </div>

        <div className="space-y-4">
          {editedConfig.link_configs.map((link, index) => {
            const configuredButtons = getConfiguredButtons(link);
            const totalKeywords = getTotalKeywordsCount(link);
            
            return (
              <div 
                key={index}
                className="bg-magic-bg rounded-lg border border-magic-border"
              >
                {/* 链接配置头部 */}
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedLink(expandedLink === index ? null : index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-magic-primary font-bold">#{index + 1}</span>
                    <span className="text-magic-text">
                      {link.product_title || '未命名商品'}
                    </span>
                    <span className="text-magic-text-secondary text-sm">
                      ({totalKeywords} 个关键词)
                    </span>
                    {/* 显示已配置的按钮颜色 */}
                    <div className="flex items-center gap-1">
                      {configuredButtons.map(btnIndex => {
                        const btn = editedConfig.button_configs[btnIndex];
                        if (!btn) return null;
                        return (
                          <div
                            key={btnIndex}
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: btn.color }}
                            title={btn.name}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onLog({ type: 'info', source: '智能控制', message: `手动测试: ${link.product_title}` });
                      }}
                      className="flex items-center gap-1 text-sm text-magic-primary hover:text-magic-primary/80"
                    >
                      <Play size={14} />
                      测试
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLinkConfig(index);
                      }}
                      className="text-magic-text-secondary hover:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                    {expandedLink === index ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* 链接配置详情 */}
                {expandedLink === index && (
                  <div className="px-4 pb-4 border-t border-magic-border pt-4 space-y-4">
                    {/* 商品标题 */}
                    <div>
                      <label className="text-sm text-magic-text-secondary mb-1 block">商品标题（唯一）</label>
                      <input
                        type="text"
                        value={link.product_title || ''}
                        onChange={(e) => updateLinkConfig(index, { product_title: e.target.value })}
                        placeholder="输入商品标题..."
                        className="w-full px-3 py-2 bg-magic-card border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
                      />
                    </div>

                    {/* 按钮关键词配置 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm text-magic-text-secondary">
                          按钮关键词配置（每个按钮独立配置触发关键词）
                        </label>
                      </div>
                      
                      {editedConfig.button_configs.length === 0 ? (
                        <p className="text-magic-text-secondary text-sm">请先添加按钮配置</p>
                      ) : (
                        <div className="space-y-3">
                          {editedConfig.button_configs.map((btn, btnIndex) => {
                            const btnConfig = link.button_keyword_configs?.find(cfg => cfg.button_index === btnIndex);
                            const keywords = btnConfig?.keywords || [];
                            const isConfigured = keywords.length > 0;
                            
                            return (
                              <div 
                                key={btnIndex}
                                className={`rounded-lg border p-3 ${
                                  isConfigured 
                                    ? 'border-magic-primary/50 bg-magic-primary/5' 
                                    : 'border-magic-border bg-magic-card'
                                }`}
                              >
                                {/* 按钮标题 */}
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-4 h-4 rounded"
                                      style={{ backgroundColor: btn.color }}
                                    />
                                    <span className="text-sm font-medium text-magic-text">{btn.name}</span>
                                    <span className="text-xs text-magic-text-secondary">
                                      ({keywords.length} 个关键词)
                                    </span>
                                  </div>
                                  {isConfigured && (
                                    <button
                                      onClick={() => removeButtonKeywordConfig(index, btnIndex)}
                                      className="text-xs text-magic-text-secondary hover:text-red-400"
                                    >
                                      清空
                                    </button>
                                  )}
                                </div>
                                
                                {/* 关键词列表 */}
                                <div className="flex flex-wrap gap-2">
                                  {keywords.map((keyword) => (
                                    <span 
                                      key={keyword}
                                      className="flex items-center gap-1 px-2 py-1 rounded text-sm"
                                      style={{ 
                                        backgroundColor: `${btn.color}33`,
                                        color: btn.color,
                                      }}
                                    >
                                      {keyword}
                                      <button
                                        onClick={() => removeKeywordFromButton(index, btnIndex, keyword)}
                                        className="hover:opacity-70"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  ))}
                                  <input
                                    type="text"
                                    placeholder="输入关键词后按回车..."
                                    className="flex-1 min-w-32 px-2 py-1 bg-magic-bg border border-magic-border rounded text-magic-text text-sm focus:outline-none focus:border-magic-primary"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        addKeywordToButton(index, btnIndex, (e.target as HTMLInputElement).value);
                                        (e.target as HTMLInputElement).value = '';
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {editedConfig.link_configs.length === 0 && (
            <p className="text-magic-text-secondary text-sm text-center py-4">
              暂无链接配置，点击"添加配置"创建
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// 创建配置弹窗
const CreateConfigModal: React.FC<{
  platform: string;
  onClose: () => void;
  onCreated: (config: ControlConfig) => void;
}> = ({ platform, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('请输入配置名称');
      return;
    }

    setIsSubmitting(true);
    try {
      const config = await controlConfigAPI.create({
        name: name.trim(),
        platform,
        button_configs: [],
        link_configs: [],
      });
      onCreated(config);
    } catch (err: any) {
      setError(err.response?.data?.detail || '创建失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-magic-card rounded-lg border border-magic-border w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-magic-text mb-4">新建智能控制配置</h2>
        <p className="text-magic-text-secondary text-sm mb-6">平台：{platform}</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm text-magic-text-secondary mb-1">配置名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：直播间1配置"
              className="w-full px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text focus:outline-none focus:border-magic-primary"
              autoFocus
            />
          </div>

          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-magic-border text-magic-text rounded-lg hover:bg-magic-border/80"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 disabled:opacity-50"
            >
              {isSubmitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ControlConfigPage;
