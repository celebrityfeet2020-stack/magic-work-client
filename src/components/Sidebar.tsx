/**
 * 魔作智控 2.0 - 侧边栏导航
 * 
 * v2.1.7 更新：
 * - 隐藏系统设置页面（普通用户不需要）
 */

import React from 'react';
import { 
  LayoutDashboard, 
  Monitor, 
  Zap, 
  MessageSquare, 
  Radio,
  LogOut
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface NavItem {
  id: 'dashboard' | 'instances' | 'control' | 'reply' | 'barrage' | 'settings';
  label: string;
  icon: React.ReactNode;
}

// 导航项配置（已移除系统设置）
const navItems: NavItem[] = [
  { id: 'dashboard', label: '数据大屏', icon: <LayoutDashboard size={20} /> },
  { id: 'instances', label: '浏览器实例', icon: <Monitor size={20} /> },
  { id: 'control', label: '智能控制', icon: <Zap size={20} /> },
  { id: 'reply', label: '智能回复', icon: <MessageSquare size={20} /> },
  { id: 'barrage', label: '弹幕同步', icon: <Radio size={20} /> },
  // 系统设置已隐藏，普通用户不需要
  // { id: 'settings', label: '系统设置', icon: <Settings size={20} /> },
];

const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage } = useStore();

  return (
    <aside className="w-56 bg-magic-card border-r border-magic-border flex flex-col">
      {/* 导航菜单 */}
      <nav className="flex-1 py-4">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
              currentPage === item.id
                ? 'bg-magic-primary/20 text-magic-primary border-r-2 border-magic-primary'
                : 'text-magic-text-secondary hover:bg-magic-border/50 hover:text-magic-text'
            }`}
          >
            {item.icon}
            <span className="text-sm font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 底部：退出按钮 */}
      <div className="p-4 border-t border-magic-border">
        <button
          onClick={() => window.electronAPI?.window.close()}
          className="w-full flex items-center gap-3 px-4 py-2 text-magic-text-secondary hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
        >
          <LogOut size={20} />
          <span className="text-sm">退出程序</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
