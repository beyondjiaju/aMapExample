import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer, olMap } from "@/3dMap/global";
import {
  DrawHandler as DrawHandlerCesium,
  RectanglePick as RectanglePickCesium,
  getEntityFromAllCollectionById,
  getRouteDataFromAllCollectionById
} from "@/3dMap/sdk/cesiumUtils";
import {
  DrawHandler as DrawHandlerOl,
  RectanglePick as RectanglePickOl,
  getFeatureFromAllLayerById,
  getRouteDataFromAllLayerById
} from "@/3dMap/sdk/olUtils";
import { getAirlineUseData } from "@/3dMap/utils/mapEvents/layerTree/utils";
import { message } from "@/3dMap/interface";
import mapData from "@/3dMap/store/map";
import { geometryOpreateHightLight } from "@/3dMap/sdkUtils/geometryOpreate/geometryOpreateHightLight";
class Pick {
  constructor(option) {
    const that = this;
    this.pointIsDrillPick = option.pointIsDrillPick || false;
    this.filterData = option.filterData || {};
    this.endCallBack = option.endCallBack || null;
    // 图形高亮对象，以对象入参传入颜色与透明度，后续高亮沿用
    this.newGeometryOpreateHightLight = geometryOpreateHightLight({
      color: option.color,
      alpha: option.alpha ?? 0.8
    });
    // 拾取存储
    this.pickData = {};
    // 初始化绘制对象
    this.newDrawHandlerByMode = {
      cesium: new DrawHandlerCesium(viewer),
      ol: new DrawHandlerOl(olMap)
    };
    for (let mode in this.newDrawHandlerByMode) {
      this.newDrawHandlerByMode[mode].drawFinished.addEventListener(shap => {
        that.newDrawHandlerByMode[mode].remove(shap);
        that.drawEndCallback(shap);
      });
    }
    // 初始化框选对象
    this.newRectanglePickByMode = {
      cesium: new RectanglePickCesium(viewer),
      ol: new RectanglePickOl(olMap)
    };
    for (let mode in this.newRectanglePickByMode) {
      this.newRectanglePickByMode[mode].pickEnd.addEventListener(result => {
        const mapMode = mapData().mapMode;
        // 相同id数据过滤 处理拼凑图形选中重复问题
        let newResult = [];
        if (mapMode === "cesium") {
          result.forEach((shap, index) => {
            const properties = shap.properties.getValue(
              viewer.clock.currentTime
            );
            const properties_use = getAirlineUseData(properties);
            const hasIds = newResult.find(item => {
              const propertiesItem = item.properties.getValue(
                viewer.clock.currentTime
              );
              const propertiesItem_use = getAirlineUseData(propertiesItem);
              if (propertiesItem_use.id == properties_use.id) {
                return true;
              }
            });
            if (!hasIds) {
              newResult.push(shap);
            }
          });
        }
        if (mapMode === "ol") {
          newResult = result;
        }
        that.pickEndCallback(newResult);
      });
    }
  }
  /**获取拾取结果 */
  getPickData() {
    const ret = [];
    for (const properties of Object.values(this.pickData)) {
      if (properties) {
        ret.push(properties);
      }
    }
    return ret;
  }
  /**开始拾取
   * @param { String } type 拾取类型
   */
  start(type, options) {
    this.newDrawHandlerByMode[mapData().mapMode].start(type, options);
  }
  /**结束拾取 */
  stop() {
    for (let mode in this.newDrawHandlerByMode) {
      this.newDrawHandlerByMode[mode].stop();
    }
  }
  drawEndCallback(shap) {
    const that = this;
    // 获取绘制图形数据
    const mapMode = mapData().mapMode;
    let properties;
    if (mapMode === "cesium") {
      properties = shap.properties.getValue(viewer.clock.currentTime);
    }
    if (mapMode === "ol") {
      properties = shap.get("properties");
    }
    if (properties.type == "point") {
      if (mapMode === "cesium") {
        that.pointPickCesium(properties);
      }
      if (mapMode === "ol") {
        that.pointPickOl(properties);
      }
    } else {
      setTimeout(() => {
        if (!properties.coordinates) return;
        that.filterFromTypeCoordinates(properties.coordinates, properties.type);
      }, 100);
    }
  }
  filterFromTypeCoordinates(coordinates, type) {
    const typeNew = type == "polyline" ? "polyline" : "polygon";
    this.newRectanglePickByMode[mapData().mapMode].filterFromCoordinates(
      coordinates,
      typeNew
    );
  }
  /**点拾取-cesium */
  pointPickCesium(shapData) {
    let entities = [];
    const windowCoord = viewer.scene.cartesianToCanvasCoordinates(
      Cesium.Cartesian3.fromDegrees(
        shapData.coordinate[0],
        shapData.coordinate[1]
      )
    );
    if (this.pointIsDrillPick) {
      // 深度拾取
      const pickedObjects = viewer?.scene?.drillPick(windowCoord);
      if (!pickedObjects.length) return;
      for (let i = 0; i < pickedObjects.length; i++) {
        const pick = pickedObjects[i];
        const entity = Cesium.defaultValue(pick.id, pick.primitive.id);
        if (entity instanceof Cesium.Entity && entity.properties) {
          entities.push(entity);
        }
      }
    } else {
      // 单点拾取
      const pick = viewer.scene.pick(windowCoord);
      if (Cesium.defined(pick)) {
        // 获取实体
        const entity = Cesium.defaultValue(pick.id, pick.primitive.id);
        if (entity instanceof Cesium.Entity && entity.properties) {
          entities.push(entity);
        }
      }
    }
    if (entities?.length) this.pickEndCallback(entities);
  }
  /**点拾取-ol */
  pointPickOl(shapData) {
    const pixel = olMap.getPixelFromCoordinate(shapData.coordinate);
    let features = [];
    olMap.forEachFeatureAtPixel(pixel, (feature, layer) => {
      if (feature.get("properties")) {
        features.push(feature);
      }
      if (!this.pointIsDrillPick && features.length) {
        return true;
      }
    });
    if (features?.length) this.pickEndCallback(features);
  }
  pickEndCallback(result) {
    const mapMode = mapData().mapMode;
    let endCallBackRet = [];
    result.forEach(shap => {
      let canPickByFilter = true;
      let properties;
      let shapShow = true;
      if (mapMode === "cesium") {
        shapShow = shap.show;
        properties = shap.properties.getValue(viewer.clock.currentTime);
      }
      if (mapMode === "ol") {
        properties = shap.get("properties");
      }
      if (!properties || !properties.canPickUp) return;
      const properties_use = getAirlineUseData(properties);
      // 根据过滤属性配置过滤选取图形
      for (const [key, value] of Object.entries(this.filterData)) {
        if (!properties_use[key]) {
          canPickByFilter = false;
          return;
        }
        if (key == "geometryType" && value.indexOf(properties_use[key]) < 0) {
          canPickByFilter = false;
        }
        if (key != "geometryType" && properties_use[key] != value) {
          canPickByFilter = false;
        }
      }
      if (canPickByFilter && shapShow) {
        // route处理
        let id = properties_use.id;
        // 存储
        if (this.pickData[id]) {
          Reflect.deleteProperty(this.pickData, id);
          this.newGeometryOpreateHightLight.remove([id]);
        } else {
          this.pickData[id] = properties_use;
          this.newGeometryOpreateHightLight.add([id]);
        }
        // 拾取自动确认返回数据存储
        endCallBackRet.push(properties_use);
      }
    });
    // endCallBack返回拾取数据
    if (this.endCallBack) {
      this.endCallBack(endCallBackRet);
    }
  }
  /**
   * 按当前 mapMode 从全局图层中动态获取 properties 并加入拾取
   * @param { String|Number } id 空域/航线使用 id
   */
  addById(id) {
    if (!id) return;
    const properties_use = this.getPropertiesById(id);
    if (!properties_use?.id) return;
    const useId = properties_use.id;
    this.pickData[useId] = properties_use;
    this.newGeometryOpreateHightLight.add([useId]);
  }
  /**
   * 按当前 mapMode 移除拾取高亮
   * @param { String|Number } id 空域/航线使用 id
   */
  removeById(id) {
    if (!id) return;
    const properties_use = this.getPropertiesById(id);
    const useId = properties_use?.id || id;
    this.newGeometryOpreateHightLight.remove([useId]);
    Reflect.deleteProperty(this.pickData, useId);
  }
  /**
   * 按 mapMode 从全局图层/实体集合中获取图形 properties（含 route）
   * @param { String|Number } id
   * @returns { Object|null }
   */
  getPropertiesById(id) {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium") {
      const entity = getEntityFromAllCollectionById(viewer, id);
      if (entity?.properties) {
        return getAirlineUseData(
          entity.properties.getValue(viewer.clock.currentTime)
        );
      }
      const routeData = getRouteDataFromAllCollectionById(viewer, id);
      if (routeData.length) {
        return getAirlineUseData(
          routeData[0].entity.properties.getValue(viewer.clock.currentTime)
        );
      }
    }
    if (mapMode === "ol") {
      const feature = getFeatureFromAllLayerById(olMap, id);
      if (feature) {
        return getAirlineUseData(feature.get("properties"));
      }
      const routeData = getRouteDataFromAllLayerById(olMap, id);
      if (routeData.length) {
        return getAirlineUseData(routeData[0].feature.get("properties"));
      }
    }
    return null;
  }
  /**清空拾取 */
  removeAll() {
    for (const id of Object.keys(this.pickData)) {
      this.removeById(id);
    }
    this.pickData = {};
  }
  /**注销组件 */
  destroy() {
    this.stop();
    this.removeAll();
    this.newGeometryOpreateHightLight?.destroy();
    this.pickData = null;
    for (let mode in this.newDrawHandlerByMode) {
      this.newDrawHandlerByMode[mode].destroy();
    }
  }
}
const pick = filterData => {
  return new Pick(filterData);
};
export { pick };
