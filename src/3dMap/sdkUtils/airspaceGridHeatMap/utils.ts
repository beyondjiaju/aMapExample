/**
 * GeoJSON → canvas 贴图共享工具（供 cesium / ol 类复用）
 */

/**
 * canvas 单边上限（原 8192 会导致约 2 亿像素级缓冲 + PNG 编码严重卡顿）
 * 对本数据集（约 1.65°×1.45°）4096 足够作为贴图预览
 */
const CANVAS_MAX_EDGE = 4096;
/** 分片绘制，避免长时间占用主线程 */
const DRAW_BATCH_SIZE = 4000;

/** 贴图地理范围 */
export type ImageryRect = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/** 贴图方案 */
export type ImageryPlan = {
  feasible: boolean;
  reason: string;
  imageryRect: ImageryRect;
  canvasWidth: number;
  canvasHeight: number;
};

/** 贴图准备结果 */
export type ImageryPrepareResult = {
  imageUrl: string;
  plan: ImageryPlan;
};

/** 让出主线程，降低绘制卡顿 */
const yieldToMain = () =>
  new Promise<void>(resolve => {
    // 优先用消息通道尽快排队，兼容降级到 setTimeout
    if (typeof MessageChannel !== "undefined") {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => resolve();
      channel.port2.postMessage(null);
      return;
    }
    setTimeout(resolve, 0);
  });

/**
 * 解析 geojson：支持对象数据或文件地址
 * @param geojson GeoJSON 对象或 url
 */
export const resolveGeoJson = async (
  geojson: string | object
): Promise<any> => {
  if (geojson && typeof geojson === "object") return geojson;
  if (typeof geojson === "string" && geojson) {
    const res = await fetch(geojson);
    if (!res.ok)
      throw new Error(`加载 geojson 失败: ${res.status} (${geojson})`);
    return res.json();
  }
  throw new Error("无效的 geojson 参数");
};

/** 递归遍历 GeoJSON 坐标 */
const walkCoords = (coords: any, cb: (lon: number, lat: number) => void) => {
  if (!Array.isArray(coords) || !coords.length) return;
  if (typeof coords[0] === "number") {
    cb(coords[0], coords[1]);
    return;
  }
  for (let i = 0; i < coords.length; i++) {
    walkCoords(coords[i], cb);
  }
};

/** 从 GeoJSON 计算外包贴图矩形 */
const calcImageryRectFromGeoJson = (data: any): ImageryRect => {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  const features = data?.features || [];
  for (let i = 0; i < features.length; i++) {
    const geometry = features[i]?.geometry;
    if (!geometry?.coordinates) continue;
    walkCoords(geometry.coordinates, (lon, lat) => {
      if (lon < west) west = lon;
      if (lat < south) south = lat;
      if (lon > east) east = lon;
      if (lat > north) north = lat;
    });
  }
  if (!Number.isFinite(west)) {
    throw new Error("geojson 未解析到有效坐标");
  }
  return { west, south, east, north };
};

/** 计算 canvas 尺寸与贴图方案 */
const buildImageryPlan = (imageryRect: ImageryRect): ImageryPlan => {
  const lonSpan = Math.max(imageryRect.east - imageryRect.west, 1e-8);
  const latSpan = Math.max(imageryRect.north - imageryRect.south, 1e-8);
  let canvasWidth: number;
  let canvasHeight: number;
  if (lonSpan >= latSpan) {
    canvasWidth = CANVAS_MAX_EDGE;
    canvasHeight = Math.max(
      1,
      Math.round((latSpan / lonSpan) * CANVAS_MAX_EDGE)
    );
  } else {
    canvasHeight = CANVAS_MAX_EDGE;
    canvasWidth = Math.max(
      1,
      Math.round((lonSpan / latSpan) * CANVAS_MAX_EDGE)
    );
  }

  return {
    feasible: true,
    reason: `贴图方案 ${canvasWidth}x${canvasHeight}，范围 [${imageryRect.west.toFixed(
      6
    )},${imageryRect.south.toFixed(6)},${imageryRect.east.toFixed(
      6
    )},${imageryRect.north.toFixed(6)}]`,
    imageryRect,
    canvasWidth,
    canvasHeight
  };
};

