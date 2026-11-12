/**
 * 根据经纬度坐标集合计算中心点
 * - 2 个点：返回两点连线中点
 * - ≥3 个点：返回面内中心点（非包围矩形中心；凹多边形时保证点在面内）
 */

const isCoordinate = value =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number";

/**
 * 将输入统一规整为经纬度坐标集合 [[lon, lat], ...]
 * @param {Array} coordinates 单个 [lon, lat] 或集合 [[lon, lat], ...]（可含海拔第三位）
 */
const normalizeCoordinates = coordinates => {
  if (isCoordinate(coordinates)) {
    return [coordinates];
  }
  if (Array.isArray(coordinates)) {
    return coordinates.filter(isCoordinate);
  }
  return [];
};

/** 射线法判断点是否在多边形内（含边界） */
const pointInPolygon = (point, ring) => {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    // 点落在边上视为在面内
    const onEdge =
      Math.min(yi, yj) <= y &&
      y <= Math.max(yi, yj) &&
      Math.min(xi, xj) <= x &&
      x <= Math.max(xi, xj) &&
      (yj - yi) * (x - xi) === (y - yi) * (xj - xi);
    if (onEdge) return true;
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * 鞋带公式计算多边形面积质心
 * @returns {[number, number] | null}
 */
const getAreaCentroid = ring => {
  let area = 0;
  let cx = 0;
  let cy = 0;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  area *= 0.5;
  if (Math.abs(area) < Number.EPSILON) return null;
  cx /= 6 * area;
  cy /= 6 * area;
  return [cx, cy];
};

/** 三角形面积（绝对值） */
const triangleArea = (a, b, c) =>
  Math.abs(
    (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1])) / 2
  );

/**
 * 凹多边形质心可能落在面外：取面积最大且重心在面内的三角形重心作为面内中心点
 */
const getInteriorCenterByTriangles = ring => {
  let best = null;
  let maxArea = -Infinity;
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const a = ring[i];
        const b = ring[j];
        const c = ring[k];
        const area = triangleArea(a, b, c);
        if (area <= Number.EPSILON) continue;
        const center = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3];
        if (!pointInPolygon(center, ring)) continue;
        if (area > maxArea) {
          maxArea = area;
          best = center;
        }
      }
    }
  }
  return best;
};

/**
 * 计算多边形面内中心点（优先面积质心，不在面内时回退到最大内接三角形重心）
 */
const getPolygonInteriorCenter = list => {
  // 闭合环去重首尾相同点，仅保留顶点序列
  const ring = list.map(([lon, lat]) => [lon, lat]);
  if (
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  ) {
    ring.pop();
  }
  if (ring.length < 3) return null;

  const centroid = getAreaCentroid(ring);
  if (centroid && pointInPolygon(centroid, ring)) {
    return centroid;
  }
  // 凹多边形：质心可能在面外，改用面内三角形重心
  return getInteriorCenterByTriangles(ring) || centroid;
};

/**
 * 输入经纬度坐标集合，获取坐标集合中心点
 * @param {number[] | number[][]} coordinates 单个 [lon, lat] 或集合 [[lon, lat], ...]
 * @returns {number[] | null} 中心点 [lon, lat]，无效输入返回 null
 */
const getCenterByCoordinates = coordinates => {
  const list = normalizeCoordinates(coordinates);
  if (list.length === 0) return null;
  // 单点：自身即为中心
  if (list.length === 1) {
    return [list[0][0], list[0][1]];
  }
  // 两点：连线中点
  if (list.length === 2) {
    const [a, b] = list;
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  }
  // 三点及以上：面内中心点
  return getPolygonInteriorCenter(list);
};

export { getCenterByCoordinates };
