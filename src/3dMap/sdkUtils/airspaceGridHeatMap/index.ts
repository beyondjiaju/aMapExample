import mapData from "@/3dMap/store/map";
import { mapEmitter } from "@/3dMap/interface";
import AirspaceGridHeatMapCesium from "./cesium";
import AirspaceGridHeatMapOl from "./ol";
import {
  resolveGeoJson,
  prepareGeoJsonImagery,
  applyStyleMapToGeoJson,
  resetGeoJsonToDefaultStyle,
  type StyleMapInput,
  type ImageryCache,
  type AirspaceGridHeatMapHandlerOption
} from "./utils";

export type {
  GraphicsStyle,
  StyleMapInput,
  StyleMapItem,
  ImageryCache,
  AirspaceGridHeatMapHandlerOption
} from "./utils";

/** 初始化参数 */
export type AirspaceGridHeatMapOption = {
  /** GeoJSON 对象或文件地址 */
  geojson: string | object;
  /** 精细化高度（米） */
  preciseHeight: number;
  /**
   * 可选：与 updata 相同的样式表
   * 有则初始化直接按此配置生成 imagery/图形，避免先闪默认色
   */
  styleMap?: StyleMapInput;
  /** 视口缓冲度数（传给 getViewRect），默认 0.1 */
  viewRectBuffer?: number;
};

/**
 * 空域网格热力入口：
 * 在 index 层缓存 geojsonData 与 imagery，按 map mode 下发到 cesium / ol
 */
class AirspaceGridHeatMap {
  option: AirspaceGridHeatMapOption;
  handler: AirspaceGridHeatMapCesium | AirspaceGridHeatMapOl | null;
  mapEmitterOff: (() => void) | null;
  /** 最近一次 updata 样式，mode 切换时写入 option.styleMap 首绘 */
  lastStyleMap: StyleMapInput | null;
  /** 入口持有的 geojson（mode 切换复用） */
  geojsonData: any;
  /** 入口持有的最新贴图（mode 切换直接下发） */
  imageryCache: ImageryCache | null;
  /** 贴图生成序号，避免连续 updata 旧结果覆盖 */
  imageryToken: number;
  destroyed: boolean;

  constructor(option: AirspaceGridHeatMapOption) {
    this.option = {
      geojson: option?.geojson,
      preciseHeight: option?.preciseHeight,
      styleMap: option?.styleMap,
      // 视口缓冲，未传时默认 0.1
      viewRectBuffer: option?.viewRectBuffer ?? 0.1
    };
    this.handler = null;
    this.mapEmitterOff = null;
    this.lastStyleMap = option?.styleMap ?? null;
    this.geojsonData = null;
    this.imageryCache = null;
    this.imageryToken = 0;
    this.destroyed = false;
    // 先准备共享数据，再按当前 mode 创建实现
    void this.bootstrap();
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      () => {
        this.handler?.destroy();
        this.handler = null;
        // 复用已缓存的 geojson / imagery，不再二次加载与重算
        void this.ensureSharedData().then(() => {
          if (!this.destroyed) this.setByMapMode();
        });
      }
    );
  }

  /** 首次：解析并生成缓存后创建 handler */
  async bootstrap() {
    await this.ensureSharedData();
    if (this.destroyed) return;
    this.setByMapMode();
  }

  /**
   * 确保入口层已有 geojsonData 与 imageryCache
   * 有 styleMap 时先写入 graphics 再出图
   */
  async ensureSharedData() {
    if (!this.geojsonData) {
      this.geojsonData = await resolveGeoJson(this.option.geojson);
      if (this.destroyed) return;
    }
    const styleMap = this.lastStyleMap ?? this.option.styleMap;
    if (styleMap) {
      applyStyleMapToGeoJson(this.geojsonData, styleMap);
    }
    // 已有贴图缓存则直接复用，避免 mode 切换重复计算
    if (this.imageryCache) return;
    const token = ++this.imageryToken;
    const result = await prepareGeoJsonImagery(this.geojsonData);
    if (this.destroyed || token !== this.imageryToken) {
      URL.revokeObjectURL(result.imageUrl);
      return;
    }
    this.imageryCache = result;
  }

  /** 按 mapMode 动态创建对应实现，并注入共享缓存 */
  setByMapMode() {
    if (!this.geojsonData) return;
    const mapMode = mapData().mapMode;
    const option: AirspaceGridHeatMapHandlerOption = {
      preciseHeight: this.option.preciseHeight,
      geojsonData: this.geojsonData,
      styleMap: this.lastStyleMap ?? this.option.styleMap,
      imageryCache: this.imageryCache,
      viewRectBuffer: this.option.viewRectBuffer
    };
    if (mapMode === "cesium") {
      this.handler = new AirspaceGridHeatMapCesium(option);
    } else if (mapMode === "ol") {
      this.handler = new AirspaceGridHeatMapOl(option);
    }
  }

  /**
   * 按 id 更新图形颜色/透明度
   * 在入口层更新 geojson + 重算 imagery 并记录，再下发给当前 handler
   */
  async updata(styleMap: StyleMapInput) {
    this.lastStyleMap = styleMap;
    this.option.styleMap = styleMap;
    if (!this.geojsonData) {
      await this.ensureSharedData();
      if (this.destroyed) return;
    }
    // 1. 写入共享 geojson；styleMap 为空时按默认色重置为基础数据
    if (!styleMap?.length) {
      resetGeoJsonToDefaultStyle(this.geojsonData);
    } else {
      applyStyleMapToGeoJson(this.geojsonData, styleMap);
    }
    // 2. 入口重算贴图并记录最新图
    const token = ++this.imageryToken;
    const prev = this.imageryCache;
    const next = await prepareGeoJsonImagery(this.geojsonData, prev?.plan);
    if (this.destroyed || token !== this.imageryToken) {
      URL.revokeObjectURL(next.imageUrl);
      return;
    }
    this.imageryCache = next;
    // 3. 先让 handler 挂上新图，再回收旧 blob（避免图层仍引用旧 url）
    this.handler?.updata?.(styleMap, next);
    if (prev?.imageUrl && prev.imageUrl !== next.imageUrl) {
      URL.revokeObjectURL(prev.imageUrl);
    }
  }

  destroy() {
    this.destroyed = true;
    this.imageryToken++;
    this.handler?.destroy();
    this.handler = null;
    if (this.mapEmitterOff) {
      this.mapEmitterOff();
      this.mapEmitterOff = null;
    }
    // 入口持有的贴图在此统一回收
    if (this.imageryCache?.imageUrl) {
      URL.revokeObjectURL(this.imageryCache.imageUrl);
    }
    this.imageryCache = null;
    this.geojsonData = null;
    this.lastStyleMap = null;
  }
}

/** 工厂：保持调用方 `airspaceGridHeatMap(option)` 用法 */
const airspaceGridHeatMap = (option: AirspaceGridHeatMapOption) =>
  new AirspaceGridHeatMap(option);

export { AirspaceGridHeatMap };
export default airspaceGridHeatMap;