/** 绘制单个 Polygon 的 rings */
const drawPolygonRings = (
  ctx: CanvasRenderingContext2D,
  rings: number[][][],
  toX: (lon: number) => number,
  toY: (lat: number) => number
) => {
  if (!rings?.length) return;
  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    if (!ring?.length) continue;
    ctx.moveTo(toX(ring[0][0]), toY(ring[0][1]));
    for (let i = 1; i < ring.length; i++) {
      ctx.lineTo(toX(ring[i][0]), toY(ring[i][1]));
    }
    ctx.closePath();
  }
};

/** canvas → Blob URL（避免 toDataURL 大图 PNG 同步编码卡顿） */
const canvasToObjectUrl = (canvas: HTMLCanvasElement): Promise<string> => {
  const toBlobUrl = (type: string, quality?: number) =>
    new Promise<string>((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(new Error(`canvas.toBlob(${type}) 失败`));
            return;
          }
          resolve(URL.createObjectURL(blob));
        },
        type,
        quality
      );
    });
  // 优先 webp（体积更小）；失败再降级 png
  return toBlobUrl("image/webp", 0.85).catch(() => toBlobUrl("image/png"));
};

/**
 * 从 properties.graphics 解析样式：{ color, alpha }
 * 边线复用 color
 */
export const getStyleFromProperties = (
  properties: Record<string, any> | null | undefined
) => {
  const graphics = properties?.graphics || {};
  const color = graphics.color || "#ffffff";
  const rawAlpha = Number(graphics.alpha);
  const alpha = Number.isFinite(rawAlpha) ? rawAlpha : 0.2;
  return { color, alpha };
};

/** graphics 样式（与 geojson properties.graphics 一致） */
export type GraphicsStyle = {
  color: string;
  alpha: number;
};

/**
 * getHeatMapGridRandomNum 单项：
 * { num, id, graphics: { color, alpha } }
 */
export type StyleMapItem = {
  num?: number;
  id: string;
  graphics: GraphicsStyle;
};

/** updata / 初始化样式：接口返回的数组 */
export type StyleMapInput = StyleMapItem[];

/** 内部查找用：id → graphics */
export type StyleMapRecord = Record<string, GraphicsStyle>;

/**
 * 将接口数组转为 id → graphics，便于按 id 取色
 */
export const toStyleMapRecord = (
  styleMap: StyleMapInput | null | undefined
): StyleMapRecord | null => {
  if (!styleMap?.length) return null;
  const record: StyleMapRecord = {};
  for (let i = 0; i < styleMap.length; i++) {
    const item = styleMap[i];
    if (item?.id == null || !item.graphics) continue;
    // 颜色/透明度取自 item.graphics
    record[String(item.id)] = {
      color: item.graphics.color,
      alpha: item.graphics.alpha
    };
  }
  return record;
};

/** 遍历样式：从数组项的 graphics 取 color / alpha */
export const forEachStyleMap = (
  styleMap: StyleMapInput | null | undefined,
  cb: (id: string, graphics: GraphicsStyle) => void
) => {
  if (!styleMap?.length) return;
  for (let i = 0; i < styleMap.length; i++) {
    const item = styleMap[i];
    if (item?.id == null || !item.graphics) continue;
    cb(String(item.id), item.graphics);
  }
};

/** 从接口数组中按 id 取 graphics（color / alpha） */
export const getGraphicsFromStyleMap = (
  styleMap: StyleMapInput | null | undefined,
  id: string
): GraphicsStyle | null => {
  if (!styleMap?.length) return null;
  const sid = String(id);
  for (let i = 0; i < styleMap.length; i++) {
    const item = styleMap[i];
    if (item?.id != null && String(item.id) === sid && item.graphics) {
      return item.graphics;
    }
  }
  return null;
};

/** 读取 geojson feature id（feature.id / properties.id） */
export const getGeoJsonFeatureId = (feature: any): string | null => {
  if (feature?.id != null && feature.id !== "") return String(feature.id);
  if (feature?.properties?.id != null && feature.properties.id !== "") {
    return String(feature.properties.id);
  }
  return null;
};

/**
 * 将 styleMap 写入 geojson features.properties.graphics（入口层共享数据用）
 */
export const applyStyleMapToGeoJson = (
  data: any,
  styleMap: StyleMapInput | null | undefined
) => {
  const byId = toStyleMapRecord(styleMap);
  if (!byId) return;
  const features = data?.features || [];
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (!feature) continue;
    const fid = getGeoJsonFeatureId(feature);
    if (!fid) continue;
    const graphics = byId[fid];
    if (!graphics) continue;
    feature.properties = feature.properties || {};
    feature.properties.graphics = {
      color: graphics.color,
      alpha: graphics.alpha
    };
  }
};

