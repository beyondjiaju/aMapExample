import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import * as turf from "@turf/turf";
class RectanglePick {
  constructor(olMap) {
    this.olMap = olMap;
    this.events = {};
    // 开启框选
    this.enable = false;
    // 选框显示状态
    this.autoHideRectangle = true;
    this.positions = {
      start: null,
      end: null
    };
    this.pickStart = new Cesium.Event();
    this.pickEnd = new Cesium.Event();
    this.isStart = true;
    // 框选矩形图层
    this.layer_rectangle = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.layer_rectangle.setZIndex(Number.MAX_VALUE);
    this.olMap.addLayer(this.layer_rectangle);
    this.start();
  }
  /**设置监听 */
  setMapEvents() {
    for (const [type, event] of Object.entries(this.events)) {
      this.olMap.addEventListener(type, event);
    }
  }
  /**开启 */
  start() {
    const that = this;
    this.events = {
      click: evt => {
        // 未开启时隐藏框选矩形并移除移动监听
        if (!that.enable) {
          if (that.rectangleFeature) {
            that.hideRectangle();
            that.olMap.removeEventListener("pointermove", that.moveEvent);
            that.moveEvent = null;
          }
          return;
        }
        const coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
        if (!coordinate) return;
        // 执行绘制开始监听
        that.pickStart.raiseEvent();
        if (that.isStart) {
          // 开始框选：记录起始坐标并注册移动监听实时更新选框
          that.positions.start = coordinate;
          that.positions.end = coordinate;
          that.isStart = false;
          that.drawRectangle();
          that.moveEvent = moveEvt => {
            const move_coordinate = that.olMap.getCoordinateFromPixel(
              moveEvt.pixel
            );
            if (!move_coordinate) return;
            that.positions.end = move_coordinate;
            that.updateRectangle();
          };
          that.olMap.addEventListener("pointermove", that.moveEvent);
        } else {
          // 结束框选：根据矩形边界坐标进行过滤查询
          const pick_polygon_positions = that.getRectangleCoordinates();
          that.filterFromCoordinates(pick_polygon_positions);
          // 移除移动监听
          that.olMap.removeEventListener("pointermove", that.moveEvent);
          that.moveEvent = null;
          // 延迟隐藏框选
          setTimeout(() => {
            // 根据配置决定是否隐藏框选矩形
            if (that.autoHideRectangle) {
              that.hideRectangle();
            }
            that.isStart = true;
          }, 100);
        }
      }
    };
    this.setMapEvents();
  }
  /**获取框选矩形四角坐标
   * @returns {Array} 矩形四角坐标二维数组
   */
  getRectangleCoordinates() {
    const { start, end } = this.positions;
    return [
      [start[0], start[1]],
      [start[0], end[1]],
      [end[0], end[1]],
      [end[0], start[1]]
    ];
  }
  /**绘制框选矩形 */
  drawRectangle() {
    const that = this;
    // 清除旧矩形
    that.layer_rectangle.getSource().clear();
    that.rectangleFeature = new ol.Feature({
      geometry: new ol.geom.Polygon([that.getRectangleCoordinates()])
    });
    that.rectangleFeature.setStyle(
      new ol.style.Style({
        // 与cesium黄色半透明选框一致
        fill: new ol.style.Fill({ color: "rgba(255, 255, 0, 0.3)" })
      })
    );
    that.layer_rectangle.getSource().addFeature(that.rectangleFeature);
  }
  /**更新框选矩形 */
  updateRectangle() {
    if (!this.rectangleFeature) return;
    this.rectangleFeature
      .getGeometry()
      .setCoordinates([this.getRectangleCoordinates()]);
  }
  /**隐藏框选矩形 */
  hideRectangle() {
    this.layer_rectangle.getSource().clear();
    this.rectangleFeature = null;
  }
  /**根据输入坐标进行查询
   * @param {Array} coordinates 坐标二维数组
   */
  filterFromCoordinates(coordinates, type) {
    if (coordinates.length < 2) {
      console.log("框选查询坐标不可少于两个");
      return;
    }
    const that = this;
    const fillterType = type || "polygon";
    let newCoordinates = coordinates;
    if (fillterType == "polyline") {
      const lineString = turf.lineString(coordinates);
      const buffered = turf.buffer(lineString, 0.2 * 0.001, { units: "miles" });
      newCoordinates = buffered.geometry.coordinates[0];
    }
    that.pickedResult = [];
    // 筛选全局layer
    that.olMap.getAllLayers().forEach(layer => {
      if (layer instanceof ol.VectorLayer) {
        const features = layer.getSource().getFeatures();
        that.filter(features, newCoordinates);
      }
    });
    // 执行绘制结束监听
    that.pickEnd._listeners.forEach(listener => {
      listener(that.pickedResult);
    });
  }
  filter(features, positions) {
    const that = this;
    const newPositions = JSON.parse(JSON.stringify(positions));
    newPositions.push(newPositions[0]);
    const pick_polygon = turf.polygon([newPositions]);
    const pick_polyline = turf.lineString(newPositions);
    features.forEach(feature => {
      const coordinate =
        feature.getGeometry() && feature.getGeometry().getCoordinates();
      // 一维？
      const isPoint =
        Array.isArray(coordinate) && !Array.isArray(coordinate[0]);
      // 单点判断点是都在矩形内
      if (isPoint) {
        const point = turf.point([coordinate[0], coordinate[1]]);
        const isContain = turf.booleanPointInPolygon(point, pick_polygon);
        if (isContain) {
          this.pickedResult.push(feature);
        }
        return;
      }
      if (feature.getGeometry() instanceof ol.geom.Polygon) {
        const intersect = this.getPolygonIntersect(coordinate[0], pick_polygon);
        if (intersect) {
          this.pickedResult.push(feature);
        }
        return;
      }
      if (feature.getGeometry() instanceof ol.geom.LineString) {
        const intersects = this.getLineIntersect(coordinate, pick_polyline);
        if (intersects.features.length > 0) {
          this.pickedResult.push(feature);
        }
        return;
      }
    });
  }
  /**获取面交集 */
  getPolygonIntersect(positions, pickPolygon) {
    const newPosition = JSON.parse(JSON.stringify(positions));
    newPosition.push(newPosition[0]);
    // console.log(newPosition);
    const polygon = turf.polygon([newPosition]);
    return turf.intersect(pickPolygon, polygon);
  }
  /**获取线交集 */
  getLineIntersect(positions, pickPolyline) {
    const newPosition = JSON.parse(JSON.stringify(positions));
    const line = turf.lineString(newPosition);
    return turf.lineIntersect(pickPolyline, line);
  }
  stop() {
    for (const [type, event] of Object.entries(this.events)) {
      this.olMap.removeEventListener(type, event);
    }
    this.events = {};
    // 移除移动监听
    if (this.moveEvent) {
      this.olMap.removeEventListener("pointermove", this.moveEvent);
      this.moveEvent = null;
    }
  }
  /**注销 */
  destroy() {
    this.stop();
    this.enable = null;
    this.events = {};
    // 移除框选矩形图层
    if (this.layer_rectangle) {
      this.olMap.removeLayer(this.layer_rectangle);
      this.layer_rectangle = null;
    }
    this.rectangleFeature = null;
    // this.pickStart._listeners.forEach(listener => {
    //   this.pickStart.removeEventListener(listener);
    // });
    // this.pickEnd._listeners.forEach(listener => {
    //   this.pickStart.removeEventListener(listener);
    // });
    this.pickStart = null;
    this.pickEnd = null;
    this.olMap = null;
  }
}
export { RectanglePick };
