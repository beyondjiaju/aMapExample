import type { SdkExample } from "./types";
import { engineExamples } from "./engine";
import { graphicExamples } from "./graphic";
import { imageryExamples } from "./imagery";
import { interactExamples } from "./interact";
import { materialExamples } from "./materials";
import { queryExamples } from "./query";

export const examples: SdkExample[] = [
  ...interactExamples,
  ...graphicExamples,
  ...materialExamples,
  ...imageryExamples,
  ...queryExamples,
  ...engineExamples
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
