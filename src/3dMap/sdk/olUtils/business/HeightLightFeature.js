import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import {
  getFeatureFromAllLayerById,
  getRouteDataFromAllLayerById,
  featureChanged
} from "@/3dMap/sdk/olUtils";
import { treeImage } from "@/3dMap/utils/mapEvents/layerTree/config";
import { cloneDeep } from "lodash";
/**创建 HeightLightFeature
 */
class HeightLightFeature {
  constructor(map) {
    this.map = map || null;
    this.hightLightLayers = {};
  }
  /**根据id添加feature（支持全部矢量图层及 route）
   * @param { String } id feature.id 或航线 useId
   * @param { Object } option
   * @param { String } option.color 颜色 default:#ff0000
   * @param { Number } option.alpha 透明度 default:feature.properties.fillAlpha || 0.5
   */
  addById(id, option) {
    const that = this;
    const defaultOption = {
      color: "#ff0000",
      alpha: 0.5
    };
    option = Object.assign(defaultOption, option);
    if (!id) return null;
    const feature = getFeatureFromAllLayerById(that.map, id);
    if (feature) {
      return that.add(feature, option);
    }
    // route：按航线 useId 高亮全部航段
    const routeData = getRouteDataFromAllLayerById(that.map, id);
    if (!routeData.length) return null;
    let ret = null;
    routeData.forEach(({ feature: routeFeature }) => {
      ret = that.add(routeFeature, option);
    });
    return ret;
  }
  /**根据已有layer处理
   * @param { Object } feature
   * @param { Object } option
   * @param { String } option.color 颜色 default:#ff0000
   * @param { Number } option.alpha 透明度 default:feature.properties.fillAlpha || 0.5
   */
  add(feature, option) {
    const that = this;
    const defaultOption = {
      color: "#ff0000",
      alpha: 0.5
    };
    // 实体属性
    const properties = feature.get("properties") || {
      fillColor: "#DEDEDE",
      fillAlpha: 0.5,
      outlineColor: "#DEDEDE",
      outlineAlpha: 1
    };
    // 替换填充透明度（透明度为0的实体高亮不受影响）
    if (properties.fillAlpha && properties.fillAlpha > 0)
      defaultOption.alpha = properties.fillAlpha;
    // 合并参数
    let optionNew = Object.assign(cloneDeep(defaultOption), option);
    if (!optionNew.color) optionNew.color = defaultOption.color;
    optionNew.outlineColor = optionNew.color;
    optionNew.outlineAlpha = properties.outlineAlpha;
    // 存实体包含类型
    featureChanged(feature, optionNew);
    // 记录
    const ret = {
      id: feature.get("id") || feature.getId(),
      feature,
      properties,
      hlColor: optionNew.color
    };
    that.hightLightLayers[ret.id] = ret;
  }
  /**根据id删除高亮 */
  removeById(id) {
    const addReturn = this.hightLightLayers[id];
    // 存在移除
    if (addReturn) this.removeByAddReturn(addReturn);
  }
  /**根据实体移除高亮 */
  remove(feature) {
    const id = feature.get("id");
    this.removeById(id);
  }
  /**根据添加返回值移除高亮
   * @param {Object} hightLightById 方法返回值
   */
  removeByAddReturn(addReturn) {
    if (!addReturn || !addReturn.id) return;
    const properties = Object.assign(
      {
        fillColor: "#DEDEDE",
        fillAlpha: 0.5,
        outlineColor: "#DEDEDE",
        outlineAlpha: 1
      },
      addReturn.properties
    );
    featureChanged(addReturn.feature, properties);
    delete this.hightLightLayers[addReturn.id];
  }
  /**移除全部高亮
   * @param {Object} add相关方法返回值
   */
  removeAll() {
    const that = this;
    // 遍历记录
    for (const key in that.hightLightLayers) {
      const addReturn = that.hightLightLayers[key];
      // 存在移除
      if (addReturn) that.removeByAddReturn(addReturn);
    }
    that.hightLightLayers = {};
  }
  /**获取全部高亮实体 */
  getAll() {
    const that = this;
    const allLayer = [];
    // 遍历记录
    for (const key in that.hightLightLayers) {
      const addReturn = that.hightLightLayers[key];
      // 存在移除
      if (addReturn) allLayer.push(addReturn.feature);
    }
    return allLayer;
  }
  destroy() {
    this.removeAll();
    this.hightLightLayers = null;
    this.map = null;
  }
}
export { HeightLightFeature };
