import OlHeatmap from "./js/OlHeatmap";
import getHeatMapOption from "./js/getHeatMapOption";
class HeatMap2D {
  constructor(olMap) {
    this.olMap = olMap;
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
    // 计算数值最大最小值
    let minValue, maxValue;
    const lons = [],
      lats = [];
    data.forEach(val => {
      lons.push(val.x);
      lats.push(val.y);
      // 最大值
      if (!maxValue || val.value > maxValue) maxValue = val.value;
      if (!minValue || val.value < minValue) minValue = val.value;
    });
    // 获取加载option
    const heatMapOption = getHeatMapOption(options, minValue, maxValue);
    // 获取边界（WGS84）
    let bounds = {
      west: Math.min(...lons),
      east: Math.max(...lons),
      south: Math.min(...lats),
      north: Math.max(...lats)
    };
    // 创建
    let heatMap = OlHeatmap.create(this.olMap, bounds, heatMapOption);
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
    this.olMap.removeLayer(heatMap._layer);
    if (heatMap._container) document.body.removeChild(heatMap._container);
  }
  /**清空全部热力图 */
  removeAll() {
    if (this.heatMaps) {
      this.heatMaps.forEach(heatMap => {
        if (heatMap) this.remove(heatMap);
      });
      this.heatMaps = [];
    }
  }
  /**注销 */
  destroy() {
    this.removeAll();
    this.olMap = null;
  }
}
export { HeatMap2D };
