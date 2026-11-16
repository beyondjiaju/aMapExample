import type { SdkExample } from "./types";
import HtmlTag from "./html-tag/index.vue";
import HtmlTagCollection from "./html-tag-collection/index.vue";
import HeatMap from "./heat-map/index.vue";

/** 左侧目录只挂「标注热力」，点击后切换对应面板组件 */
export const examples: SdkExample[] = [
  { id: "html-tag", group: "标注热力", name: "HtmlTag", component: HtmlTag },
  { id: "html-tag-collection", group: "标注热力", name: "HtmlTagCollection", component: HtmlTagCollection },
  { id: "heat-map", group: "标注热力", name: "HeatMap2D", component: HeatMap }
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
