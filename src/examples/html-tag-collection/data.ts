/** 标签集合的测试中心，取北京附近便于二三维对照 */
export const TAG_CENTER: [number, number] = [116.397, 39.909];

export interface TagSeed {
  id: string;
  html: string;
  /** 相对中心点的经度偏移 */
  lonOffset: number;
}

/** 集合初始化时放入的两个测试标签 */
export function tagSeeds(): TagSeed[] {
  return [0, 1].map(index => ({
    id: `tag-${index + 1}`,
    html: `<div class="demo-tag">标签 ${index + 1}</div>`,
    lonOffset: index * 0.02
  }));
}
