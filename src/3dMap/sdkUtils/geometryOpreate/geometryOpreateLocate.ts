import { mapEmitter } from "@/3dMap/interface";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import { viewer, olMap } from "@/3dMap/global";
import getRectangleByEntities from "./utils/getRectangleByEntities";
import {
  getFeatureFromAllLayerById,
  getRouteDataFromAllLayerById,
  getFitExtentAutoZoom
} from "@/3dMap/sdk/olUtils";
import {
  getEntityFromAllCollectionById,
  getRouteDataFromAllCollectionById
} from "@/3dMap/sdk/cesiumUtils";
import mapData from "@/3dMap/store/map";
/**监听 */
class GeometryOpreateLocate {
  mapEmitterOff: any;
  constructor() {
    /**定位数据
     * ids 定位图形 id Array
     */
    // 由 emitSdkUtilsMapModeChange 统一驱动 mapEvents:mapModeChangeSetSdkUtilsByCurrentMode
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      result => {
        // 模式切换驱动时没有 ids，保持不随二三维切换重定位
        if (!result?.ids) return;
        // 根据当前地图模式动态定位（只做一次操作，不做缓存、不随 2、3d 切换更新）
        const mapMode = mapData().mapMode;
        if (mapMode === "cesium") {
          this.setByCesium(result);
        }
        if (mapMode === "ol") {
          this.setByOl(result);
        }
      }
    );
  }
  // 3d 定位
  setByCesium(result) {
    // 获取全部id图形
    const ids = result.ids;
    let entities = [];
    ids.forEach(id => {
      const entity = getEntityFromAllCollectionById(viewer, id);
      if (entity) {
        entities.push(entity);
      } else {
        const routeData = getRouteDataFromAllCollectionById(viewer, id);
        routeData.forEach(({ entity }) => {
          entities.push(entity);
        });
      }
    });
    // 定位坐标整理
    if (!entities.length) return;
    const rectangle = getRectangleByEntities(entities);
    viewer.camera.setView({
      destination: rectangle,
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    });
  }
  // 2d 定位
  setByOl(result) {
    // 获取全部id图形边界范围
    const ids = result.ids;
    let extent = ol.Extent.createEmpty();
    ids.forEach(id => {
      const feature = getFeatureFromAllLayerById(olMap, id);
      if (feature) {
        if (feature.getGeometry())
          ol.Extent.extend(extent, feature.getGeometry().getExtent());
      } else {
        const routeData = getRouteDataFromAllLayerById(olMap, id);
        routeData.forEach(({ feature }) => {
          if (feature.getGeometry())
            ol.Extent.extend(extent, feature.getGeometry().getExtent());
        });
      }
    });
    // 无有效图形不定位
    if (ol.Extent.isEmpty(extent)) return;
    // 定位到指定范围，确保地图完全展示 extent 后自动调整缩放级别
    this.zoomToExtent(extent);
  }
  /**
   * 定位到指定范围，确保地图完全展示 extent 后自动调整缩放级别
   */
  zoomToExtent(extent) {
    setTimeout(() => {
      const view = olMap.getView();
      const { maxZoom } = getFitExtentAutoZoom(olMap, extent);
      view.fit(extent, {
        duration: 0,
        padding: [200, 200, 200, 200],
        maxZoom
      });
    });
  }
  destroy() {
    this.mapEmitterOff();
  }
}
const geometryOpreateLocate = () => {
  return new GeometryOpreateLocate();
};
export { geometryOpreateLocate };
