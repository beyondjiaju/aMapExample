import * as Cesium from "@/3dMap/sdk/cesium";
/**创建Graticules 经纬度网格线
 */
class Graticules {
  /**
   * 初始化Graticules
   * @param {Object} viewer - viewer对象
   * @param {Number} options.width 线宽度 default：1
   * @param {Number} options.color 线颜色 default：#fff
   * @param {Number} options.interval 间隔 default：60 默认60分 1度
   * @param {Boolean} options.show 线显示状态 default：true
   */
  constructor(viewer, options) {
    const that = this;
    const defaultOptions = {
      width: 1,
      color: "#fff",
      interval: 60,
      show: true
    };
    options = Object.assign(defaultOptions, options);
    // 记录viewer
    that.viewer = viewer;
    // 设置抗锯齿
    that.viewer.scene.postProcessStages.fxaa.enabled = true;
    // 添加线集合
    that.lines = that.viewer.scene.primitives.add(
      new Cesium.PolylineCollection()
    );
    that.lines.show = options.show;
    // 绘制经线
    const lon_distance = (1 / 60) * options.interval;
    for (let lon = -180; lon < 180; lon += lon_distance) {
      const lon_positions = [];
      for (let lat = -90; lat <= 90; lat += 3) {
        const position = Cesium.Cartesian3.fromDegrees(lon, lat);
        lon_positions.push(position);
      }
      that.lines.add({
        positions: lon_positions,
        width: options.width,
        material: new Cesium.Material({
          fabric: {
            type: "Color",
            uniforms: {
              color: Cesium.Color.fromCssColorString(options.color).withAlpha(
                0.5
              )
            }
          }
        })
      });
    }
    // 绘制纬线
    const lat_distance = (1 / 60) * options.interval;
    // 计算纬度线的位置
    for (let lat = -90; lat <= 90; lat += lat_distance) {
      const lat_positions = [];
      for (let lon = -180; lon <= 180; lon += 3) {
        const position = Cesium.Cartesian3.fromDegrees(lon, lat);
        lat_positions.push(position);
      }
      that.lines.add({
        positions: lat_positions,
        width: options.width,
        material: new Cesium.Material({
          fabric: {
            type: "Color",
            uniforms: {
              color: Cesium.Color.fromCssColorString(options.color).withAlpha(
                0.5
              )
            }
          }
        })
      });
    }
  }
  /**
   * 注销集合
   */
  destroy() {
    this.viewer = null;
  }
}
export { Graticules };
