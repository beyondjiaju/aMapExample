import type { SdkExample } from "./types";
import HtmlTag from "./html-tag/index.vue";
import HeatMap from "./heat-map/index.vue";
import GridLevel from "./grid-level/index.vue";
import AnimationPath from "./animation-path/index.vue";
import Measure from "./measure/index.vue";

/** 左侧目录按分组展示，点击后切换对应面板组件 */
export const examples: SdkExample[] = [
  { id: "measure", group: "测量绘制", name: "MeasureHandler", component: Measure },
  { id: "html-tag", group: "标注热力", name: "HtmlTag", component: HtmlTag },
  { id: "heat-map", group: "标注热力", name: "HeatMap2D", component: HeatMap },
  { id: "grid-level", group: "网格", name: "GridLevelLines", component: GridLevel },
  { id: "animation-path", group: "动态播放", name: "AnimationPath", component: AnimationPath, panelWidth: 500 }  
];

export function findExample(id: string) {
  return examples.find(item => item.id === id);
}

export function exampleGroups() {
  const groups: { name: string; items: SdkExample[] }[] = [];
  examples.forEach(item => {
    let group = groups.find(entry => entry.name === item.group);
    if (!group) {
      group = { name: item.group, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  });
  return groups;
}
