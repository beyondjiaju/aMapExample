/// <reference types="vite/client" />

interface Window {
  CESIUM_BASE_URL: string;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
