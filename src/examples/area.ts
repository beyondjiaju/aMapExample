/** 示例随机点位共用的矩形范围 */
export interface AreaRect {
  name: string;
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
}

/** 当前默认范围：北京市 */
export const BEIJING_AREA: AreaRect = {
  name: "北京市",
  minLon: 115.42,
  maxLon: 117.51,
  minLat: 39.44,
  maxLat: 41.06
};

export const DEFAULT_AREA = BEIJING_AREA;

/** 在矩形范围内随机取一个经纬度，示例里的随机点都走这里 */
export function randomPoint(area: AreaRect = DEFAULT_AREA) {
  return {
    lon: area.minLon + Math.random() * (area.maxLon - area.minLon),
    lat: area.minLat + Math.random() * (area.maxLat - area.minLat)
  };
}
