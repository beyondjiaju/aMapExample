import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";

/** 示例统一用北京附近坐标，方便二三维对照 */
export const CENTER: [number, number] = [116.397, 39.909];

export const POLYLINE: [number, number][] = [
  [116.34, 39.9],
  [116.42, 39.94],
  [116.5, 39.89]
];

export const POLYGON: [number, number][] = [
  [116.36, 39.88],
  [116.46, 39.88],
  [116.46, 39.94],
  [116.36, 39.94]
];

export function closedRing() {
  return [...POLYGON, POLYGON[0]];
}

export function describe(value: unknown, depth = 0): string {
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.length > 160 ? `${value.slice(0, 160)}…` : value;
  }
  if (typeof value === "function") return "[Function]";
  if (depth > 2) return "[Object]";
  if (Array.isArray(value)) {
    const preview = value
      .slice(0, 4)
      .map(item => describe(item, depth + 1))
      .join(", ");
    return `[${preview}${value.length > 4 ? ", …" : ""}] len=${value.length}`;
  }
  const name = (value as { constructor?: { name?: string } }).constructor?.name;
  if (name && name !== "Object") return `[${name}]`;
  try {
    return JSON.stringify(value);
  } catch {
    return "[Object]";
  }
}

/** 把方法返回值写进示例日志，Promise 等到结束后再写 */
export function report(ctx: { log: (message: string) => void }, title: string, value: unknown) {
  if (value && typeof (value as Promise<unknown>).then === "function") {
    return (value as Promise<unknown>).then(
      data => ctx.log(`${title} => ${describe(data)}`),
      error => ctx.log(`${title} 失败: ${(error as Error).message}`)
    );
  }
  ctx.log(`${title} => ${describe(value)}`);
}

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

export function trackPositions() {
  const list: number[][] = [];
  for (let i = 0; i <= 8; i += 1) {
    list.push([116.34 + i * 0.02, 39.89 + Math.sin(i / 2) * 0.012, 180]);
  }
  return list;
}

/** 小范围风场，满足 Windy 对 U/V 分量（2,2 / 2,3）的读取 */
export function windJson() {
  const nx = 8;
  const ny = 8;
  const lo1 = 116.2;
  const la1 = 40.05;
  const dx = 0.05;
  const dy = 0.05;
  const header = (parameterNumber: number) => ({
    parameterCategory: 2,
    parameterNumber,
    lo1,
    la1,
    lo2: lo1 + dx * (nx - 1),
    la2: la1 - dy * (ny - 1),
    dx,
    dy,
    nx,
    ny
  });
  const u: number[] = [];
  const v: number[] = [];
  for (let i = 0; i < nx * ny; i += 1) {
    u.push(8);
    v.push(3);
  }
  return [
    { header: header(2), data: u },
    { header: header(3), data: v }
  ];
}

/** 临时替换对象方法，收集注册进去的监听，方便注销 SDK 里没有 destroy 的对象 */
export function trapCalls<T>(
  host: any,
  methodName: string,
  during: () => T,
  pick: (args: any[]) => boolean = () => true
) {
  const origin = host[methodName];
  const caught: any[] = [];
  host[methodName] = function (...args: any[]) {
    if (pick(args)) caught.push(args[0]);
    return origin.apply(this, args);
  };
  try {
    return { result: during(), caught };
  } finally {
    host[methodName] = origin;
  }
}

export function styledFeature(geometry: any, id = "demo-feature", text = "示例") {
  const style = new ol.style.Style({
    fill: new ol.style.Fill({ color: "rgba(22,119,255,0.35)" }),
    stroke: new ol.style.Stroke({ color: "#69c0ff", width: 2 }),
    image: new ol.style.Circle({
      radius: 7,
      fill: new ol.style.Fill({ color: "#36cfc9" }),
      stroke: new ol.style.Stroke({ color: "#ffffff", width: 1 })
    }),
    text: new ol.style.Text({
      text,
      fill: new ol.style.Fill({ color: "#ffffff" }),
      stroke: new ol.style.Stroke({ color: "#001529", width: 3 })
    })
  });
  const feature = new ol.Feature({
    geometry,
    featureData: { geometry, style },
    properties: {
      id,
      fillColor: "#1677ff",
      fillAlpha: 0.35,
      outlineColor: "#69c0ff",
      outlineAlpha: 1
    }
  });
  feature.setId(id);
  feature.setStyle(style);
  return feature;
}

export function cesiumPolygon(viewer: any, ring = POLYGON, id = "demo-polygon") {
  return viewer.entities.add({
    id,
    polygon: {
      hierarchy: Cesium.Cartesian3.fromDegreesArray(ring.flat()),
      material: Cesium.Color.fromCssColorString("#1677ff").withAlpha(0.35)
    },
    properties: {
      fillAlpha: 0.35,
      fillColor: "#1677ff",
      outlineAlpha: 1,
      id
    }
  });
}
