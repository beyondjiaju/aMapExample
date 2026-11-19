import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
class RectanglePick {
  constructor(viewer) {
    this.viewer = viewer;
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
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
    this.start();
  }
  /**开启 */
  start() {
    const that = this;
    that.handler.setInputAction(m => {
      if (!that.enable) {
        if (that.drawEntity) {
          that.drawEntity.show = false;
          that.handler.removeInputAction(
            Cesium.ScreenSpaceEventType.MOUSE_MOVE
          );
        }
        return;
      }
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      if (!cartesian) return;
      // 执行绘制开始监听
      that.pickStart.raiseEvent();
      if (that.isStart) {
        that.positions.start = cartesian;
        that.positions.end = cartesian;
        that.isStart = false;
        if (!that.drawEntity) {
          that.drawEntity = that.viewer.entities.add({
            name: "rectangle",
            rectangle: {
              coordinates: new Cesium.CallbackProperty(() => {
                return Cesium.Rectangle.fromCartesianArray([
                  that.positions.start,
                  that.positions.end
                ]);
              }, false),
              height: 0.1,
              material: Cesium.Color.YELLOW.withAlpha(0.3)
            },
            properties: {
              type: "rectangle"
            }
          });
        } else {
          that.drawEntity.show = true;
        }
        that.handler.setInputAction(move => {
          const move_cartesian = that.viewer.camera.pickEllipsoid(
            move.endPosition
          );
          if (!move_cartesian) return;
          if (that.drawEntity) {
            that.positions.end = move_cartesian;
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      } else {
        const rectangle = Cesium.Rectangle.fromCartesianArray([
            that.positions.start,
            that.positions.end
          ]),
          rectangle_degrees = {
            west: Cesium.Math.toDegrees(rectangle.west),
            south: Cesium.Math.toDegrees(rectangle.south),
            east: Cesium.Math.toDegrees(rectangle.east),
            north: Cesium.Math.toDegrees(rectangle.north)
          };
        const pick_polygon_positions = [
          [rectangle_degrees.west, rectangle_degrees.south],
          [rectangle_degrees.east, rectangle_degrees.south],
          [rectangle_degrees.east, rectangle_degrees.north],
          [rectangle_degrees.west, rectangle_degrees.north]
        ];
        that.filterFromCoordinates(pick_polygon_positions);
        // 移除move
        that.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
        // 删除图形
        setTimeout(() => {
          that.drawEntity.show = !that.autoHideRectangle;
          that.isStart = true;
        }, 100);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
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
      const buffered = turf.buffer(lineString, 0.2 * 0.001, { units: "kilometers" });
      newCoordinates = buffered.geometry.coordinates[0];
    }
    that.pickedResult = [];
    // 筛选全局dataSource
    that.viewer.dataSources._dataSources.forEach(datasource => {
      that.filter(datasource.entities.values, newCoordinates);
    });
    // 筛选全局entities
    that.filter(that.viewer.entities.values, newCoordinates);
    // 执行绘制结束监听
    that.pickEnd.raiseEvent(that.pickedResult);
  }
  filter(entities, positions) {
    const that = this;
    const newPositions = JSON.parse(JSON.stringify(positions));
    newPositions.push(newPositions[0]);
    const pick_polygon = turf.polygon([newPositions]);
    const pick_polyline = turf.lineString(newPositions);
    entities.forEach(entity => {
      // 单点判断点是都在矩形内
      if (entity.position) {
        const position_carto = Cesium.Cartographic.fromCartesian(
          entity.position.getValue(that.viewer.clock.currentTime)
        );
        if (!position_carto) return;
        const point = turf.point([
          Cesium.Math.toDegrees(position_carto.longitude),
          Cesium.Math.toDegrees(position_carto.latitude)
        ]);
        const isContain = turf.booleanPointInPolygon(point, pick_polygon);
        if (isContain) {
          this.pickedResult.push(entity);
          return;
        }
      }
      if (entity.polygon) {
        const positions_entity = entity.polygon.hierarchy.getValue(
          that.viewer.clock.currentTime
        ).positions;
        const intersect = this.getPolygonIntersect(
          positions_entity,
          pick_polygon
        );
        if (intersect) {
          this.pickedResult.push(entity);
          return;
        }
      }
      if (entity.polyline) {
        const positions_entity = entity.polyline.positions.getValue(
          that.viewer.clock.currentTime
        );
        const intersects = this.getLineIntersect(
          positions_entity,
          pick_polyline
        );
        if (intersects.features.length > 0) {
          this.pickedResult.push(entity);
          return;
        }
      }
    });
  }
  /**获取面交集 */
  getPolygonIntersect(positions, pickPolygon) {
    const newPosition = JSON.parse(JSON.stringify(positions));
    newPosition.push(newPosition[0]);
    // 面判断
    const positions_cartographic =
      Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(newPosition);
    let positions_degrees = [];
    positions_cartographic.forEach(cartographic => {
      positions_degrees.push([
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude)
      ]);
    });
    const polygon = turf.polygon([positions_degrees]);
    return turf.intersect(pickPolygon, polygon);
  }
  /**获取线交集 */
  getLineIntersect(positions, pickPolyline) {
    const newPosition = JSON.parse(JSON.stringify(positions));
    // 面判断
    const positions_cartographic =
      Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(newPosition);
    let positions_degrees = [];
    positions_cartographic.forEach(cartographic => {
      positions_degrees.push([
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude)
      ]);
    });
    const line = turf.lineString(positions_degrees);
    return turf.lineIntersect(pickPolyline, line);
  }
  stop() {
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }
  /**注销 */
  destroy() {
    if (this.drawEntity) {
      this.viewer.entities.remove(this.drawEntity);
      this.drawEntity = null;
    }
    this.stop();
    this.handler = null;
    this.enable = null;
    this.pickStart = null;
    this.pickEnd = null;
    this.viewer = null;
  }
}
export { RectanglePick };
