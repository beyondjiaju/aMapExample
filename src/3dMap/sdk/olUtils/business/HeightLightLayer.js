import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import {
  getLayerById,
  getColorAlpha,
  featureChanged
} from "@/3dMap/sdk/olUtils";
import { treeImage } from "@/3dMap/utils/mapEvents/layerTree/config";
/**创建 HeightLightLayer
 */
class HeightLightLayer {
  constructor(map) {
    this.map = map || null;
    this.hightLightLayers = {};
  }
  /**根据id添加layer 目前仅支持olMap中layer操作
   * @param { String } id layer.id
   * @param { Object } option
   * @param { String } option.color 颜色 default:#ff0000
   * @param { Number } option.alpha 透明度 default:layer.properties.fillAlpha || 0.5
   */
  addById(id, option) {
    const that = this;
    const defaultOption = {
      color: "#ff0000",
      alpha: 0.5
    };
    option = Object.assign(defaultOption, option);
    if (!id) return null;
    const layer = getLayerById(that.map, id);
    if (!layer) return null;
    const ret = that.add(layer, option);
    return ret;
  }
  /**根据已有layer处理
   * @param { Object } layer
   * @param { Object } option
   * @param { String } option.color 颜色 default:#ff0000
   * @param { Number } option.alpha 透明度 default:layer.properties.fillAlpha || 0.5
   */
  add(layer, option) {
    const that = this;
    const defaultOption = {
      color: "#ff0000",
      alpha: 0.5
    };
    // 实体属性
    const properties = layer.get("properties") || {
      fillColor: "#DEDEDE",
      fillAlpha: 0.5,
      outlineColor: "#DEDEDE",
      outlineAlpha: 1
    };
    // 替换填充透明度（透明度为0的实体高亮不受影响）
    if (properties.fillAlpha && properties.fillAlpha > 0)
      defaultOption.alpha = properties.fillAlpha;
    // 合并参数
    option = Object.assign(defaultOption, option);
    option.outlineColor = option.color;
    option.outlineAlpha = properties.outlineAlpha;
    // 存实体包含类型
    layer
      .getSource()
      .getFeatures()
      .forEach(feature => {
        featureChanged(feature, option);
      });
    // 记录
    const ret = {
      id: layer.get("id"),
      layer,
      properties,
      hlColor: option.color
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
  remove(layer) {
    const id = layer.get("id");
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
    addReturn.layer
      .getSource()
      .getFeatures()
      .forEach(feature => {
        featureChanged(feature, properties);
      });
    this.hightLightLayers[addReturn.id] = null;
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
      if (addReturn) allLayer.push(addReturn.layer);
    }
    return allLayer;
  }
  destroy() {
    this.removeAll();
    this.hightLightLayers = null;
    this.map = null;
  }
}
export { HeightLightLayer };
