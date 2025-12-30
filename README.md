# 魔作智控 (Magic Work Smart Control) 2.0 客户端

基于 Electron + React + TypeScript 的直播智能控制客户端。

## 功能特性

- **F1/F2 语音智控**：ASR语音识别 → 关键词触发 → RPA自动化执行
- **F3 智能回复**：硬屏蔽 → AI语义匹配话术本 → 强制沉默
- **F4 跨平台同步**：多平台直播间同步控制
- **指纹浏览器**：基于Puppeteer的浏览器自动化

## 技术栈

- **框架**：Electron 28 + electron-vite
- **前端**：React 18 + TypeScript 5
- **浏览器自动化**：Puppeteer-core
- **通信**：WebSocket (ASR) + HTTP (API)

## 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0
- Windows 10/11 (推荐)

## 快速开始

### 1. 安装依赖

```bash
npm install
# 或
pnpm install
```

### 2. 配置环境变量

复制 `.env` 文件并根据实际环境修改：

```bash
cp .env .env.local
```

主要配置项：
- `VITE_API_BASE_URL`: 后端API地址 (默认: http://212.64.83.18:17821)
- `VITE_ASR_WS_URL`: ASR WebSocket地址 (默认: ws://10.98.98.5:10095)
- `VITE_RPA_BASE_URL`: 本地RPA服务地址 (默认: http://127.0.0.1:17821)

### 3. 开发模式

```bash
npm run dev
```

### 4. 构建生产版本

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 目录结构

```
magic_work_client/
├── src/
│   ├── main/           # Electron主进程
│   │   ├── index.ts    # 主进程入口
│   │   ├── asr_client.ts   # ASR客户端
│   │   └── rpa_engine.ts   # RPA引擎
│   ├── preload/        # 预加载脚本
│   │   └── index.ts
│   └── renderer/       # 渲染进程（React）
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── App.css
│           ├── api_client.ts
│           └── components/
├── .env                # 环境变量
├── electron-vite.config.ts
├── package.json
└── tsconfig.json
```

## 服务依赖

| 服务 | 地址 | 说明 |
|------|------|------|
| 后端API | http://212.64.83.18:17821 | vps9云端中控 |
| ASR服务 | ws://10.98.98.5:10095 | 3J15 SenseVoice |
| vLLM | http://10.98.98.5:10098 | 3J15 Qwen3-1.7B |
| RPA工具 | http://127.0.0.1:17821 | 本地RPA服务 |

## 使用说明

1. **启动客户端**：运行可执行文件或 `npm run dev`
2. **创建智控实例**：点击"新建"，填写名称、直播间链接
3. **启动智控**：点击实例卡片上的"启动"按钮
4. **语音控制**：说出触发词（如"开价"、"讲解"）触发RPA动作

## 开发者信息

- 版本：2.0.0
- 更新日期：2025-12-30
- 项目：魔作智控全链路开发

## License

Private - All Rights Reserved
