import * as Cesium from "@/3dMap/sdk/cesium";
/**创建雷达扫描对象
 * @param {Object} viewer 对象
 */
class RadarScan {
  constructor(viewer) {
    this.viewer = viewer;
    this.dataSource = new Cesium.CustomDataSource("雷达扫描");
    this.viewer.dataSources.add(this.dataSource);
    this.listeners = {};
  }
  /**添加雷达
   * @param {Object} options
   * @param {String} options.id
   * @param {Array} options.position 坐标 Cartesian3
   * @param {Number} options.radius 半径
   * @param {String} options.style 类型 default:down(up/down)
   * @param {Object} options.color 雷达颜色 Cesium.Color
   * @param {Boolean} options.outline 雷达边线
   * @param {Object} options.outlineColor 雷达边线 Cesium.Color
   * @param {Number} options.outerWidth 雷达边线宽度
   * @param {Object} options.scanColor 雷达扫描颜色 Cesium.Color
   * @param {Object} options.properties 属性信息
   * return entity
   */
  add(options) {
    const that = this;
    const defaultOptions = {
      id: Cesium.createGuid(),
      radius: 20000,
      style: "down",
      color: Cesium.Color.WHITE.withAlpha(0.2),
      scanColor: Cesium.Color.WHITE.withAlpha(0.4),
      outline: true,
      outlineColor: Cesium.Color.WHITE.withAlpha(0.4),
      outerWidth: 1
    };
    options = Object.assign(defaultOptions, options);
    let heading = 0;
    const position_carto = Cesium.Cartographic.fromCartesian(options.position);
    let positionArray = that.calcPoints(
      Cesium.Math.toDegrees(position_carto.longitude),
      Cesium.Math.toDegrees(position_carto.latitude),
      options.radius,
      heading,
      options.style
    );
    // ellipsoid
    const defaultEllipsoid = {
      radii: new Cesium.Cartesian3(
        options.radius,
        options.radius,
        options.radius
      ),
      material: options.color,
      outline: options.outline,
      outlineColor: options.outlineColor,
      outerWidth: options.outerWidth
    };
    let ellipsoid_style;
    if (options.style == "up") {
      ellipsoid_style = {
        minimumCone: Cesium.Math.toRadians(90)
      };
    } else {
      ellipsoid_style = {
        maximumCone: Cesium.Math.toRadians(90)
      };
    }
    const ellipsoid = Object.assign(defaultEllipsoid, ellipsoid_style);
    // 高度
    const height = options.style == "up" ? options.radius : 0;
    // 添加
    const radarEntity = that.dataSource.entities.add({
      id: options.id,
      position: Cesium.Cartesian3.fromRadians(
        position_carto.longitude,
        position_carto.latitude,
        height
      ),
      ellipsoid,
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          return new Cesium.PolygonHierarchy(positionArray);
        }, false),
        material: options.scanColor,
        perPositionHeight: true
      },
      properties: options.properties
    });
    // 执行动画效果
    const listener = () => {
      heading += 2;
      positionArray = that.calcPoints(
        Cesium.Math.toDegrees(position_carto.longitude),
        Cesium.Math.toDegrees(position_carto.latitude),
        options.radius,
        heading,
        options.style
      );
    };
    that.viewer.scene.postRender.addEventListener(listener);
    that.listeners[options.id] = listener;
    return radarEntity;
  }
  calcPoints(x1, y1, radius, heading, style) {
    const m = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(x1, y1)
    );
    const rx = radius * Math.cos((heading * Math.PI) / 180);
    const ry = radius * Math.sin((heading * Math.PI) / 180);
    const translation = Cesium.Cartesian3.fromElements(rx, ry, 0);
    const d = Cesium.Matrix4.multiplyByPoint(
      m,
      translation,
      new Cesium.Cartesian3()
    );
    const c = Cesium.Cartographic.fromCartesian(d);
    const x2 = Cesium.Math.toDegrees(c.longitude);
    const y2 = Cesium.Math.toDegrees(c.latitude);
    return this.computeCirclularFlight(x1, y1, x2, y2, style);
  }
  computeCirclularFlight(x1, y1, x2, y2, style) {
    const positions = [];
    positions.push(Cesium.Cartesian3.fromDegrees(x1, y1, 0));
    const radius = Cesium.Cartesian3.distance(
      Cesium.Cartesian3.fromDegrees(x1, y1),
      Cesium.Cartesian3.fromDegrees(x2, y2)
    );
    let minNum, maxNum;
    if (style == "up") {
      minNum = 270;
      maxNum = 360;
    } else {
      minNum = 0;
      maxNum = 90;
    }
    for (let i = minNum; i < maxNum; i++) {
      const r = Math.cos((i * Math.PI) / 180);
      const x = (x2 - x1) * r + x1;
      const y = (y2 - y1) * r + y1;
      if (style == "up") {
        const h2 = radius * Math.sin((i * Math.PI) / 180) + radius;
        positions.push(Cesium.Cartesian3.fromDegrees(x, y, h2));
      } else {
        const h = radius * Math.sin((i * Math.PI) / 180);
        positions.push(Cesium.Cartesian3.fromDegrees(x, y, h));
      }
    }
    positions.push(Cesium.Cartesian3.fromDegrees(x1, y1, radius));
    positions.push(Cesium.Cartesian3.fromDegrees(x1, y1, 0));
    return positions;
  }
  /**删除 */
  remove(entity) {
    const id = entity.id;
    this.dataSource.entities.remove(entity);
    this.viewer.scene.postRender.removeEventListener(this.listeners[id]);
    this.listeners[id] = null;
  }
  /**删除全部 */
  removeAll() {
    this.dataSource.entities.removeAll();
    for (const value of Object.values(this.listeners)) {
      this.viewer.scene.postRender.removeEventListener(value);
    }
    this.listeners = {};
  }
  destroy() {
    this.removeAll();
    this.viewer = null;
    this.dataSource = null;
    this.listeners = null;
  }
}
export { RadarScan };
