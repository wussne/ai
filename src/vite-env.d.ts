/// <reference types="vite/client" />

interface Window {
  __APP_CONFIG__?: {
    apiBaseUrl?: string;
  };
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}
