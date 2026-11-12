import * as Cesium from "@/3dMap/sdk/cesium";
import {
  PolylineAntialiasingMaterialProperty,
  PolylineImageMaterialProperty,
  getEntityFromAllCollectionById,
  getRouteDataFromAllCollectionById
} from "@/3dMap/sdk/cesiumUtils";
import { treeImage } from "@/3dMap/utils/mapEvents/layerTree/config";
import getLineMaterialByLineType from "./getLineMaterialByLineType";
/**创建HeightLightEntity
 */
class HeightLightEntity {
  constructor(viewer) {
    this.viewer = viewer || null;
    // 配置类型才能高亮
    this.hightLightEntityColorType = {
      billboard: "color",
      model: "color",
      point: "color",
      label: "fillColor",
      polygon: "material",
      polyline: "material",
      rectangle: "material",
      ellipse: "material",
      corridor: "material",
      wall: "material"
    };
    this.hightLightEntities = {};
  }
  /**根据id添加实体（支持 viewer.entities、各 dataSource 及 route）
   * @param { String } id entity.id 或航线 useId
   * @param { Object } option
   * @param { String } option.color 颜色 default:red
   * @param { Number } option.alpha 透明度 default:entity.properties.fillAlpha || 0.5
   */
  addById(id, option) {
    const that = this;
    const defaultOption = {
      color: "red",
      alpha: 0.5
    };
    option = Object.assign(defaultOption, option);
    if (!id) return null;
    const entity = getEntityFromAllCollectionById(that.viewer, id);
    if (entity) {
      return that.add(entity, option);
    }
    // route：按航线 useId 高亮全部航段
    const routeData = getRouteDataFromAllCollectionById(that.viewer, id);
    if (!routeData.length) return null;
    let ret = null;
    routeData.forEach(({ entity: routeEntity }) => {
      ret = that.add(routeEntity, option);
    });
    return ret;
  }
  /**添加实体
   * @param { Object } entity
   * @param { Object } option
   * @param { String } option.color 颜色 default:red
   * @param { Number } option.alpha 透明度 default:entity.properties.fillAlpha || 0.5
   */
  add(entity, option) {
    const that = this;
    const defaultOption = {
      color: "red",
      alpha: 0.5
    };
    // 实体属性
    const properties = entity.properties
      ? entity.properties.getValue(that.viewer.clock.currentTime)
      : {
          fillColor: "#DEDEDE",
          fillAlpha: 0.5,
          outlineColor: "#DEDEDE",
          outlineAlpha: 1,
          lineOutlineWidth: 4,
          lineOutlineColor: "#ffffff",
          dashLength: 16
        };
    // 替换填充透明度（透明度为0的实体高亮不受影响）
    if (properties.fillAlpha && properties.fillAlpha > 0)
      defaultOption.alpha = properties.fillAlpha;
    // 合并参数
    option = Object.assign(defaultOption, option);
    // 颜色设置
    const hlColor = Cesium.defaultValue(option.color, "red");
    const color = Cesium.Color.fromCssColorString(hlColor);
    const colorWithAlpha = color.withAlpha(
      Cesium.defaultValue(option.alpha, 0.5)
    );
    // 存实体包含类型
    const types = [];
    for (const key of Object.keys(that.hightLightEntityColorType)) {
      if (entity[key]) {
        types.push(key);
      }
    }
    if (types.length < 1) return null;
    // 改颜色
    types.map(type => {
      const geometryType = that.hightLightEntityColorType[type];
      if (type == "polyline") {
        // 线单独处理
        if (properties.geometryTypeCode === "DATA_EF") {
          // 电子围栏边线样式
          entity[type][geometryType] = new PolylineImageMaterialProperty({
            image: treeImage.dzwlLineImg,
            color: color,
            imageWidth: 80
          });
        } else {
          const lineColor = properties.polylineReplaceOutline
            ? color
            : colorWithAlpha;
          const material = getLineMaterialByLineType(
            properties.lineType,
            lineColor,
            properties
          );
          entity[type][geometryType] = material;
        }
      } else {
        // 颜色配置
        let typeColor = colorWithAlpha;
        if (["billboard", "label"].indexOf(type) >= 0) typeColor = color;
        entity[type][geometryType] = typeColor;
        // 电子围栏边线保持原色
        if (entity[type].outline && properties.geometryTypeCode !== "EF") {
          entity[type].outlineColor = color;
        }
      }
    });
    // 记录
    const ret = {
      id: entity.id,
      entity,
      types,
      properties,
      hlColor
    };
    that.hightLightEntities[ret.id] = ret;
  }
  /**根据id删除高亮 */
  removeById(id) {
    const addReturn = this.hightLightEntities[id];
    // 存在移除
    if (addReturn) this.removeByAddReturn(addReturn);
  }
  /**根据实体移除高亮 */
  remove(entity) {
    const id = entity.id;
    this.removeById(id);
  }
  /**根据添加返回值移除高亮
   * @param {Object} hightLightById 方法返回值
   */
  removeByAddReturn(addReturn) {
    if (!addReturn || !addReturn.id) return;
    const _properties = Object.assign(
      {
        fillColor: "#DEDEDE",
        fillAlpha: 0.5,
        outlineColor: "#DEDEDE",
        outlineAlpha: 1
      },
      addReturn.properties
    );
    addReturn.types.map(type => {
      const color = Cesium.Color.fromCssColorString(
        _properties.fillColor
      ).withAlpha(_properties.fillAlpha);
      const outlineColor = Cesium.Color.fromCssColorString(
          _properties.outlineColor
        ).withAlpha(_properties.outlineAlpha),
        geometryType = this.hightLightEntityColorType[type];
      if (type == "polyline") {
        const lineType = addReturn.properties.lineType;
        const lineColor = addReturn.properties.polylineReplaceOutline
          ? outlineColor
          : color;
        const material = getLineMaterialByLineType(
          lineType,
          lineColor,
          addReturn.properties
        );
        addReturn.entity[type][geometryType] = material;
      } else {
        if (type == "label" && _properties.textColor) {
          const labelColor = Cesium.Color.fromCssColorString(
            _properties.textColor
          );
          addReturn.entity[type][geometryType] = labelColor;
        } else {
          addReturn.entity[type][geometryType] = color;
          if (addReturn.entity[type].outline) {
            addReturn.entity[type].outlineColor = outlineColor;
          }
        }
      }
    });
    this.hightLightEntities[addReturn.id] = null;
  }
  /**移除全部高亮
   * @param {Object} add相关方法返回值
   */
  removeAll() {
    const that = this;
    // 遍历记录
    for (const key in that.hightLightEntities) {
      const addReturn = that.hightLightEntities[key];
      // 存在移除
      if (addReturn) that.removeByAddReturn(addReturn);
    }
    that.hightLightEntities = {};
  }
  /**获取全部高亮实体 */
  getAll() {
    const that = this;
    const allEntities = [];
    // 遍历记录
    for (const key in that.hightLightEntities) {
      const addReturn = that.hightLightEntities[key];
      // 存在移除
      if (addReturn) allEntities.push(addReturn.entity);
    }
    return allEntities;
  }
  destroy() {
    this.removeAll();
    this.hightLightEntities = null;
    this.hightLightEntityColorType = null;
    this.viewer = null;
  }
}
export { HeightLightEntity };
