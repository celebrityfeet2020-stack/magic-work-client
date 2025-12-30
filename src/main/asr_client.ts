import WebSocket from 'ws'

interface ASRResult {
  text: string
  is_final: boolean
  timestamp?: number
}

export class ASRClient {
  private ws: WebSocket | null = null
  private url: string
  private onResult: (text: string) => void
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 2000
  private isConnected: boolean = false
  private buffer: string = ''

  constructor(url: string, onResult: (text: string) => void) {
    this.url = url
    this.onResult = onResult
  }

  connect(): void {
    if (this.isConnected) {
      console.log('[ASR] Already connected')
      return
    }

    console.log('[ASR] Connecting to:', this.url)
    
    try {
      this.ws = new WebSocket(this.url)

      this.ws.on('open', () => {
        console.log('[ASR] WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        
        // 发送初始化握手消息（SenseVoice格式）
        const initMessage = {
          mode: 'offline',  // 离线模式，一次性返回完整结果
          chunk_size: [5, 10, 5],
          wav_name: 'mic_stream',
          is_speaking: true,
          hotwords: '',
          itn: false  // 不需要标点符号
        }
        this.ws?.send(JSON.stringify(initMessage))
      })

      this.ws.on('message', (data: Buffer) => {
        try {
          const message = data.toString()
          console.log('[ASR] Received:', message)
          
          const result = JSON.parse(message) as ASRResult
          
          if (result.text) {
            // 累积文本到缓冲区
            this.buffer += result.text
            
            // 如果是最终结果或缓冲区达到50字，触发回调
            if (result.is_final || this.buffer.length >= 50) {
              this.onResult(this.buffer.trim())
              this.buffer = ''
            }
          }
        } catch (error) {
          console.error('[ASR] Parse error:', error)
        }
      })

      this.ws.on('error', (error: Error) => {
        console.error('[ASR] WebSocket error:', error.message)
        this.isConnected = false
      })

      this.ws.on('close', (code: number, reason: Buffer) => {
        console.log('[ASR] WebSocket closed:', code, reason.toString())
        this.isConnected = false
        
        // 尝试重连
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++
          console.log(`[ASR] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
          setTimeout(() => this.connect(), this.reconnectDelay)
        }
      })
    } catch (error) {
      console.error('[ASR] Connection failed:', error)
    }
  }

  disconnect(): void {
    console.log('[ASR] Disconnecting...')
    this.reconnectAttempts = this.maxReconnectAttempts // 阻止重连
    
    if (this.ws) {
      // 发送结束消息
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ is_speaking: false }))
      }
      this.ws.close()
      this.ws = null
    }
    
    this.isConnected = false
    this.buffer = ''
  }

  sendAudioChunk(chunk: Buffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(chunk)
    } else {
      console.warn('[ASR] Cannot send audio: WebSocket not connected')
    }
  }

  // 发送音频文件进行识别（HTTP方式，适用于SenseVoice）
  async transcribeFile(audioBuffer: Buffer): Promise<string> {
    const httpUrl = this.url.replace('ws://', 'http://').replace('wss://', 'https://') + '/transcribe'
    
    console.log('[ASR] Transcribing file via HTTP:', httpUrl)
    
    try {
      const formData = new FormData()
      const blob = new Blob([audioBuffer], { type: 'audio/wav' })
      formData.append('file', blob, 'audio.wav')
      
      const response = await fetch(httpUrl, {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      return result.text || ''
    } catch (error) {
      console.error('[ASR] Transcribe failed:', error)
      throw error
    }
  }

  isReady(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }
}
