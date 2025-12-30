/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_ASR_WS_URL: string
  readonly VITE_ASR_HTTP_URL: string
  readonly VITE_RPA_BASE_URL: string
  readonly VITE_RPA_AUTH_TOKEN: string
  readonly VITE_VLLM_BASE_URL: string
  readonly VITE_VLLM_API_KEY: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEBUG_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
