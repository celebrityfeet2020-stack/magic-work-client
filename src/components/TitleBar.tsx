/**
 * 魔作智控 2.0 - 自定义标题栏
 * 
 * v2.1.5 更新：
 * - 删除插件状态显示（已不需要）
 */

import React from 'react';
import { Minus, Square, X, Mic, MicOff } from 'lucide-react';
import { useStore } from '../store/useStore';

const TitleBar: React.FC = () => {
  const { isConnected, asrStatus } = useStore();

  const handleMinimize = () => {
    window.electronAPI?.window.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI?.window.maximize();
  };

  const handleClose = () => {
    window.electronAPI?.window.close();
  };

  return (
    <div className="h-10 bg-magic-card border-b border-magic-border flex items-center justify-between px-4 drag-region">
      {/* 左侧：Logo和标题 */}
      <div className="flex items-center gap-3 no-drag">
        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center">
          <span className="text-white text-xs font-bold">魔</span>
        </div>
        <span className="text-magic-text font-semibold">魔作智控</span>
        <span className="text-magic-text-secondary text-sm">v2.1.9</span>
      </div>

      {/* 中间：状态指示器 */}
      <div className="flex items-center gap-4 no-drag">
        {/* 语音引擎状态 */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
          asrStatus === 'connected' 
            ? 'bg-green-500/20 text-green-400' 
            : asrStatus === 'connecting'
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-red-500/20 text-red-400'
        }`}>
          {asrStatus === 'connected' ? <Mic size={12} /> : <MicOff size={12} />}
          <span>语音引擎: {
            asrStatus === 'connected' ? '已连接' : 
            asrStatus === 'connecting' ? '连接中' : '未连接'
          }</span>
        </div>

        {/* 后端连接状态 */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs ${
          isConnected 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span>{isConnected ? '已连接' : '未连接'}</span>
        </div>
      </div>

      {/* 右侧：窗口控制按钮 */}
      <div className="flex items-center gap-1 no-drag">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center hover:bg-magic-border rounded transition-colors"
        >
          <Minus size={14} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center hover:bg-magic-border rounded transition-colors"
        >
          <Square size={12} />
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center hover:bg-red-500 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
