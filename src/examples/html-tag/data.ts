import { randomPoint } from "../area";

/** 初始化时随机生成的标注数量 */
export const TAG_COUNT = 200;

export interface TagPoint {
  id: string;
  lon: number;
  lat: number;
  html: string;
}

/** 在默认矩形范围内随机生成标注点 */
export function createTagPoints(count = TAG_COUNT): TagPoint[] {
  const list: TagPoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const point = randomPoint();
    list.push({
      id: `tag-${index + 1}`,
      lon: point.lon,
      lat: point.lat,
      html: `<div class="demo-tag">${index + 1}</div>`
    });
  }
  return list;
}
