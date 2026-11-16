import type { Component } from "vue";

/** 左侧示例目录项。component 挂到方法面板里，点击后切换 */
export interface SdkExample {
  id: string;
  group: string;
  name: string;
  component: Component;
}
