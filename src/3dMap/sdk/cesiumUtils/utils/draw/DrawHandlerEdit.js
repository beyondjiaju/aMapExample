import * as Cesium from "@/3dMap/sdk/cesium";
import { message } from "@/3dMap/interface";
import {
  PolylineAntialiasingMaterialProperty,
  shapeCoordinates
} from "@/3dMap/sdk/cesiumUtils";
class DrawHandlerEdit {
  constructor(viewer, operateOption) {
    this.operateOption = Object.assign(
      {
        color: "#ffff00",
        alpha: 0.6,
        outlineColor: "#ffff00",
        outlineAlpha: 1,
        outlineWidth: 4,
        entireMove: true
      },
      operateOption
    );
    if (!this.operateOption.outlineColor)
      this.operateOption.outlineColor = this.operateOption.color;
    this.viewer = viewer;
    this.scene = this.viewer.scene;
    // 点sources
    this.points = new Cesium.CustomDataSource();
    this.viewer.dataSources.add(this.points);
    // 线sources
    this.lines = new Cesium.CustomDataSource();
    this.viewer.dataSources.add(this.lines);
    // event
    this.end = new Cesium.Event();
    // handler
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas);
    // entity options
    this.option = null;
    this.entity = null;
    this.setEntityOptions();
  }
  /** 按当前 operateOption 生成编辑图形样式 */
  setEntityOptions() {
    this.entity_options = {
      point: {
        color: Cesium.Color.fromCssColorString("white"),
        pixelSize: 12,
        outlineColor: Cesium.Color.fromCssColorString(
          this.operateOption.outlineColor
        ).withAlpha(this.operateOption.outlineAlpha),
        outlineWidth: 3,
        disableDepthTestDistance: 999999999999
      },
      label: {
        fillColor: Cesium.Color.fromCssColorString(this.operateOption.color),
        font: "bold 25px sans-serif",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2
      },
      polyline: {
        material: new PolylineAntialiasingMaterialProperty({
          color: Cesium.Color.fromCssColorString(
            this.operateOption.outlineColor
          ).withAlpha(
            this.operateOption.outlineAlpha == null
              ? 1
              : this.operateOption.outlineAlpha
          )
        }),
        width: this.operateOption.outlineWidth || 4,
        zIndex: 99999999
      },
      polygon: {
        material: Cesium.Color.fromCssColorString(
          this.operateOption.color
        ).withAlpha(this.operateOption.alpha)
      },
      ellipse: {
        material: Cesium.Color.fromCssColorString(
          this.operateOption.color
        ).withAlpha(this.operateOption.alpha),
        outline: true,
        outlineColor: Cesium.Color.fromCssColorString(
          this.operateOption.outlineColor
        ).withAlpha(this.operateOption.outlineAlpha),
        granularity: 0.002,
        numberOfVerticalLines: 0
      }
    };
  }
  /** 更新编辑样式。正在编辑时重绘当前图形 */
  upDataOptions(options = {}) {
    this.operateOption = Object.assign({}, this.operateOption, options);
    if (!this.operateOption.outlineColor) {
      this.operateOption.outlineColor = this.operateOption.color;
    }
    this.setEntityOptions();
    if (!this.option) return;
    if (options.style != null) this.option.style = options.style;
    if (options.outlineWidth != null) {
      this.option.outlineWidth = options.outlineWidth;
    } else if (options.width != null) {
      this.option.outlineWidth = options.width;
    }
    // 图形还在地图上时才重绘，避免编辑已结束后把图形加回来
    if (!this.entity || !this.viewer.entities.contains(this.entity)) return;
    this.viewer.entities.remove(this.entity);
    this.entity = null;
    this.addGeometry();
    this.refreshEditView();
  }
  /**固定相机，禁止旋转与平移 */
  lockCamera() {
    this.viewer.scene.screenSpaceCameraController.enableRotate = false;
    this.scene.screenSpaceCameraController.enableTranslate = false;
  }
  /**恢复相机旋转与平移 */
  unlockCamera() {
    this.viewer.scene.screenSpaceCameraController.enableRotate = true;
    this.scene.screenSpaceCameraController.enableTranslate = true;
  }
  /**移除鼠标移动与抬起监听 */
  removeMoveActions() {
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
  }
  /**根据id获取操作点及其索引 */
  getPointById(id) {
    const point = this.points.entities.getById(id);
    const index = this.points.entities.values.findIndex(item => item.id == id);
    return { point, index };
  }
  /**重绘操作边线与节点 */
  refreshEditView(withPoints = true) {
    // 重绘操作边线
    this.lines.entities.removeAll();
    this.addLines();
    if (withPoints) {
      // 重绘操作点
      this.points.entities.removeAll();
      this.addPoints();
    }
  }
  /**执行修改结束监听 */
  raiseEndEvent(option) {
    const resultOption = Cesium.clone(this.option, true);
    this.end.raiseEvent(resultOption, option);
  }
  /**cartesian 转经纬度
   * @returns {Array} [lon, lat]
   */
  cartesianToDegrees(cartesian) {
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    return [
      Cesium.Math.toDegrees(carto.longitude),
      Cesium.Math.toDegrees(carto.latitude)
    ];
  }
  /**添加操作点实体 */
  addPointEntity(id, position, properties) {
    const pointOption = {
      position,
      point: this.entity_options.point,
      properties
    };
    if (id) pointOption.id = id;
    this.points.entities.add(pointOption);
  }
  /**获取编辑实体标识 */
  getEditProperties() {
    return {
      isDrawEditEntity: true
    };
  }
  /**开启修改
   * @param { Object } option
   */
  start(option) {
    const that = this;
    // 记录option
    that.option = Cesium.clone(option, true);
    // 添加操作实体
    that.addPoints();
    that.addGeometry();
    // 注册修改、添加节点操作事件
    that.handler.setInputAction(m => {
      const pickArr = that.viewer.scene.drillPick(m.position);
      if (pickArr.length < 1) return;
      // 获取实体
      let pickEntity;
      pickArr.forEach(pick => {
        if (Cesium.defined(pick) && !pickEntity) {
          // 获取实体
          const entity = Cesium.defaultValue(pick.id, pick.primitive.id);
          const entityProperties = entity.properties
            ? entity.properties.getValue(that.viewer.clock.currentTime)
            : {};
          if (entityProperties.isDrawEditEntity) pickEntity = entity;
        }
      });
      if (!pickEntity) return;
      // 设置
      let isMove = false;
      if (pickEntity instanceof Cesium.Entity) {
        if (pickEntity.id == that.entity.id) {
          if (
            that.option.type == "polyline" ||
            !that.operateOption.entireMove
          ) {
            return;
          }
          // 固定camera
          that.lockCamera();
          // 坐标
          const down_cartesian = that.viewer.camera.pickEllipsoid(m.position);
          if (!down_cartesian) return;
          const [down_lon, down_lat] = that.cartesianToDegrees(down_cartesian);
          const initOption = Cesium.clone(that.option, true);
          // move
          that.handler.setInputAction(move => {
            const move_cartesian = that.viewer.camera.pickEllipsoid(
              move.endPosition
            );
            if (!move_cartesian) return;
            if (!isMove) {
              // 清除操作点、线 鼠标抬起重新添加
              if (that.option.type == "polygon") {
                that.lines.entities.removeAll();
              }
              that.points.entities.removeAll();
            }
            isMove = true;
            const [move_lon, move_lat] =
              that.cartesianToDegrees(move_cartesian);
            // 获取移动坐标与初始位置差值
            const x = move_lon - down_lon,
              y = move_lat - down_lat;
            if (["polygon", "rectangle"].indexOf(that.option.type) >= 0) {
              const coordinates_move = [];
              initOption.coordinates.map(p => {
                const lon = p[0] + x,
                  lat = p[1] + y;
                coordinates_move.push([lon, lat, 0]);
              });
              that.option.coordinates = coordinates_move;
            }
            if (
              ["point", "label", "circle", "sector", "rectangleCircle"].indexOf(
                that.option.type
              ) >= 0
            ) {
              // 获取点位坐标并更新
              that.option.longitude = initOption.longitude + x;
              that.option.latitude = initOption.latitude + y;
              if (that.option.type == "sector") {
                // 第一个点更新
                that.option.firstPoint = Cesium.Cartesian3.fromDegrees(
                  that.option.longitude,
                  that.option.latitude,
                  that.option.maxHeight
                );
                // 第二个点更新
                const secondPosition =
                  shapeCoordinates.getPositionByRadiusAngleTurf(
                    that.option.firstPoint,
                    that.option.radius,
                    that.option.startAngle,
                    "degrees"
                  );
                that.option.secondPoint = Cesium.Cartesian3.fromDegrees(
                  secondPosition[0],
                  secondPosition[1],
                  that.option.maxHeight
                );
                // 第三个点更新
                const endPosition =
                  shapeCoordinates.getPositionByRadiusAngleTurf(
                    that.option.firstPoint,
                    that.option.radius,
                    that.option.endAngle,
                    "degrees"
                  );
                that.option.endPoint = Cesium.Cartesian3.fromDegrees(
                  endPosition[0],
                  endPosition[1],
                  that.option.maxHeight
                );
              } else if (that.option.type == "rectangleCircle") {
                // 第一个点更新
                that.option.firstPoint = Cesium.Cartesian3.fromDegrees(
                  that.option.longitude,
                  that.option.latitude,
                  that.option.maxHeight
                );
                // 第二个点更新
                that.option.longitude_second = initOption.longitude_second + x;
                that.option.latitude_second = initOption.latitude_second + y;
                that.option.secondPoint = Cesium.Cartesian3.fromDegrees(
                  that.option.longitude_second,
                  that.option.latitude_second,
                  that.option.maxHeight
                );
                // 第三个点更新
                const radiusPosition =
                  shapeCoordinates.getPositionByRadiusAngleTurf(
                    that.option.secondPoint,
                    that.option.radius,
                    90,
                    "degrees"
                  );
                that.option.endPoint = Cesium.Cartesian3.fromDegrees(
                  radiusPosition[0],
                  radiusPosition[1],
                  that.option.maxHeight
                );
              }
            }
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          // 结束移动
          that.handler.setInputAction(() => {
            // 取消move 恢复操作
            that.unlockCamera();
            that.removeMoveActions();
            if (!isMove) return;
            // 添加操作点、线
            if (that.option.type == "polygon") that.addLines();
            that.addPoints();
            // 执行绘制结束监听
            that.raiseEndEvent();
          }, Cesium.ScreenSpaceEventType.LEFT_UP);
        } else if (that.points.entities.getById(pickEntity.id)) {
          // 固定camera
          that.lockCamera();
          // 获取点
          const { point, index } = that.getPointById(pickEntity.id);
          // move
          that.handler.setInputAction(move => {
            const move_cartesian = that.viewer.camera.pickEllipsoid(
              move.endPosition
            );
            if (!move_cartesian) return;
            isMove = true;
            const [move_lon, move_lat] =
              that.cartesianToDegrees(move_cartesian);
            // 更新图形坐标
            if (
              ["polyline", "polygon", "rectangle"].indexOf(that.option.type) >=
              0
            ) {
              const hisPosition = that.option.coordinates[index];
              that.option.coordinates.splice(index, 1, [
                move_lon,
                move_lat,
                hisPosition[2]
              ]);
              let height = hisPosition[2];
              if (that.option.type != "polyline") {
                height = that.option.maxHeight;
              }
              point.position = Cesium.Cartesian3.fromDegrees(
                move_lon,
                move_lat,
                height
              );
            } else if (["circle"].indexOf(that.option.type) >= 0) {
              point.position = Cesium.Cartesian3.fromDegrees(
                move_lon,
                move_lat,
                that.option.maxHeight
              );
              if (pickEntity.id == "circle_center_point") {
                that.option.longitude = move_lon;
                that.option.latitude = move_lat;
                const radius = that.points.entities
                  .getById("circle_radius_point")
                  .position.getValue(that.viewer.clock.currentTime);
                that.option.radius = Cesium.Cartesian3.distance(
                  radius,
                  move_cartesian
                );
              } else {
                const center = that.points.entities
                  .getById("circle_center_point")
                  .position.getValue(that.viewer.clock.currentTime);
                that.option.radius = Cesium.Cartesian3.distance(
                  center,
                  move_cartesian
                );
              }
            } else if (["sector"].indexOf(that.option.type) >= 0) {
              point.position = Cesium.Cartesian3.fromDegrees(
                move_lon,
                move_lat,
                that.option.maxHeight
              );
              that.option.firstPoint = that.points.entities
                .getById("sector_first_point")
                .position.getValue(that.viewer.clock.currentTime);
              that.option.secondPoint = that.points.entities
                .getById("sector_second_point")
                .position.getValue(that.viewer.clock.currentTime);
              that.option.endPoint = that.points.entities
                .getById("sector_end_point")
                .position.getValue(that.viewer.clock.currentTime);
              if (pickEntity.id == "sector_first_point") {
                that.option.longitude = move_lon;
                that.option.latitude = move_lat;
              }
            } else if (["rectangleCircle"].indexOf(that.option.type) >= 0) {
              point.position = Cesium.Cartesian3.fromDegrees(
                move_lon,
                move_lat,
                that.option.maxHeight
              );
              that.option.firstPoint = that.points.entities
                .getById("rectangleCircle_first_point")
                .position.getValue(that.viewer.clock.currentTime);
              that.option.secondPoint = that.points.entities
                .getById("rectangleCircle_second_point")
                .position.getValue(that.viewer.clock.currentTime);
              that.option.endPoint = that.points.entities
                .getById("rectangleCircle_end_point")
                .position.getValue(that.viewer.clock.currentTime);
              if (pickEntity.id == "rectangleCircle_first_point") {
                that.option.longitude = move_lon;
                that.option.latitude = move_lat;
              } else if (pickEntity.id == "rectangleCircle_second_point") {
                that.option.longitude_second = move_lon;
                that.option.latitude_second = move_lat;
              }
            }
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          // 结束移动
          that.handler.setInputAction(() => {
            // 取消move 恢复操作
            that.unlockCamera();
            that.removeMoveActions();
            if (!isMove) return;
            // 执行绘制结束监听
            that.raiseEndEvent({
              editType: "changePoint",
              pointIndex: index
            });
            // 重绘操作边线
            if (["polyline", "polygon"].indexOf(that.option.type) >= 0) {
              that.refreshEditView(false);
            }
          }, Cesium.ScreenSpaceEventType.LEFT_UP);
        } else if (that.lines.entities.getById(pickEntity.id)) {
          // 固定camera
          that.lockCamera();
          // 获取索引
          const index = that.lines.entities.values.findIndex(item => {
            return item.id == pickEntity.id;
          });
          // 坐标
          let addPoint_cartesian = that.viewer.camera.pickEllipsoid(m.position);
          if (!addPoint_cartesian) return;
          let [add_lon, add_lat] = that.cartesianToDegrees(addPoint_cartesian);
          let height = 0;
          if (that.option.type == "polygon") height = that.option.maxHeight;
          // 新增点
          const point = Object.assign({}, that.entity_options.point);
          that.points.entities.add({
            position: new Cesium.CallbackProperty(() => {
              return Cesium.Cartesian3.fromDegrees(add_lon, add_lat, height);
            }, false),
            point
          });
          // 操作线段坐标记录
          let initLinePositions = pickEntity.polyline.positions.getValue(
              that.viewer.clock.currentTime
            ),
            linePositions = pickEntity.polyline.positions.getValue(
              that.viewer.clock.currentTime
            );
          pickEntity.polyline.positions = new Cesium.CallbackProperty(() => {
            return linePositions;
          }, false);
          const changePosition = isAdd => {
            // 操作线段坐标更新
            const newLinePositions = Cesium.clone(initLinePositions, true);
            newLinePositions.splice(
              1,
              0,
              Cesium.Cartesian3.fromDegrees(add_lon, add_lat, height)
            );
            linePositions = newLinePositions;
            // 图形坐标更新
            if (isAdd) {
              that.option.coordinates.splice(index + 1, 0, [
                add_lon,
                add_lat,
                height
              ]);
            } else {
              that.option.coordinates.splice(index + 1, 1, [
                add_lon,
                add_lat,
                height
              ]);
            }
          };
          changePosition(true);
          // move
          that.handler.setInputAction(move => {
            const move_cartesian = that.viewer.camera.pickEllipsoid(
              move.endPosition
            );
            if (!move_cartesian) return;
            addPoint_cartesian = move_cartesian;
            [add_lon, add_lat] = that.cartesianToDegrees(addPoint_cartesian);
            changePosition();
          }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
          // 结束移动
          that.handler.setInputAction(() => {
            // 执行绘制结束监听
            that.raiseEndEvent({
              editType: "addPoint",
              pointIndex: index
            });
            // 重绘操作边线
            that.refreshEditView();
            // 取消move 恢复操作
            that.unlockCamera();
            that.removeMoveActions();
          }, Cesium.ScreenSpaceEventType.LEFT_UP);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    // 线、面添加双击删除节点
    if (["polyline", "polygon"].indexOf(that.option.type) >= 0) {
      that.addLines();
      // 注册操作事件
      that.handler.setInputAction(m => {
        const pick = that.viewer.scene.pick(m.position);
        if (Cesium.defined(pick)) {
          // 获取实体
          const pickEntity = Cesium.defaultValue(pick.id, pick.primitive.id);
          if (
            pickEntity instanceof Cesium.Entity &&
            that.points.entities.getById(pickEntity.id)
          ) {
            // 获取点
            const { point, index } = that.getPointById(pickEntity.id);
            // 删除
            if (
              that.option.type == "polyline" &&
              that.option.coordinates.length == 2
            ) {
              message("线段坐标不可少于两个！", {
                type: "warning"
              });
              return;
            }
            if (
              that.option.type == "polygon" &&
              that.option.coordinates.length == 3
            ) {
              message("多边形坐标不可少于三个！", { type: "warning" });
              return;
            }
            that.option.coordinates.splice(index, 1);
            that.points.entities.remove(point);
            // 重绘操作边线
            that.refreshEditView();
            // 执行绘制结束监听
            that.raiseEndEvent({
              editType: "deletePoint",
              pointIndex:
                index == that.option.coordinates.length ? index - 1 : index
            });
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    }
  }
  /**添加点 */
  addPoints() {
    const properties = this.getEditProperties();
    if (["polyline", "polygon", "rectangle"].indexOf(this.option.type) >= 0) {
      this.option.coordinates.map(p => {
        let height = p[2];
        if (this.option.type == "polygon" || this.option.type == "rectangle") {
          height = this.option.maxHeight;
        }
        const position = Cesium.Cartesian3.fromDegrees(p[0], p[1], height);
        this.addPointEntity(null, position, properties);
      });
    }
    if (["circle"].indexOf(this.option.type) >= 0) {
      const position = Cesium.Cartesian3.fromDegrees(
        this.option.longitude,
        this.option.latitude,
        this.option.maxHeight
      );
      this.addPointEntity("circle_center_point", position, properties);
      const radiusPosition = shapeCoordinates.getPositionByRadiusAngle(
        position,
        this.option.radius,
        0,
        "degrees"
      );
      this.addPointEntity(
        "circle_radius_point",
        Cesium.Cartesian3.fromDegrees(
          radiusPosition[0],
          radiusPosition[1],
          this.option.maxHeight
        ),
        properties
      );
    }
    if (["sector"].indexOf(this.option.type) >= 0) {
      this.option.firstPoint = Cesium.Cartesian3.fromDegrees(
        this.option.longitude,
        this.option.latitude,
        this.option.maxHeight
      );
      this.addPointEntity(
        "sector_first_point",
        this.option.firstPoint,
        properties
      );
      const secondPosition = shapeCoordinates.getPositionByRadiusAngleTurf(
        this.option.firstPoint,
        this.option.radius,
        this.option.startAngle,
        "degrees"
      );
      this.option.secondPoint = Cesium.Cartesian3.fromDegrees(
        secondPosition[0],
        secondPosition[1],
        this.option.maxHeight
      );
      this.addPointEntity(
        "sector_second_point",
        this.option.secondPoint,
        properties
      );
      const endPosition = shapeCoordinates.getPositionByRadiusAngleTurf(
        this.option.firstPoint,
        this.option.radius,
        this.option.endAngle,
        "degrees"
      );
      this.option.endPoint = Cesium.Cartesian3.fromDegrees(
        endPosition[0],
        endPosition[1],
        this.option.maxHeight
      );
      this.addPointEntity("sector_end_point", this.option.endPoint, properties);
    }
    if (["rectangleCircle"].indexOf(this.option.type) >= 0) {
      this.option.firstPoint = Cesium.Cartesian3.fromDegrees(
        this.option.longitude,
        this.option.latitude,
        this.option.maxHeight
      );
      this.addPointEntity(
        "rectangleCircle_first_point",
        this.option.firstPoint,
        properties
      );
      this.option.secondPoint = Cesium.Cartesian3.fromDegrees(
        this.option.longitude_second,
        this.option.latitude_second,
        this.option.maxHeight
      );
      this.addPointEntity(
        "rectangleCircle_second_point",
        this.option.secondPoint,
        properties
      );
      const radiusPosition = shapeCoordinates.getPositionByRadiusAngleTurf(
        this.option.secondPoint,
        this.option.radius,
        90,
        "degrees"
      );
      this.option.endPoint = Cesium.Cartesian3.fromDegrees(
        radiusPosition[0],
        radiusPosition[1],
        this.option.maxHeight
      );
      this.addPointEntity(
        "rectangleCircle_end_point",
        this.option.endPoint,
        properties
      );
    }
  }
  /** 线统一使用边线颜色、透明度与宽度 */
  getOutlineLineStyle() {
    const alpha =
      this.operateOption.outlineAlpha == null ? 1 : this.operateOption.outlineAlpha;
    return {
      width: Cesium.defaultValue(this.option && this.option.outlineWidth, 4),
      color: Cesium.Color.fromCssColorString(
        this.operateOption.outlineColor
      ).withAlpha(alpha)
    };
  }
  /**添加线 */
  addLines() {
    const properties = this.getEditProperties();
    const outlineLine = this.getOutlineLineStyle();
    // 线sources
    const polyline = Object.assign({}, this.entity_options.polyline);
    polyline.width = outlineLine.width;
    polyline.material = new PolylineAntialiasingMaterialProperty({
      color: outlineLine.color
    });
    const coordinates = Cesium.clone(this.option.coordinates, true);
    if (this.option.type == "polygon") {
      // 坐标
      coordinates.push(coordinates[0]);
    }
    coordinates.forEach((c, index) => {
      if (index < coordinates.length - 1) {
        const c_array = [];
        if (this.option.type == "polygon") {
          c_array.push(
            [c[0], c[1], this.option.maxHeight],
            [
              coordinates[index + 1][0],
              coordinates[index + 1][1],
              this.option.maxHeight
            ]
          );
        } else {
          c_array.push(c, coordinates[index + 1]);
        }
        polyline.positions = Cesium.Cartesian3.fromDegreesArrayHeights(
          c_array.flat(Infinity)
        );
        this.lines.entities.add({
          polyline,
          properties
        });
      }
    });
  }
  /** 按类型取闭合边界。圆、扇形、长圆与多边形的取点方式不同，线样式共用 */
  getOutlinePositions() {
    const type = this.option.type;
    if (type == "circle") {
      return shapeCoordinates.getCirclePositions(
        Cesium.Cartesian3.fromDegrees(
          this.option.longitude,
          this.option.latitude,
          this.option.maxHeight || 0
        ),
        this.option.radius
      );
    }
    if (type == "sector") {
      const ret = shapeCoordinates.getSectorPositions(
        this.option.firstPoint,
        this.option.secondPoint,
        this.option.endPoint
      );
      this.option.startAngle = ret.startAngle;
      this.option.endAngle = ret.endAngle;
      this.option.radius = ret.radius;
      return Cesium.Cartesian3.fromDegreesArray(ret.positions.flat(Infinity));
    }
    if (type == "rectangleCircle") {
      const ret = shapeCoordinates.getRectangleCirclePositions(
        this.option.firstPoint,
        this.option.secondPoint,
        this.option.endPoint
      );
      this.option.radius = ret.radius;
      return Cesium.Cartesian3.fromDegreesArray(ret.positions.flat(Infinity));
    }
    const coordinates = this.option.coordinates || [];
    const ring = coordinates.map(item => [
      item[0],
      item[1],
      item[2] || this.option.maxHeight || 0
    ]);
    if (
      ring.length > 1 &&
      (ring[0][0] !== ring[ring.length - 1][0] ||
        ring[0][1] !== ring[ring.length - 1][1])
    ) {
      ring.push(ring[0]);
    }
    return Cesium.Cartesian3.fromDegreesArrayHeights(ring.flat(Infinity));
  }
  /** 自带 outline 不能设置宽度，描边统一用折线，边界由 getOutlinePositions 按类型提供 */
  createOutlinePolyline() {
    const outlineLine = this.getOutlineLineStyle();
    return {
      width: outlineLine.width,
      material: new PolylineAntialiasingMaterialProperty({
        color: outlineLine.color
      }),
      positions: new Cesium.CallbackProperty(() => {
        return this.getOutlinePositions();
      }, false)
    };
  }
  /** 边线样式只画指定宽度的边，不铺填充 */
  addOutlineGeometry(properties) {
    this.entity = this.viewer.entities.add({
      polyline: this.createOutlinePolyline(),
      properties
    });
  }
  /**添加预览 */
  addGeometry() {
    const properties = this.getEditProperties();
    // 矩形、圆、扇形、长圆在边线样式下用折线宽度，原生 outline 不认像素宽度
    if (
      this.option.style == "outline" &&
      ["polygon", "rectangle", "circle", "sector", "rectangleCircle"].indexOf(
        this.option.type
      ) >= 0
    ) {
      this.addOutlineGeometry(properties);
      return;
    }
    if (["polyline"].indexOf(this.option.type) >= 0) {
      const outlineLine = this.getOutlineLineStyle();
      const polyline = Object.assign({}, this.entity_options.polyline);
      polyline.width = outlineLine.width;
      polyline.material = new PolylineAntialiasingMaterialProperty({
        color: outlineLine.color
      });
      polyline.positions = new Cesium.CallbackProperty(() => {
        return Cesium.Cartesian3.fromDegreesArrayHeights(
          this.option.coordinates.flat(Infinity)
        );
      }, false);
      this.entity = this.viewer.entities.add({
        polyline
      });
    }
    if (
      ["polygon", "rectangle", "sector", "rectangleCircle"].indexOf(
        this.option.type
      ) >= 0
    ) {
      const polygon = Object.assign({}, this.entity_options.polygon);
      const fillOutline =
        this.option.style == "fill" &&
        ["sector", "rectangleCircle"].indexOf(this.option.type) >= 0;
      // 矩形以及未改用折线的扇形、长圆仍使用原生描边
      if (
        this.option.type == "rectangle" ||
        ((this.option.type == "sector" ||
          this.option.type == "rectangleCircle") &&
          !fillOutline)
      ) {
        polygon.outline = true;
        polygon.outlineColor = Cesium.Color.fromCssColorString(
          this.operateOption.outlineColor
        ).withAlpha(this.operateOption.outlineAlpha);
      }
      if (this.option.type == "sector") {
        polygon.hierarchy = new Cesium.CallbackProperty(() => {
          const ret = shapeCoordinates.getSectorPositions(
            this.option.firstPoint,
            this.option.secondPoint,
            this.option.endPoint
          );
          // 更新属性信息
          this.option.startAngle = ret.startAngle;
          this.option.endAngle = ret.endAngle;
          this.option.radius = ret.radius;
          return new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(ret.positions.flat(Infinity))
          );
        }, false);
      } else if (this.option.type == "rectangleCircle") {
        polygon.hierarchy = new Cesium.CallbackProperty(() => {
          const ret = shapeCoordinates.getRectangleCirclePositions(
            this.option.firstPoint,
            this.option.secondPoint,
            this.option.endPoint
          );
          // 更新属性信息
          this.option.radius = ret.radius;
          return new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArray(ret.positions.flat(Infinity))
          );
        }, false);
      } else {
        polygon.hierarchy = new Cesium.CallbackProperty(() => {
          return new Cesium.PolygonHierarchy(
            Cesium.Cartesian3.fromDegreesArrayHeights(
              this.option.coordinates.flat(Infinity)
            )
          );
        }, false);
      }
      polygon.height = this.option.minHeight || 0;
      polygon.extrudedHeight = this.option.maxHeight || 0.1;
      const polygonEntity = {
        polygon,
        properties
      };
      if (fillOutline) polygonEntity.polyline = this.createOutlinePolyline();
      this.entity = this.viewer.entities.add(polygonEntity);
    }
    if (["circle"].indexOf(this.option.type) >= 0) {
      const ellipse = Object.assign({}, this.entity_options.ellipse);
      const fillOutline = this.option.style == "fill";
      // 填充态圆形不用原生 outline，改由折线描边
      if (fillOutline) ellipse.outline = false;
      ellipse.height = this.option.minHeight || 0;
      ellipse.extrudedHeight = this.option.maxHeight || 0.1;
      ellipse.semiMajorAxis = new Cesium.CallbackProperty(() => {
        return this.option.radius;
      }, false);
      ellipse.semiMinorAxis = new Cesium.CallbackProperty(() => {
        return this.option.radius;
      }, false);
      const circleEntity = {
        position: new Cesium.CallbackProperty(() => {
          return Cesium.Cartesian3.fromDegrees(
            this.option.longitude,
            this.option.latitude,
            this.option.maxHeight
          );
        }, false),
        ellipse,
        properties
      };
      if (fillOutline) circleEntity.polyline = this.createOutlinePolyline();
      this.entity = this.viewer.entities.add(circleEntity);
    }
    if (["point"].indexOf(this.option.type) >= 0) {
      const point = Object.assign({}, this.entity_options.point);
      this.entity = this.viewer.entities.add({
        position: new Cesium.CallbackProperty(() => {
          return Cesium.Cartesian3.fromDegrees(
            this.option.longitude,
            this.option.latitude,
            this.option.maxHeight
          );
        }, false),
        point,
        properties
      });
    }
    if (["label"].indexOf(this.option.type) >= 0) {
      const label = Object.assign(
        {
          text: this.option.text
        },
        this.entity_options.label
      );
      this.entity = this.viewer.entities.add({
        position: new Cesium.CallbackProperty(() => {
          return Cesium.Cartesian3.fromDegrees(
            this.option.longitude,
            this.option.latitude,
            this.option.maxHeight || 0
          );
        }, false),
        label,
        properties
      });
    }
  }
  /**清除修改所添加的内容 */
  clear() {
    this.viewer.entities.remove(this.entity);
    this.points.entities.removeAll();
    this.lines.entities.removeAll();
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MIDDLE_CLICK);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MIDDLE_DOWN);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MIDDLE_UP);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    this.handler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );
  }
}
export { DrawHandlerEdit };
