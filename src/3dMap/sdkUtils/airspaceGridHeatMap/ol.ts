import * as ol from "@/3dMap/sdk/ol";
import { olMap } from "@/3dMap/global";
import { getColorAlpha, getHeight } from "@/3dMap/sdk/olUtils";
import {
  getStyleFromProperties,
  forEachStyleMap,
  DEFAULT_GRAPHICS_STYLE,
  type ImageryPlan,
  type StyleMapInput,
  type ImageryCache,
  type AirspaceGridHeatMapHandlerOption
} from "./utils";

/**
 * OpenLayers 空域网格热力：消费入口缓存的 geojson / imagery，按视角高度切换
 */
class AirspaceGridHeatMapOl {
  preciseHeight: number;
  /** 入口共享 geojson（不在此层销毁对象本身） */
  geojsonData: any;
  geoLayer: any;
  imageryLayer: any;
  /** 当前挂载的贴图 url（由 index 持有，destroy 时不 revoke） */
  imageUrl: string | null;
  imageryPlan: ImageryPlan | null;
  moveListener: (() => void) | null;
  /** updata 样式缓存 */
  styleOverrideMap: StyleMapInput | null;
  imageryRefreshToken: number;
  destroyed: boolean;

  constructor(option: AirspaceGridHeatMapHandlerOption) {
    this.preciseHeight = option.preciseHeight;
    this.geojsonData = option.geojsonData;
    this.geoLayer = null;
    this.imageryLayer = null;
    this.imageUrl = null;
    this.imageryPlan = null;
    this.moveListener = null;
    this.styleOverrideMap = option.styleMap ?? null;
    this.imageryRefreshToken = 0;
    this.destroyed = false;
    void this.init(option.imageryCache).catch(err => {
      console.error("[AirspaceGridHeatMapOl] 初始化失败", err);
    });
  }

  /** 使用入口下发的 geojson / imagery，不二次 resolve / 重算贴图 */
  async init(imageryCache?: ImageryCache | null) {
    if (!olMap || !this.geojsonData) return;
    await Promise.all([
      this.loadGeoJson(this.geojsonData),
      imageryCache ? this.mountImagery(imageryCache) : Promise.resolve()
    ]);
    if (this.destroyed) return;
    this.bindMoveListener();
    this.syncByHeight();
  }

  /** 加载 GeoJSON 为 vector feature */
  async loadGeoJson(data: any) {
    if (!olMap || this.geoLayer) return;
    const features = new ol.GeoJSON().readFeatures(data);
    features.forEach(feature => {
      const properties = feature.getProperties();
      const fid =
        properties?.id != null ? String(properties.id) : feature.getId();
      if (fid != null && fid !== "") feature.setId(String(fid));
      const { color, alpha } = getStyleFromProperties(properties);
      const fillColorWithAlpha = getColorAlpha(color, alpha);
      const style = new ol.style.Style({
        fill: new ol.style.Fill({ color: fillColorWithAlpha }),
        stroke: new ol.style.Stroke({
          color,
          width: 1
        })
      });
      feature.setStyle(style);
    });
    this.geoLayer = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.geoLayer.setZIndex(-1);
    this.geoLayer.getSource().addFeatures(features);
    olMap.addLayer(this.geoLayer);
  }

  /** 监听地图缩放/平移结束（高度随之变化） */
  bindMoveListener() {
    if (!olMap || this.moveListener) return;
    this.moveListener = () => this.syncByHeight();
    olMap.addEventListener("moveend", this.moveListener);
  }

  /**
   * 高度切换：
   * >= preciseHeight → 显示 imagery；
   * < preciseHeight → 显示 feature
   */
  syncByHeight() {
    if (!olMap) return;
    const height = getHeight(olMap);
    const showImagery = height >= this.preciseHeight;
    if (this.geoLayer) this.geoLayer.setVisible(!showImagery);
    if (this.imageryLayer) this.imageryLayer.setVisible(showImagery);
  }