/** 默认图形样式（与 getStyleFromProperties 回退值一致） */
export const DEFAULT_GRAPHICS_STYLE: GraphicsStyle = {
  color: "#ffffff",
  alpha: 0.2
};

/**
 * styleMap 为空时：将 geojson 全部 feature 重置为默认颜色，用于回退展示基础数据
 */
export const resetGeoJsonToDefaultStyle = (data: any) => {
  const features = data?.features || [];
  for (let i = 0; i < features.length; i++) {
    const feature = features[i];
    if (!feature) continue;
    feature.properties = feature.properties || {};
    feature.properties.graphics = {
      color: DEFAULT_GRAPHICS_STYLE.color,
      alpha: DEFAULT_GRAPHICS_STYLE.alpha
    };
  }
};

/** 入口层贴图缓存（imageUrl 由 index 持有与回收） */
export type ImageryCache = ImageryPrepareResult;

/** 传给 cesium / ol 的运行时参数（含入口缓存） */
export type AirspaceGridHeatMapHandlerOption = {
  preciseHeight: number;
  /** 入口已解析并持有的 geojson，避免 mode 切换二次加载 */
  geojsonData: any;
  styleMap?: StyleMapInput;
  /** 入口已生成的贴图，避免 mode 切换 / 重复计算 */
  imageryCache?: ImageryCache | null;
  /** 视口缓冲度数（getViewRect 使用），默认 0.1 */
  viewRectBuffer?: number;
};

/**
 * 按 feature.graphics.color / alpha 填充，边线使用 color
 */
const paintFeaturePath = (
  ctx: CanvasRenderingContext2D,
  properties: Record<string, any> | null | undefined
) => {
  const { color, alpha } = getStyleFromProperties(properties);
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;
  ctx.fill();
  // 边线使用 color，不套用透明度
  ctx.globalAlpha = 1;
  ctx.strokeStyle = color;
  ctx.stroke();
};

/**
 * 分片将 GeoJSON 绘制到 canvas，并导出为 ObjectURL
 */
const buildGeoJsonCanvasImage = async (
  data: any,
  plan: ImageryPlan
): Promise<string> => {
  const { imageryRect, canvasWidth, canvasHeight } = plan;
  const canvas = document.createElement("canvas");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("无法获取 canvas 2d 上下文");

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.lineWidth = 1;
  ctx.lineJoin = "miter";
  ctx.miterLimit = 2;

  const lonSpan = imageryRect.east - imageryRect.west;
  const latSpan = imageryRect.north - imageryRect.south;
  const toX = (lon: number) =>
    ((lon - imageryRect.west) / lonSpan) * canvasWidth;
  const toY = (lat: number) =>
    ((imageryRect.north - lat) / latSpan) * canvasHeight;

  const features = data?.features || [];
  for (let i = 0; i < features.length; i++) {
    if (i % DRAW_BATCH_SIZE === 0) {
      await yieldToMain();
    }
    const feature = features[i];
    const geometry = feature?.geometry;
    if (!geometry) continue;
    const type = geometry.type;
    const coordinates = geometry.coordinates;
    ctx.beginPath();
    if (type === "Polygon") {
      drawPolygonRings(ctx, coordinates, toX, toY);
    } else if (type === "MultiPolygon") {
      for (let p = 0; p < coordinates.length; p++) {
        drawPolygonRings(ctx, coordinates[p], toX, toY);
      }
    } else {
      continue;
    }
    paintFeaturePath(ctx, feature?.properties);
  }

  const url = await canvasToObjectUrl(canvas);
  canvas.width = 0;
  canvas.height = 0;
  return url;
};

/**
 * 根据 GeoJSON 生成 imagery 贴图（blob url + 方案）
 * @param existingPlan 可选：几何未变时复用方案，跳过外包矩形重算
 */
export const prepareGeoJsonImagery = async (
  data: any,
  existingPlan?: ImageryPlan | null
): Promise<ImageryPrepareResult> => {
  const plan =
    existingPlan ?? buildImageryPlan(calcImageryRectFromGeoJson(data));
  if (!plan.feasible) {
    throw new Error(plan.reason || "贴图方案不可行");
  }
  const imageUrl = await buildGeoJsonCanvasImage(data, plan);
  return { imageUrl, plan };
};
