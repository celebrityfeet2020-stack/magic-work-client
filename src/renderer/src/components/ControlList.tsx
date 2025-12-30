import React, { useEffect, useState } from 'react'
import { getControls, createControl, deleteControl, ControlInstance, CreateControlRequest } from '../api_client'

interface ControlListProps {
  onLog: (level: 'info' | 'warn' | 'error' | 'success', message: string) => void
}

export const ControlList: React.FC<ControlListProps> = ({ onLog }) => {
  const [instances, setInstances] = useState<ControlInstance[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newControl, setNewControl] = useState<CreateControlRequest>({
    name: '',
    fingerprint_id: '',
    room_url: '',
    role_tag: '主播后台'
  })

  // 获取智控实例列表
  const fetchInstances = async () => {
    setLoading(true)
    try {
      const data = await getControls()
      setInstances(data)
      onLog('info', `已加载 ${data.length} 个智控实例`)
    } catch (err: any) {
      onLog('error', `获取实例列表失败: ${err.message}`)
      // 使用模拟数据
      setInstances([
        {
          id: 'demo-001',
          name: '演示直播间',
          status: 'offline',
          fingerprint_id: 'FP_001',
          room_url: 'https://live.example.com/room/001',
          role_tag: '主播后台',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstances()
  }, [])

  // 创建新智控
  const handleCreate = async () => {
    if (!newControl.name || !newControl.room_url) {
      onLog('warn', '请填写名称和直播间链接')
      return
    }

    try {
      await createControl(newControl)
      onLog('success', `智控实例 "${newControl.name}" 创建成功`)
      setShowCreate(false)
      setNewControl({ name: '', fingerprint_id: '', room_url: '', role_tag: '主播后台' })
      fetchInstances()
    } catch (err: any) {
      onLog('error', `创建失败: ${err.message}`)
    }
  }

  // 删除智控
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除 "${name}" 吗？`)) return

    try {
      await deleteControl(id)
      onLog('success', `智控实例 "${name}" 已删除`)
      fetchInstances()
    } catch (err: any) {
      onLog('error', `删除失败: ${err.message}`)
    }
  }

  // 启动智控
  const handleStart = async (instance: ControlInstance) => {
    onLog('info', `正在启动智控: ${instance.name}`)

    try {
      // 启动指纹浏览器
      const result = await window.api.launchBrowser({
        userDataDir: `C:\\MagicWork\\Profiles\\${instance.fingerprint_id || instance.id}`,
        proxy: 'direct'
      })

      if (result.success) {
        onLog('success', `浏览器已启动 (PID: ${result.pid})`)

        // 导航到直播间
        if (instance.room_url) {
          await window.api.navigateTo(instance.room_url)
          onLog('info', `已打开直播间: ${instance.room_url}`)
        }

        // 启动ASR
        await window.api.startASR(instance.id)
        onLog('success', `ASR已启动，智控 "${instance.name}" 运行中`)
      } else {
        onLog('error', `启动失败: ${result.error}`)
      }
    } catch (err: any) {
      onLog('error', `启动异常: ${err.message}`)
    }
  }

  // 获取状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'online':
        return { color: '#22c55e', text: '在线' }
      case 'working':
        return { color: '#3b82f6', text: '工作中' }
      default:
        return { color: '#6b7280', text: '离线' }
    }
  }

  return (
    <div className="control-list">
      <div className="panel-header">
        <h2>智控实例</h2>
        <div className="toolbar">
          <button onClick={fetchInstances} disabled={loading} className="btn small">
            {loading ? '加载中...' : '🔄 刷新'}
          </button>
          <button onClick={() => setShowCreate(true)} className="btn small primary">
            ➕ 新建
          </button>
        </div>
      </div>

      {/* 创建弹窗 */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>新建智控实例</h3>
            <div className="form-group">
              <label>名称</label>
              <input
                type="text"
                placeholder="例如：抖音直播间1"
                value={newControl.name}
                onChange={(e) => setNewControl({ ...newControl, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>指纹ID（可选）</label>
              <input
                type="text"
                placeholder="例如：FP_001"
                value={newControl.fingerprint_id}
                onChange={(e) => setNewControl({ ...newControl, fingerprint_id: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>直播间链接</label>
              <input
                type="text"
                placeholder="https://live.example.com/room/xxx"
                value={newControl.room_url}
                onChange={(e) => setNewControl({ ...newControl, room_url: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>角色标签</label>
              <select
                value={newControl.role_tag}
                onChange={(e) => setNewControl({ ...newControl, role_tag: e.target.value })}
              >
                <option value="主播后台">主播后台</option>
                <option value="场控后台">场控后台</option>
                <option value="运营后台">运营后台</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={handleCreate} className="btn primary">
                创建
              </button>
              <button onClick={() => setShowCreate(false)} className="btn secondary">
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 实例列表 */}
      <div className="instances-grid">
        {instances.length === 0 ? (
          <div className="empty-state">
            <p>暂无智控实例</p>
            <button onClick={() => setShowCreate(true)} className="btn primary">
              创建第一个智控
            </button>
          </div>
        ) : (
          instances.map((inst) => {
            const statusStyle = getStatusStyle(inst.status)
            return (
              <div key={inst.id} className={`instance-card ${inst.status}`}>
                <div className="instance-header">
                  <h4>{inst.name}</h4>
                  <span className="status-badge" style={{ backgroundColor: statusStyle.color }}>
                    {statusStyle.text}
                  </span>
                </div>
                <div className="instance-info">
                  <p>
                    <strong>角色：</strong>
                    {inst.role_tag || '未设置'}
                  </p>
                  <p>
                    <strong>指纹：</strong>
                    {inst.fingerprint_id || '默认'}
                  </p>
                  <p className="room-url" title={inst.room_url}>
                    <strong>直播间：</strong>
                    {inst.room_url ? inst.room_url.substring(0, 30) + '...' : '未设置'}
                  </p>
                </div>
                <div className="instance-actions">
                  <button
                    onClick={() => handleStart(inst)}
                    disabled={inst.status !== 'offline'}
                    className="btn small primary"
                  >
                    ▶ 启动
                  </button>
                  <button className="btn small">⚙ 配置</button>
                  <button
                    onClick={() => handleDelete(inst.id, inst.name)}
                    className="btn small danger"
                  >
                    🗑
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
