/** 进入热力示例时使用的默认样式 */
export const HEAT_STYLE = {
  radius: 26,
  maxOpacity: 0.85,
  minOpacity: 0.1,
  values: [0, 50, 100],
  colors: ["#1677ff", "#36cfc9", "#ff7875"]
};

/** 网格测试热力点，覆盖北京附近一小块范围 */
export function heatData() {
  const list: { x: number; y: number; value: number }[] = [];
  for (let i = 0; i < 36; i += 1) {
    list.push({
      x: 116.32 + (i % 6) * 0.03,
      y: 39.84 + Math.floor(i / 6) * 0.02,
      value: 20 + ((i * 17) % 80)
    });
  }
  return list;
}
