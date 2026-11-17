import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer } from "@/3dMap/global";
import {
  getStyleFromProperties,
  toStyleMapRecord,
  DEFAULT_GRAPHICS_STYLE,
  type ImageryPlan,
  type StyleMapInput,
  type StyleMapRecord,
  type GraphicsStyle,
  type ImageryCache,
  type AirspaceGridHeatMapHandlerOption
} from "./utils";

/** 视口 / 要素外包矩形 */
type LonLatRect = {
  west: number;
  south: number;
  east: number;
  north: number;
};

/** 预索引项：用于按屏范围筛选，不预先加载 entity */
type FeatureIndexItem = {
  id: string;
  feature: any;
  bbox: LonLatRect;
};

/** 递归遍历坐标，收集 bbox */
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

/** 计算 geometry 外包矩形 */
const calcGeometryBBox = (geometry: any): LonLatRect | null => {
  if (!geometry?.coordinates) return null;
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  walkCoords(geometry.coordinates, (lon, lat) => {
    if (lon < west) west = lon;
    if (lat < south) south = lat;
    if (lon > east) east = lon;
    if (lat > north) north = lat;
  });
  if (!Number.isFinite(west)) return null;
  return { west, south, east, north };
};

/** 矩形相交判断 */
const rectIntersects = (a: LonLatRect, b: LonLatRect) =>
  !(
    a.east < b.west ||
    a.west > b.east ||
    a.north < b.south ||
    a.south > b.north
  );

/**
 * 要素 id：优先 feature.id / properties.id，否则用坐标生成字符串
 */
const getFeatureId = (feature: any): string => {
  if (feature?.id != null && feature.id !== "") return String(feature.id);
  if (feature?.properties?.id != null && feature.properties.id !== "") {
    return String(feature.properties.id);
  }
  return JSON.stringify(feature?.geometry?.coordinates ?? null);
};

/**
 * Cesium 空域网格热力：消费入口缓存的 geojson / imagery，按视角高度切换
 * entity 默认不加载，精细高度下按屏幕范围增量加载并按 id 去重
 */
class AirspaceGridHeatMapCesium {
  preciseHeight: number;
  /** 视口缓冲度数（由 index 初始化传入） */
  viewRectBuffer: number;
  /** 入口共享 geojson（不在此层销毁对象本身） */
  geojsonData: any;
  /** 要素预索引 */
  featureIndex: FeatureIndexItem[];
  /** 已加载过的要素 id（屏幕内已加载不再重复加载） */
  loadedFeatureIds: Set<string>;
  /** updata 样式覆盖（已转为 id→graphics，便于 O(1) 查找） */
  styleOverrideMap: StyleMapRecord | null;
  dataSource: any;
  imageryLayer: any;
  /** 当前挂载的贴图 url（由 index 持有，destroy 时不 revoke） */
  imageUrl: string | null;
  imageryPlan: ImageryPlan | null;
  cameraListener: (() => void) | null;
  /** 相机回调合并：同一帧内多次 changed 只 sync 一次 */
  cameraSyncRaf: number | null;
  /** imagery 挂载序号（本地替换图层用） */
  imageryRefreshToken: number;
  destroyed: boolean;

  constructor(option: AirspaceGridHeatMapHandlerOption) {
    this.preciseHeight = option.preciseHeight;
    // 视口缓冲由入口初始化参数控制，默认 0.1
    this.viewRectBuffer = option.viewRectBuffer ?? 0.1;
    this.geojsonData = option.geojsonData;
    this.featureIndex = [];
    this.loadedFeatureIds = new Set();
    this.styleOverrideMap = toStyleMapRecord(option.styleMap) ?? null;
    this.dataSource = null;
    this.imageryLayer = null;
    this.imageUrl = null;
    this.imageryPlan = null;
    this.cameraListener = null;
    this.cameraSyncRaf = null;
    this.imageryRefreshToken = 0;
    this.destroyed = false;
    void this.init(option.imageryCache).catch(err => {
      console.error("[AirspaceGridHeatMapCesium] 初始化失败", err);
    });
  }

  /** 使用入口下发的 geojson / imagery，不二次 resolve / 重算贴图 */
  async init(imageryCache?: ImageryCache | null) {
    if (!viewer || !this.geojsonData) return;
    this.buildFeatureIndex(this.geojsonData);
    // graphics 已由入口写入；此处仅挂接缓存贴图
    if (imageryCache) {
      await this.mountImagery(imageryCache);
    }
    if (this.destroyed) return;
    this.bindCameraListener();
    this.syncByHeight();
  }

  /** 将样式索引同步写入 featureIndex / geojsonData 的 properties.graphics */
  syncStyleToFeatures(byId: StyleMapRecord) {
    for (let i = 0; i < this.featureIndex.length; i++) {
      const item = this.featureIndex[i];
      const graphics = byId[item.id] || byId[String(item.id)];
      if (!graphics || !item.feature) continue;
      item.feature.properties = item.feature.properties || {};
      item.feature.properties.graphics = {
        color: graphics.color,
        alpha: graphics.alpha
      };
    }
  }

