/**
 * 魔作智控 2.0 - 系统设置页面
 */

import React, { useState } from 'react';
import { Settings, Server, Volume2, Shield, Save, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';

const SettingsPage: React.FC = () => {
  const { addLog } = useStore();
  
  // 后端设置
  const [backendUrl, setBackendUrl] = useState('http://212.64.83.18:17823');
  const [asrUrl, setAsrUrl] = useState('ws://212.64.83.18:17822/ws/asr');
  
  // ASR设置
  const [asrEnabled, setAsrEnabled] = useState(true);
  const [asrLanguage, setAsrLanguage] = useState('zh');
  const [asrSampleRate, setAsrSampleRate] = useState(16000);
  
  // 安全设置
  const [adminToken, setAdminToken] = useState('');
  const [autoEndSession, setAutoEndSession] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(4);

  const handleSave = () => {
    // 保存设置到localStorage
    localStorage.setItem('settings', JSON.stringify({
      backendUrl,
      asrUrl,
      asrEnabled,
      asrLanguage,
      asrSampleRate,
      adminToken,
      autoEndSession,
      sessionTimeout,
    }));
    
    addLog({ type: 'success', source: '设置', message: '系统设置已保存' });
  };

  const handleReset = () => {
    setBackendUrl('http://212.64.83.18:17823');
    setAsrUrl('ws://212.64.83.18:17822/ws/asr');
    setAsrEnabled(true);
    setAsrLanguage('zh');
    setAsrSampleRate(16000);
    setAdminToken('');
    setAutoEndSession(true);
    setSessionTimeout(4);
    
    addLog({ type: 'info', source: '设置', message: '已恢复默认设置' });
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="text-magic-primary" size={28} />
          <h1 className="text-2xl font-bold">系统设置</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-magic-card border border-magic-border rounded-lg hover:bg-magic-border transition-colors"
          >
            <RefreshCw size={18} />
            <span>恢复默认</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-magic-primary text-white rounded-lg hover:bg-magic-primary/80 transition-colors"
          >
            <Save size={18} />
            <span>保存设置</span>
          </button>
        </div>
      </div>

      {/* 后端服务设置 */}
      <div className="bg-magic-card border border-magic-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Server className="text-magic-primary" size={20} />
          <h2 className="text-lg font-semibold">后端服务</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-magic-text-secondary mb-2">
              后端API地址
            </label>
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              className="w-full px-4 py-2 bg-magic-bg border border-magic-border rounded-lg focus:outline-none focus:border-magic-primary"
              placeholder="http://ip:port"
            />
          </div>
          <div>
            <label className="block text-sm text-magic-text-secondary mb-2">
              ASR服务地址
            </label>
            <input
              type="text"
              value={asrUrl}
              onChange={(e) => setAsrUrl(e.target.value)}
              className="w-full px-4 py-2 bg-magic-bg border border-magic-border rounded-lg focus:outline-none focus:border-magic-primary"
              placeholder="ws://ip:port/ws/asr"
            />
          </div>
        </div>
      </div>

      {/* 语音识别设置 */}
      <div className="bg-magic-card border border-magic-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="text-magic-primary" size={20} />
          <h2 className="text-lg font-semibold">语音识别 (ASR)</h2>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">启用语音识别</div>
              <div className="text-sm text-magic-text-secondary">
                开启后将自动捕获直播画面的音频进行实时转写
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={asrEnabled}
                onChange={(e) => setAsrEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-magic-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-magic-primary"></div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-magic-text-secondary mb-2">
                识别语言
              </label>
              <select
                value={asrLanguage}
                onChange={(e) => setAsrLanguage(e.target.value)}
                className="w-full px-4 py-2 bg-magic-bg border border-magic-border rounded-lg focus:outline-none focus:border-magic-primary"
              >
                <option value="zh">中文</option>
                <option value="en">英文</option>
                <option value="auto">自动检测</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-magic-text-secondary mb-2">
                采样率 (Hz)
              </label>
              <select
                value={asrSampleRate}
                onChange={(e) => setAsrSampleRate(Number(e.target.value))}
                className="w-full px-4 py-2 bg-magic-bg border border-magic-border rounded-lg focus:outline-none focus:border-magic-primary"
              >
                <option value={16000}>16000</option>
                <option value={44100}>44100</option>
                <option value={48000}>48000</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 安全设置 */}
      <div className="bg-magic-card border border-magic-border rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="text-magic-primary" size={20} />
          <h2 className="text-lg font-semibold">安全设置</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-magic-text-secondary mb-2">
              超管Token
            </label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="w-full px-4 py-2 bg-magic-bg border border-magic-border rounded-lg focus:outline-none focus:border-magic-primary"
              placeholder="输入超管Token以访问高级功能"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">自动结束场次</div>
              <div className="text-sm text-magic-text-secondary">
                超过指定时间无操作后自动清理临时数据
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoEndSession}
                onChange={(e) => setAutoEndSession(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-magic-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-magic-primary"></div>
            </label>
          </div>

          {autoEndSession && (
            <div>
              <label className="block text-sm text-magic-text-secondary mb-2">
                场次超时时间（小时）
              </label>
              <input
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                min={1}
                max={24}
                className="w-32 px-4 py-2 bg-magic-bg border border-magic-border rounded-lg focus:outline-none focus:border-magic-primary"
              />
            </div>
          )}
        </div>
      </div>

      {/* 关于 */}
      <div className="bg-magic-card border border-magic-border rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">关于</h2>
        <div className="space-y-2 text-sm text-magic-text-secondary">
          <p><span className="text-magic-text">版本：</span>v2.0.0</p>
          <p><span className="text-magic-text">Electron：</span>28.3.3</p>
          <p><span className="text-magic-text">Chrome：</span>120.0.6099.291</p>
          <p><span className="text-magic-text">Node.js：</span>18.18.2</p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
