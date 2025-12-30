import React, { useState, useEffect, useCallback } from 'react'
import './App.css'
import { ControlList } from './components/ControlList'
import { checkHealth } from './api_client'

interface LogEntry {
  time: string
  level: 'info' | 'warn' | 'error' | 'success'
  message: string
}

function App(): JSX.Element {
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [browserPid, setBrowserPid] = useState<number | null>(null)
  const [asrActive, setAsrActive] = useState(false)

  // 添加日志
  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    setLogs(prev => [...prev.slice(-99), { time, level, message }])
  }, [])

  // 检查后端健康状态
  useEffect(() => {
    const checkBackend = async () => {
      try {
        await checkHealth()
        setStatus('online')
        addLog('success', '后端服务连接成功')
      } catch (error) {
        setStatus('offline')
        addLog('error', '后端服务连接失败，请检查网络')
      }
    }

    checkBackend()
    const interval = setInterval(checkBackend, 30000) // 每30秒检查一次
    return () => clearInterval(interval)
  }, [addLog])

  // 监听ASR结果
  useEffect(() => {
    const unsubscribe = window.api.onASRResult((data) => {
      addLog('info', `[ASR] ${data.text}`)
      // TODO: 根据关键词触发RPA动作
    })
    return unsubscribe
  }, [addLog])

  // 启动指纹浏览器
  const handleLaunchBrowser = async () => {
    addLog('info', '正在启动指纹浏览器...')
    
    try {
      const result = await window.api.launchBrowser({
        userDataDir: 'C:\\MagicWork\\Profiles\\Profile_001',
        proxy: 'direct'
      })

      if (result.success) {
        setBrowserPid(result.pid)
        addLog('success', `浏览器启动成功 (PID: ${result.pid})`)
      } else {
        addLog('error', `浏览器启动失败: ${result.error}`)
      }
    } catch (err: any) {
      addLog('error', `浏览器启动异常: ${err.message}`)
    }
  }

  // 关闭浏览器
  const handleCloseBrowser = async () => {
    try {
      await window.api.closeBrowser()
      setBrowserPid(null)
      addLog('info', '浏览器已关闭')
    } catch (err: any) {
      addLog('error', `关闭浏览器失败: ${err.message}`)
    }
  }

  // 启动/停止ASR
  const handleToggleASR = async () => {
    if (asrActive) {
      await window.api.stopASR()
      setAsrActive(false)
      addLog('info', 'ASR语音识别已停止')
    } else {
      const result = await window.api.startASR('default')
      if (result.success) {
        setAsrActive(true)
        addLog('success', 'ASR语音识别已启动')
      } else {
        addLog('error', `ASR启动失败: ${result.error}`)
      }
    }
  }

  // 测试RPA
  const handleTestRPA = async (action: string, keys: string[]) => {
    addLog('info', `执行RPA动作: ${action}`)
    
    try {
      const result = await window.api.runRPA({
        action: 'hotkey',
        params: { keys }
      })
      
      if (result.success) {
        addLog('success', `RPA执行成功: ${action}`)
      } else {
        addLog('error', `RPA执行失败: ${result.error}`)
      }
    } catch (err: any) {
      addLog('error', `RPA异常: ${err.message}`)
    }
  }

  return (
    <div className="app">
      {/* 顶部状态栏 */}
      <header className="header">
        <div className="logo">
          <h1>魔作智控</h1>
          <span className="version">v2.0</span>
        </div>
        <div className="status-bar">
          <span className={`status-indicator ${status}`}>
            {status === 'online' ? '● 已连接' : status === 'connecting' ? '◐ 连接中' : '○ 离线'}
          </span>
          {browserPid && <span className="browser-status">浏览器 PID: {browserPid}</span>}
          {asrActive && <span className="asr-status">🎤 ASR运行中</span>}
        </div>
      </header>

      {/* 主内容区 */}
      <main className="main-content">
        {/* 左侧：智控实例列表 */}
        <section className="panel instances-panel">
          <ControlList onLog={addLog} />
        </section>

        {/* 右侧：控制面板和日志 */}
        <aside className="panel control-panel">
          {/* 快捷操作 */}
          <div className="card">
            <h3>快捷操作</h3>
            <div className="button-group">
              <button 
                onClick={handleLaunchBrowser} 
                disabled={browserPid !== null}
                className="btn primary"
              >
                🌐 启动浏览器
              </button>
              <button 
                onClick={handleCloseBrowser} 
                disabled={browserPid === null}
                className="btn secondary"
              >
                ✕ 关闭浏览器
              </button>
              <button 
                onClick={handleToggleASR}
                className={`btn ${asrActive ? 'danger' : 'success'}`}
              >
                {asrActive ? '⏹ 停止ASR' : '🎤 启动ASR'}
              </button>
            </div>
          </div>

          {/* RPA测试 */}
          <div className="card">
            <h3>RPA测试</h3>
            <div className="button-group">
              <button onClick={() => handleTestRPA('开价', ['ctrl', 'shift', 'k'])} className="btn">
                💰 开价
              </button>
              <button onClick={() => handleTestRPA('讲解', ['ctrl', 'shift', 'j'])} className="btn">
                📢 讲解
              </button>
              <button onClick={() => handleTestRPA('预热', ['ctrl', 'shift', 'y'])} className="btn">
                🔥 预热
              </button>
              <button onClick={() => handleTestRPA('Win+E', ['win', 'e'])} className="btn">
                📁 Win+E
              </button>
            </div>
          </div>

          {/* 系统日志 */}
          <div className="card logs-card">
            <h3>系统日志</h3>
            <div className="log-window">
              {logs.length === 0 ? (
                <div className="log-empty">暂无日志</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`log-entry ${log.level}`}>
                    <span className="log-time">[{log.time}]</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>
      </main>

      {/* 底部信息栏 */}
      <footer className="footer">
        <span>Electron: {window.api.versions.electron()}</span>
        <span>Chrome: {window.api.versions.chrome()}</span>
        <span>Node: {window.api.versions.node()}</span>
      </footer>
    </div>
  )
}

export default App