  /** 构建要素 id + bbox 索引（不创建 entity） */
  buildFeatureIndex(data: any) {
    const list: FeatureIndexItem[] = [];
    const features = data?.features || [];
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      const geometry = feature?.geometry;
      if (!geometry) continue;
      if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
        continue;
      }
      const bbox = calcGeometryBBox(geometry);
      if (!bbox) continue;
      list.push({
        id: getFeatureId(feature),
        feature,
        bbox
      });
    }
    this.featureIndex = list;
  }

  /** 确保存在空的 CustomDataSource（默认隐藏） */
  async ensureDataSource() {
    if (!viewer || this.dataSource) return;
    const dataSource = new Cesium.CustomDataSource("airspaceGridHeatMap");
    dataSource.show = false;
    await viewer.dataSources.add(dataSource);
    if (this.destroyed) {
      viewer.dataSources.remove(dataSource, true);
      return;
    }
    this.dataSource = dataSource;
  }

  /** 获取当前屏幕对应的经纬度范围（向外缓冲，优化边缘视觉；viewRectBuffer 来自初始化参数） */
  getViewRect(): LonLatRect | null {
    if (!viewer) return null;
    const rectangle = viewer.camera.computeViewRectangle(
      viewer.scene.globe.ellipsoid
    );
    if (!rectangle) return null;
    const buffer = this.viewRectBuffer;
    return {
      west: Cesium.Math.toDegrees(rectangle.west) - buffer,
      south: Cesium.Math.toDegrees(rectangle.south) - buffer,
      east: Cesium.Math.toDegrees(rectangle.east) + buffer,
      north: Cesium.Math.toDegrees(rectangle.north) + buffer
    };
  }

  /** 将 Polygon rings 转为 Cesium PolygonHierarchy */
  buildPolygonHierarchy(rings: number[][][]) {
    if (!rings?.length) return null;
    const outer = rings[0];
    if (!outer?.length) return null;
    const positions = Cesium.Cartesian3.fromDegreesArray(
      outer.reduce((arr: number[], pt) => {
        arr.push(pt[0], pt[1]);
        return arr;
      }, [])
    );
    const holes: any[] = [];
    for (let i = 1; i < rings.length; i++) {
      const ring = rings[i];
      if (!ring?.length) continue;
      holes.push(
        new Cesium.PolygonHierarchy(
          Cesium.Cartesian3.fromDegreesArray(
            ring.reduce((arr: number[], pt) => {
              arr.push(pt[0], pt[1]);
              return arr;
            }, [])
          )
        )
      );
    }
    return new Cesium.PolygonHierarchy(positions, holes);
  }

  /** 将单个 feature 加入 dataSource（已加载 id 跳过） */
  addFeatureEntity(item: FeatureIndexItem) {
    if (!this.dataSource || this.loadedFeatureIds.has(item.id)) return;
    const geometry = item.feature?.geometry;
    if (!geometry) return;
    const override =
      this.styleOverrideMap?.[item.id] ||
      this.styleOverrideMap?.[String(item.id)];
    const { color, alpha } = override
      ? getStyleFromProperties({ graphics: override })
      : getStyleFromProperties(item.feature?.properties);
    const fillColor = Cesium.Color.fromCssColorString(color).withAlpha(alpha);
    const strokeColor = Cesium.Color.fromCssColorString(color);

    const addOne = (rings: number[][][], entityId: string) => {
      const hierarchy = this.buildPolygonHierarchy(rings);
      if (!hierarchy) return;
      this.dataSource.entities.add({
        id: entityId,
        polygon: {
          hierarchy,
          height: 0,
          extrudedHeight: 0.1,
          material: fillColor,
          outline: true,
          outlineColor: strokeColor,
          outlineWidth: 1
        }
      });
    };

    if (geometry.type === "Polygon") {
      addOne(geometry.coordinates, item.id);
    } else if (geometry.type === "MultiPolygon") {
      for (let p = 0; p < geometry.coordinates.length; p++) {
        addOne(geometry.coordinates[p], `${item.id}#${p}`);
      }
    }
    this.loadedFeatureIds.add(item.id);
  }

  /** 应用 graphics 到单个 entity 的 polygon */
  applyGraphicsToEntity(entity: any, graphics: GraphicsStyle) {
    if (!entity?.polygon) return;
    const { color, alpha } = getStyleFromProperties({ graphics });
    const fillColor = Cesium.Color.fromCssColorString(color).withAlpha(alpha);
    const strokeColor = Cesium.Color.fromCssColorString(color);
    entity.polygon.material = fillColor;
    entity.polygon.outlineColor = strokeColor;
  }

  /**
   * 由入口下发最新 styleMap + imageryCache，仅更新 entity / 挂图层，不重算贴图
   * styleMap 为空时按默认色重载已加载 entity，并挂接入口重算的基础贴图
   */
  updata(styleMap: StyleMapInput, imageryCache?: ImageryCache | null) {
    const byId = toStyleMapRecord(styleMap);
    this.styleOverrideMap = byId;
    // styleMap 为空：清除覆盖，按默认色刷新已加载图形并重挂贴图
    if (!byId) {
      this.resetLoadedEntitiesToDefaultStyle();
      if (imageryCache) {
        void this.mountImagery(imageryCache, true);
      }
      return;
    }
    this.syncStyleToFeatures(byId);
    if (imageryCache) {
      void this.mountImagery(imageryCache, true);
    }
    if (!this.dataSource) return;
    const ids = Object.keys(byId);
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const graphics = byId[id];
      if (!graphics) continue;
      const entity = this.dataSource.entities.getById(id);
      if (entity) {
        this.applyGraphicsToEntity(entity, graphics);
      }
      let p = 0;
      while (p < 64) {
        const part = this.dataSource.entities.getById(`${id}#${p}`);
        if (!part) break;
        this.applyGraphicsToEntity(part, graphics);
        p++;
      }
    }
  }

  /** 将已加载 entity 重置为默认颜色（styleMap 为空时的基础展示） */
  resetLoadedEntitiesToDefaultStyle() {
    if (!this.dataSource) return;
    this.loadedFeatureIds.forEach(id => {
      const entity = this.dataSource.entities.getById(id);
      if (entity) {
        this.applyGraphicsToEntity(entity, DEFAULT_GRAPHICS_STYLE);
      }
      let p = 0;
      while (p < 64) {
        const part = this.dataSource.entities.getById(`${id}#${p}`);
        if (!part) break;
        this.applyGraphicsToEntity(part, DEFAULT_GRAPHICS_STYLE);
        p++;
      }
    });
  }

  /**
   * 挂载入口下发的贴图（不 revoke url，生命周期由 index 管理）
   * @param replace 为 true 时先移除旧图层再挂新图
   */
  async mountImagery(cache: ImageryCache, replace = false) {
    if (!viewer || this.destroyed) return;
    const token = ++this.imageryRefreshToken;
    if (replace && this.imageryLayer) {
      viewer.imageryLayers.remove(this.imageryLayer, true);
      this.imageryLayer = null;
    }
    if (this.imageryLayer) return;
    this.imageUrl = cache.imageUrl;
    this.imageryPlan = cache.plan;
    const { west, south, east, north } = cache.plan.imageryRect;
    const rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);
    const provider = await Cesium.SingleTileImageryProvider.fromUrl(
      cache.imageUrl,
      { rectangle }
    );
    if (this.destroyed || token !== this.imageryRefreshToken) return;
    this.imageryLayer = viewer.imageryLayers.addImageryProvider(provider);
    this.syncByHeight();
  }

  /**
   * 按当前屏幕范围增量加载未加载过的 entity
   */
  async loadEntitiesInView() {
    if (!viewer || this.destroyed || !this.featureIndex.length) return;
    const viewRect = this.getViewRect();
    if (!viewRect) return;

    await this.ensureDataSource();
    if (this.destroyed || !this.dataSource) return;

    for (let i = 0; i < this.featureIndex.length; i++) {
      const item = this.featureIndex[i];
      if (this.loadedFeatureIds.has(item.id)) continue;
      if (!rectIntersects(item.bbox, viewRect)) continue;
      this.addFeatureEntity(item);
    }
  }

  /** 监听相机高度 / 范围变化（rAF 合并，避免每帧多次 sync） */
  bindCameraListener() {
    if (!viewer || this.cameraListener) return;
    this.cameraListener = () => {
      if (this.cameraSyncRaf != null) return;
      this.cameraSyncRaf = requestAnimationFrame(() => {
        this.cameraSyncRaf = null;
        this.syncByHeight();
      });
    };
    viewer.camera.changed.addEventListener(this.cameraListener);
  }

  /**
   * 高度切换：
   * >= preciseHeight → 显示 imagery；
   * < preciseHeight → 显示 entity，并按屏幕范围动态加载
   */
  syncByHeight() {
    if (!viewer || this.destroyed) return;
    const height = viewer.camera.positionCartographic.height;
    const showImagery = height >= this.preciseHeight;
    if (this.imageryLayer) this.imageryLayer.show = showImagery;
    if (this.dataSource) this.dataSource.show = !showImagery;

    if (!showImagery) {
      void this.loadEntitiesInView();
    }
  }

  destroy() {
    this.destroyed = true;
    this.imageryRefreshToken++;
    if (this.cameraSyncRaf != null) {
      cancelAnimationFrame(this.cameraSyncRaf);
      this.cameraSyncRaf = null;
    }
    if (viewer && this.cameraListener) {
      viewer.camera.changed.removeEventListener(this.cameraListener);
    }
    this.cameraListener = null;
    if (viewer && this.dataSource) {
      viewer.dataSources.remove(this.dataSource, true);
    }
    this.dataSource = null;
    this.loadedFeatureIds.clear();
    this.styleOverrideMap = null;
    this.featureIndex = [];
    // 仅断开引用，geojson / blob 由 index 持有
    this.geojsonData = null;
    if (viewer && this.imageryLayer) {
      viewer.imageryLayers.remove(this.imageryLayer, true);
    }
    this.imageryLayer = null;
    this.imageUrl = null;
    this.imageryPlan = null;
  }
}

export default AirspaceGridHeatMapCesium;
