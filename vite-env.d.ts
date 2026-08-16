/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly APP_LANGUAGE?: string;
  readonly JELLYFIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  env?: Record<string, string>;
}
