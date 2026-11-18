import { randomPoint, showArea } from "../area";
/** 热力图 add 需要的样式参数：半径、透明度、图例数值和颜色，以及展示范围 */
export const HEAT_STYLE = {
  radius: 90,
  maxOpacity: 0.8,
  minOpacity: 0,
  values: [50, 60, 90, 100],
  colors: ["#1677ff", "yellow", "orange", "red"],
  // 展示范围，只绘制该多边形内的热力
  showArea
};

/** 在矩形范围内随机生成的热力点数量 */
export const HEAT_COUNT = 2000;

/** 在默认矩形范围内生成热力点，value 落在图例 values 的最小到最大之间 */
export function heatData(style = HEAT_STYLE, count = HEAT_COUNT) {
  const list: { x: number; y: number; value: number }[] = [];
  for (let index = 0; index < count/2 + count/3; index += 1) {
    const point = randomPoint();
    list.push({
      x: point.lon,
      y: point.lat,
      value: Math.random() * (10)
    });
  }
  for (let index = 0; index < count/2 - count/3; index += 1) {
    const point = randomPoint();
    list.push({
      x: point.lon,
      y: point.lat,
      value: Math.random() * (105)
    });
  }
  return list;
}
