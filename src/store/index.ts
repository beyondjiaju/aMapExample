import { createPinia } from "pinia";

/** 显式传入 pinia 实例，供 SDK 在组件外读取地图模式 */
export const store = createPinia();