  /**
   * 由入口下发最新 styleMap + imageryCache，仅更新 feature / 挂图层，不重算贴图
   * styleMap 为空时按默认色重载全部 feature，并挂接入口重算的基础贴图
   */
  updata(styleMap: StyleMapInput, imageryCache?: ImageryCache | null) {
    this.styleOverrideMap = styleMap;
    // styleMap 为空：按默认色重载基础数据展示
    if (!styleMap?.length) {
      this.resetFeaturesToDefaultStyle();
    } else {
      this.applyStyleMap(styleMap);
    }
    if (imageryCache) {
      void this.mountImagery(imageryCache, true);
    }
  }

  /** 将 styleMap 应用到当前 geoLayer feature */
  applyStyleMap(styleMap: StyleMapInput) {
    if (!this.geoLayer) return;
    const source = this.geoLayer.getSource();
    if (!source) return;
    forEachStyleMap(styleMap, (id, graphics) => {
      const feature = source.getFeatureById(id);
      if (!feature) return;
      const { color, alpha } = getStyleFromProperties({ graphics });
      feature.set("graphics", { color, alpha });
      const fillColorWithAlpha = getColorAlpha(color, alpha);
      feature.setStyle(
        new ol.style.Style({
          fill: new ol.style.Fill({ color: fillColorWithAlpha }),
          stroke: new ol.style.Stroke({
            color,
            width: 1
          })
        })
      );
    });
  }

  /** 将全部 feature 重置为默认颜色（styleMap 为空时的基础展示） */
  resetFeaturesToDefaultStyle() {
    if (!this.geoLayer) return;
    const source = this.geoLayer.getSource();
    if (!source) return;
    const { color, alpha } = DEFAULT_GRAPHICS_STYLE;
    const fillColorWithAlpha = getColorAlpha(color, alpha);
    const features = source.getFeatures();
    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      feature.set("graphics", { color, alpha });
      feature.setStyle(
        new ol.style.Style({
          fill: new ol.style.Fill({ color: fillColorWithAlpha }),
          stroke: new ol.style.Stroke({
            color,
            width: 1
          })
        })
      );
    }
  }

  /**
   * 挂载入口下发的贴图（不 revoke url，生命周期由 index 管理）
   */
  async mountImagery(cache: ImageryCache, replace = false) {
    if (!olMap || this.destroyed) return;
    const token = ++this.imageryRefreshToken;
    if (replace && this.imageryLayer) {
      olMap.removeLayer(this.imageryLayer);
      this.imageryLayer = null;
    }
    if (this.imageryLayer) return;
    this.imageUrl = cache.imageUrl;
    this.imageryPlan = cache.plan;
    const { west, south, east, north } = cache.plan.imageryRect;
    const layer = new ol.ImageLayer({
      source: new ol.ImageStatic({
        url: cache.imageUrl,
        imageExtent: [west, south, east, north],
        projection: ol.WGS84
      })
    });
    if (this.destroyed || token !== this.imageryRefreshToken) return;
    this.imageryLayer = layer;
    this.imageryLayer.setZIndex(-1);
    olMap.addLayer(this.imageryLayer);
    this.syncByHeight();
  }

  destroy() {
    this.destroyed = true;
    this.imageryRefreshToken++;
    this.styleOverrideMap = null;
    // 仅断开引用，geojson / blob 由 index 持有
    this.geojsonData = null;
    if (olMap && this.moveListener) {
      olMap.removeEventListener("moveend", this.moveListener);
    }
    this.moveListener = null;
    if (olMap && this.geoLayer) {
      olMap.removeLayer(this.geoLayer);
    }
    this.geoLayer = null;
    if (olMap && this.imageryLayer) {
      olMap.removeLayer(this.imageryLayer);
    }
    this.imageryLayer = null;
    this.imageUrl = null;
    this.imageryPlan = null;
  }
}

export default AirspaceGridHeatMapOl;
