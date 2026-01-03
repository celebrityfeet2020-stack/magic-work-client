/**
 * 魔作智控 2.0 - 弹幕同步配置页面
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { barrageAPI } from '../api/client';
import { 
  MessageCircle, 
  Filter, 
  Users, 
  RefreshCw,
  XCircle,
  Trash2
} from 'lucide-react';

const BarrageSyncPage: React.FC = () => {
  const { instances, addLog } = useStore();
  const [barrageQueue, setBarrageQueue] = useState<any[]>([]);
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [filterKeywords, setFilterKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  // const [isLoading, setIsLoading] = useState(false);

  // 获取水军实例
  const soldierInstances = instances.filter(i => i.role === '水军');

  // 加载弹幕队列
  const loadBarrageQueue = async () => {
    try {
      const queue = await barrageAPI.getQueue();
      setBarrageQueue(queue);
    } catch (error) {
      console.error('加载弹幕队列失败', error);
    }
  };

  // 加载黑名单
  const loadBlacklist = async () => {
    try {
      const list = await barrageAPI.getBlacklist();
      setBlacklist(list);
    } catch (error) {
      console.error('加载黑名单失败', error);
    }
  };

  // 加载过滤关键词
  const loadFilterKeywords = async () => {
    try {
      const keywords = await barrageAPI.getFilterKeywords();
      setFilterKeywords(keywords);
    } catch (error) {
      console.error('加载过滤关键词失败', error);
    }
  };

  useEffect(() => {
    loadBarrageQueue();
    loadBlacklist();
    loadFilterKeywords();

    // 定时刷新弹幕队列
    const interval = setInterval(loadBarrageQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // 添加过滤关键词
  const addFilterKeyword = async () => {
    if (!newKeyword.trim()) return;
    if (filterKeywords.includes(newKeyword.trim())) {
      addLog({ type: 'warning', source: '弹幕同步', message: '关键词已存在' });
      return;
    }

    try {
      await barrageAPI.addFilterKeyword(newKeyword.trim());
      setFilterKeywords([...filterKeywords, newKeyword.trim()]);
      setNewKeyword('');
      addLog({ type: 'success', source: '弹幕同步', message: `已添加过滤关键词: ${newKeyword}` });
    } catch (error) {
      addLog({ type: 'error', source: '弹幕同步', message: '添加关键词失败' });
    }
  };

  // 删除过滤关键词
  const removeFilterKeyword = async (keyword: string) => {
    try {
      await barrageAPI.removeFilterKeyword(keyword);
      setFilterKeywords(filterKeywords.filter(k => k !== keyword));
      addLog({ type: 'success', source: '弹幕同步', message: `已删除过滤关键词: ${keyword}` });
    } catch (error) {
      addLog({ type: 'error', source: '弹幕同步', message: '删除关键词失败' });
    }
  };

  // 添加黑名单 - 待后续实现UI调用
  // const addToBlacklist = async (userId: string, username: string, isPermanent: boolean) => {
  //   try {
  //     await barrageAPI.addToBlacklist(userId, username, isPermanent);
  //     loadBlacklist();
  //     addLog({ type: 'success', source: '弹幕同步', message: `已将 ${username} 加入${isPermanent ? '永久' : '流动'}黑名单` });
  //   } catch (error) {
  //     addLog({ type: 'error', source: '弹幕同步', message: '添加黑名单失败' });
  //   }
  // };

  // 从黑名单移除
  const removeFromBlacklist = async (userId: string) => {
    try {
      await barrageAPI.removeFromBlacklist(userId);
      setBlacklist(blacklist.filter(b => b.user_id !== userId));
      addLog({ type: 'success', source: '弹幕同步', message: '已从黑名单移除' });
    } catch (error) {
      addLog({ type: 'error', source: '弹幕同步', message: '移除黑名单失败' });
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-magic-text">弹幕同步配置</h1>
          <p className="text-magic-text-secondary text-sm mt-1">
            多平台弹幕汇总、负面过滤、水军账号分发（多平台通用）
          </p>
        </div>
        <button
          onClick={() => {
            loadBarrageQueue();
            loadBlacklist();
            addLog({ type: 'info', source: '弹幕同步', message: '已刷新数据' });
          }}
          className="px-4 py-2 bg-magic-card border border-magic-border text-magic-text rounded-lg hover:border-magic-primary transition-colors flex items-center gap-2"
        >
          <RefreshCw size={16} />
          刷新
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-magic-card rounded-lg border border-magic-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <MessageCircle size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-magic-text-secondary text-sm">待分发弹幕</p>
              <p className="text-2xl font-bold text-magic-text">{barrageQueue.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-magic-card rounded-lg border border-magic-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Users size={20} className="text-green-400" />
            </div>
            <div>
              <p className="text-magic-text-secondary text-sm">在线水军</p>
              <p className="text-2xl font-bold text-magic-text">
                {soldierInstances.filter(i => i.status === 'online').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-magic-card rounded-lg border border-magic-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <XCircle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-magic-text-secondary text-sm">黑名单用户</p>
              <p className="text-2xl font-bold text-magic-text">{blacklist.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-magic-card rounded-lg border border-magic-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Filter size={20} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-magic-text-secondary text-sm">过滤关键词</p>
              <p className="text-2xl font-bold text-magic-text">{filterKeywords.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* 左侧：过滤关键词 + 黑名单 */}
        <div className="flex flex-col gap-4">
          {/* 过滤关键词 */}
          <div className="bg-magic-card rounded-lg border border-magic-border p-4 flex-1">
            <h3 className="text-magic-text font-medium mb-3 flex items-center gap-2">
              <Filter size={18} className="text-yellow-400" />
              负面过滤关键词
            </h3>
            <p className="text-magic-text-secondary text-sm mb-3">
              包含这些关键词的弹幕将被自动过滤，不会分发给水军
            </p>

            {/* 添加关键词 */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                placeholder="输入关键词..."
                className="flex-1 px-3 py-2 bg-magic-bg border border-magic-border rounded-lg text-magic-text text-sm focus:outline-none focus:border-magic-primary"
                onKeyDown={(e) => e.key === 'Enter' && addFilterKeyword()}
              />
              <button
                onClick={addFilterKeyword}
                className="px-3 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 text-sm"
              >
                添加
              </button>
            </div>

            {/* 关键词列表 */}
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {filterKeywords.map((keyword) => (
                <span 
                  key={keyword}
                  className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-sm"
                >
                  {keyword}
                  <button
                    onClick={() => removeFilterKeyword(keyword)}
                    className="hover:text-yellow-200"
                  >
                    <XCircle size={14} />
                  </button>
                </span>
              ))}
              {filterKeywords.length === 0 && (
                <span className="text-magic-text-secondary text-sm">暂无过滤关键词</span>
              )}
            </div>
          </div>

          {/* 黑名单 */}
          <div className="bg-magic-card rounded-lg border border-magic-border p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-magic-text font-medium mb-3 flex items-center gap-2">
              <XCircle size={18} className="text-red-400" />
              黑名单用户
            </h3>
            <p className="text-magic-text-secondary text-sm mb-3">
              黑名单用户的弹幕将被忽略，不会进入同步队列
            </p>

            <div className="flex-1 overflow-y-auto">
              {blacklist.length === 0 ? (
                <p className="text-magic-text-secondary text-sm text-center py-4">暂无黑名单用户</p>
              ) : (
                <div className="space-y-2">
                  {blacklist.map((item) => (
                    <div 
                      key={item.user_id}
                      className="flex items-center justify-between p-2 bg-magic-bg rounded-lg"
                    >
                      <div>
                        <span className="text-magic-text text-sm">{item.username}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                          item.is_permanent 
                            ? 'bg-red-500/20 text-red-400' 
                            : 'bg-orange-500/20 text-orange-400'
                        }`}>
                          {item.is_permanent ? '永久' : '流动'}
                        </span>
                      </div>
                      <button
                        onClick={() => removeFromBlacklist(item.user_id)}
                        className="text-magic-text-secondary hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧：弹幕队列 + 水军状态 */}
        <div className="flex flex-col gap-4">
          {/* 弹幕队列 */}
          <div className="bg-magic-card rounded-lg border border-magic-border p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-magic-text font-medium mb-3 flex items-center gap-2">
              <MessageCircle size={18} className="text-blue-400" />
              待分发弹幕队列
            </h3>

            <div className="flex-1 overflow-y-auto">
              {barrageQueue.length === 0 ? (
                <p className="text-magic-text-secondary text-sm text-center py-4">暂无待分发弹幕</p>
              ) : (
                <div className="space-y-2">
                  {barrageQueue.slice(0, 20).map((barrage, index) => (
                    <div 
                      key={index}
                      className="p-2 bg-magic-bg rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-magic-primary text-xs">{barrage.platform}</span>
                        <span className="text-magic-text-secondary text-xs">{barrage.time}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-magic-text-secondary text-sm">{barrage.username}:</span>
                        <span className="text-magic-text text-sm flex-1">{barrage.content}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 水军状态 */}
          <div className="bg-magic-card rounded-lg border border-magic-border p-4 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-magic-text font-medium mb-3 flex items-center gap-2">
              <Users size={18} className="text-green-400" />
              水军账号状态
            </h3>

            <div className="flex-1 overflow-y-auto">
              {soldierInstances.length === 0 ? (
                <p className="text-magic-text-secondary text-sm text-center py-4">
                  暂无水军实例，请先在"浏览器实例"中创建水军类型的实例
                </p>
              ) : (
                <div className="space-y-2">
                  {soldierInstances.map((instance) => (
                    <div 
                      key={instance.id}
                      className="flex items-center justify-between p-2 bg-magic-bg rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          instance.status === 'online' ? 'bg-green-400' : 'bg-gray-400'
                        }`} />
                        <div>
                          <span className="text-magic-text text-sm">{instance.name}</span>
                          {instance.soldier_nickname && (
                            <span className="text-magic-text-secondary text-xs ml-2">
                              ({instance.soldier_nickname})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-magic-text-secondary text-xs">{instance.platform}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          instance.status === 'online' 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {instance.status === 'online' ? '在线' : '离线'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarrageSyncPage;
