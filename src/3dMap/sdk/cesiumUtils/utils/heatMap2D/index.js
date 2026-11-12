import * as Cesium from "@/3dMap/sdk/cesium";
import CesiumHeatmap from "./js/CesiumHeatmap";
import getHeatMapOption from "./js/getHeatMapOption";
class HeatMap2D {
  constructor(viewer) {
    this.viewer = viewer;
    this.heatMaps = [];
  }
  /**添加热力图
   * @param {Array} data [{x: 110, y: 120, value: 50}]
   * @param {Object} options
   * @param {Number} options-radius 半径
   * @param {Number} options-maxOpacity 最大值透明度
   * @param {Number} options-minOpacity 最小值透明度
   * @param {Array} options-values 图例数值
   * @param {Array} options-colors 图例颜色
   * @param {Object} options-gradient 热力图色度表
   * values、colors 长度必须一致 values、colors / gradient 输入二选一 values、colors优先
   * gradient
   * 输入values与colors自动生成，未输入读取传入gradient,未传入使用默认配置
   */
  add(data, options) {
    // 计算 bounds
    let cartesians = [];
    let minValue, maxValue;
    data.forEach(val => {
      cartesians.push(Cesium.Cartesian3.fromDegrees(val.x, val.y));
      // 最大值
      if (!maxValue || val.value > maxValue) maxValue = val.value;
      if (!minValue || val.value < minValue) minValue = val.value;
    });
    // 获取加载option
    const heatMapOption = getHeatMapOption(options, minValue, maxValue);
    // 获取边界
    let rectangle = Cesium.Rectangle.fromCartesianArray(cartesians);
    let bounds = {
      west: Cesium.Math.toDegrees(rectangle.west),
      east: Cesium.Math.toDegrees(rectangle.east),
      south: Cesium.Math.toDegrees(rectangle.south),
      north: Cesium.Math.toDegrees(rectangle.north)
    };
    // 创建
    let heatMap = CesiumHeatmap.create(this.viewer, bounds, heatMapOption);
    // 排序
    let values = data.sort((a, b) => {
      return a.value - b.value;
    });
    let valueMin = values[0].value;
    let valueMax = values[values.length - 1].value;
    heatMap.setWGS84Data(valueMin, valueMax, data);
    this.heatMaps.push(heatMap);
    // 返回结果
    return heatMap;
  }
  /**删除
   * @param {Object} add result
   */
  remove(heatMap) {
    this.viewer.entities.remove(heatMap._layer);
    if (heatMap._container) document.body.removeChild(heatMap._container);
  }
  /**清空全部热力图 */
  removeAll() {
    if (this.heatMaps) {
      this.heatMaps.forEach(heatMap => {
        if (heatMap) this.remove(heatMap);
      });
      this.heatMap = [];
    }
  }
  /**注销 */
  destroy() {
    this.removeAll();
    this.viewer = null;
  }
}
export { HeatMap2D };
