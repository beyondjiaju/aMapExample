import { mapEmitter } from "@/3dMap/interface";
import { viewer, olMap } from "@/3dMap/global";
import {
  HeightLightEntity,
  getEntityFromAllCollectionById,
  getRouteDataFromAllCollectionById
} from "@/3dMap/sdk/cesiumUtils";
import {
  getFeatureFromAllLayerById,
  getRouteDataFromAllLayerById,
  HeightLightFeature
} from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";
/**监听 */
class GeometryOpreateHightLight {
  newHeightLightEntity: any;
  newHeightLightFeature: any;
  mapEmitterOff: any;
  history: any;
  color: any;
  alpha: any;
  constructor(option: any = {}) {
    // 以对象入参确定高亮颜色与透明度，后续高亮沿用
    this.color = option.color ?? "#ff1493";
    this.alpha = option.alpha ?? 0.5;
    this.newHeightLightEntity = new HeightLightEntity(viewer);
    this.newHeightLightFeature = new HeightLightFeature(olMap);
    this.history = [];
    this.mapEmitterOff = {};
    // 地图模式变化由 emitSdkUtilsMapModeChange 驱动
    this.mapEmitterOff.mapModeChangeGeometryOpreateHightLight = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      () => {
        this.newHeightLightEntity.removeAll();
        this.newHeightLightFeature.removeAll();
        if (this.history.length) {
          // 切换后按历史数据直接重放高亮，不再走事件监听
          this.add(this.history);
        }
      }
    );
  }
  /** 添加高亮，颜色与透明度使用初始化时传入的值 */
  add(ids) {
    this.setHeightLight({
      hightLight: true,
      ids
    });
  }
  /** 移除高亮，内部走 setHeightLight */
  remove(ids) {
    this.setHeightLight({
      hightLight: false,
      ids
    });
  }
  /**高亮数据
   * ids 高亮图形 id Array
   * hightLight 是否高亮
   */
  setHeightLight(result) {
    const heightLightColor = this.color;
    const heightLightAlpha = this.alpha;
    // 移除高亮
    result.ids.forEach(id => {
      const mapMode = mapData().mapMode;
      const index = this.history.indexOf(id);
      if (result.hightLight) {
        if (index < 0) this.history.push(id);
      } else if (index >= 0) {
        this.history.splice(index, 1);
      }
      if (mapMode === "cesium") {
        this.setByCesium({
          id,
          hightLight: result.hightLight,
          heightLightColor,
          heightLightAlpha
        });
      }
      if (mapMode === "ol") {
        this.setByOl({
          id,
          hightLight: result.hightLight,
          heightLightColor,
          heightLightAlpha
        });
      }
    });
  }
  // 根据高亮数据与图形properties获取当前样式
  getStyle(option, properties) {
    const color = option.hightLight
      ? option.heightLightColor
      : properties.fillColor;
    const alpha =
      option.hightLight && option.heightLightAlpha
        ? option.heightLightAlpha
        : properties.fillAlpha;
    return {
      color,
      alpha
    };
  }
  // 3d
  setByCesium(option) {
    const entity = getEntityFromAllCollectionById(viewer, option.id);
    if (entity) {
      this.heightLightEntity(entity, option);
    } else {
      const routeData = getRouteDataFromAllCollectionById(viewer, option.id);
      routeData.forEach(({ entity }) => {
        this.heightLightEntity(entity, option);
      });
    }
  }
  /**3d 高亮 */
  heightLightEntity(entity, option) {
    const properties = entity.properties?.getValue(viewer.clock.currentTime);
    const style = this.getStyle(option, properties);
    this.newHeightLightEntity.add(entity, style);
  }
  // 2d
  setByOl(option) {
    const feature = getFeatureFromAllLayerById(olMap, option.id);
    if (feature) {
      this.heightLightFeature(feature, option);
    } else {
      const routeData = getRouteDataFromAllLayerById(olMap, option.id);
      routeData.forEach(({ feature }) => {
        this.heightLightFeature(feature, option);
      });
    }
  }
  /**2d 高亮 */
  heightLightFeature(feature, option) {
    const properties = feature.get("properties");
    const style = this.getStyle(option, properties);
    this.newHeightLightFeature.add(feature, style);
  }
  destroy() {
    this.newHeightLightEntity.destroy();
    this.newHeightLightFeature.destroy();
    for (let key in this.mapEmitterOff) {
      this.mapEmitterOff[key]();
    }
  }
}
const geometryOpreateHightLight = (option = {}) => {
  return new GeometryOpreateHightLight(option);
};
export { geometryOpreateHightLight };
