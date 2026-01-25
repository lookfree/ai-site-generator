/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLY_SERVER_URL: string;
  // 其他环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
