import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import DragPan from "ol/interaction/DragPan";
import { getColorAlpha } from "../CorlorTool";
import { message } from "@/utils/message";
import {
  PolylineAntialiasingMaterialProperty,
  shapeCoordinates
} from "@/3dMap/sdk/cesiumUtils";
class DrawHandlerEdit {
  constructor(olMap, operateOption) {
    this.operateOption = Object.assign(
      {
        color: "#DEDEDE",
        alpha: 0.6,
        outlineColor: "",
        outlineAlpha: 1,
        entireMove: true
      },
      operateOption
    );
    if (!this.operateOption.outlineColor)
      this.operateOption.outlineColor = this.operateOption.color;
    this.olMap = olMap;
    // geometry
    this.geometry = new ol.VectorLayer({
      source: new ol.VectorSource(),
      updateWhileAnimating: true,
      updateWhileInteracting: true
    });
    this.olMap.addLayer(this.geometry);
    this.geometry.setZIndex(Number.MAX_VALUE);
    // 线sources
    this.lines = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.lines.setZIndex(Number.MAX_VALUE);
    this.olMap.addLayer(this.lines);
    // 点sources
    this.points = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.olMap.addLayer(this.points);
    this.points.setZIndex(Number.MAX_VALUE);
    // event
    this.end = new Cesium.Event();
    // options
    this.events = {};
    this.option = null;
    this.feature = null;
    const color = this.operateOption.color;
    const colorWithAlpha = getColorAlpha(
      this.operateOption.color,
      this.operateOption.alpha
    );
    const outlineColor = this.operateOption.outlineColor;
    const outlineColorWithAlpha = getColorAlpha(
      this.operateOption.outlineColor,
      this.operateOption.outlineAlpha
    );
    this.feature_options = {
      point: {
        radius: 8, // 半径
        fill: new ol.style.Fill({ color: "#FFFFFF" }),
        stroke: new ol.style.Stroke({ color: outlineColorWithAlpha, width: 3 })
      },
      label: {
        font: "bold 16px sans-serif",
        fill: new ol.style.Fill({ color }),
        stroke: new ol.style.Stroke({ color: "#000000", width: 2 }),
        scale: 1
      },
      polyline: {
        stroke: new ol.style.Stroke({ color: outlineColor, width: 6 })
      },
      polygon: {
        fill: new ol.style.Fill({ color: colorWithAlpha }),
        stroke: new ol.style.Stroke({ color: outlineColorWithAlpha, width: 2 })
      }
    };
  }
  /**设置监听 */
  setMapEvents() {
    for (const [type, event] of Object.entries(this.events)) {
      this.olMap.addEventListener(type, event);
    }
  }
  /**固定地图拖拽 */
  lockDragPan(dragPan) {
    if (dragPan) dragPan.set("active", false);
  }
  /**恢复地图拖拽 */
  unlockDragPan(dragPan) {
    if (dragPan) dragPan.set("active", true);
  }
  /**绑定移动与抬起监听 */
  bindMoveEvents(moveEvent, upEvent) {
    this.olMap.addEventListener("pointermove", moveEvent);
    this.olMap.addEventListener("pointerup", upEvent);
  }
  /**移除移动与抬起监听 */
  unbindMoveEvents(moveEvent, upEvent) {
    this.olMap.removeEventListener("pointermove", moveEvent);
    this.olMap.removeEventListener("pointerup", upEvent);
  }
  /**重绘操作边线与节点 */
  refreshEditView() {
    // 重绘操作边线
    this.lines.getSource().clear();
    this.addLines();
    // 重绘操作点
    this.points.getSource().clear();
    this.addPoints();
  }
  /**执行修改结束监听 */
  raiseEndEvent(option) {
    const resultOption = Cesium.clone(this.option, true);
    this.end.raiseEvent(resultOption, option);
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
    let dragPan;
    that.olMap.getInteractions().forEach(interaction => {
      if (interaction instanceof DragPan) {
        dragPan = interaction;
      }
    });
    // 注册修改、添加节点操作事件
    this.events["pointerdown"] = evt => {
      let pickFeature = null;
      this.olMap.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
        if (
          feature.get("properties") &&
          feature.get("properties").isDrawEditEntity
        ) {
          pickFeature = feature;
        }
        return true;
      });
      if (!pickFeature) return;
      // 设置
      let isMove = false;
      if (pickFeature.getId() === that.feature.getId()) {
        if (that.option.type == "polyline" || !that.operateOption.entireMove) {
          return;
        }
        // 固定camera
        that.lockDragPan(dragPan);
        let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
        if (!coordinate) return;
        const down_lon = coordinate[0],
          down_lat = coordinate[1];
        const initOption = Cesium.clone(that.option, true);
        const moveEvent = evt_move => {
          let move_coordinate = that.olMap.getCoordinateFromPixel(
            evt_move.pixel
          );
          if (!move_coordinate) return;
          if (!isMove) {
            // 清除操作点、线 鼠标抬起重新添加
            if (that.option.type == "polygon") {
              that.lines.getSource().clear();
            }
            that.points.getSource().clear();
          }
          isMove = true;
          const move_lon = move_coordinate[0],
            move_lat = move_coordinate[1];
          // 获取移动坐标与初始位置差值
          const x = move_lon - down_lon,
            y = move_lat - down_lat;
          if (["polygon", "rectangle"].indexOf(that.option.type) >= 0) {
            const coordinates_move = [];
            initOption.coordinates.map(p => {
              const lon = p[0] + x,
                lat = p[1] + y;
              coordinates_move.push([lon, lat]);
            });
            that.option.coordinates = coordinates_move;
            that.feature
              .getGeometry()
              .setCoordinates([
                [...that.option.coordinates, that.option.coordinates[0]]
              ]);
          }
          if (
            ["point", "label", "circle", "sector", "rectangleCircle"].indexOf(
              that.option.type
            ) >= 0
          ) {
            // 获取点位坐标并更新
            that.option.longitude = initOption.longitude + x;
            that.option.latitude = initOption.latitude + y;
            if (that.option.type == "circle") {
              // 获取扇形边界坐标
              const positions = shapeCoordinates.getCirclePositions(
                [this.option.longitude, this.option.latitude],
                this.option.radius,
                "degrees"
              );
              that.feature
                .getGeometry()
                .setCoordinates([[...positions, positions[0]]]);
            }
            if (that.option.type == "sector") {
              // 第一个点更新
              that.option.firstPoint = [
                that.option.longitude,
                that.option.latitude
              ];
              // 第二个点更新
              const secondPosition =
                shapeCoordinates.getPositionByRadiusAngleTurf(
                  that.option.firstPoint,
                  that.option.radius,
                  that.option.startAngle,
                  "degrees"
                );
              that.option.secondPoint = [secondPosition[0], secondPosition[1]];
              // 第三个点更新
              const endPosition = shapeCoordinates.getPositionByRadiusAngleTurf(
                that.option.firstPoint,
                that.option.radius,
                that.option.endAngle,
                "degrees"
              );
              that.option.endPoint = [endPosition[0], endPosition[1]];
              const ret = shapeCoordinates.getSectorPositions(
                this.option.firstPoint,
                this.option.secondPoint,
                this.option.endPoint
              );
              that.feature
                .getGeometry()
                .setCoordinates([[...ret.positions, ret.positions[0]]]);
            }
            if (that.option.type == "rectangleCircle") {
              // 第一个点更新
              that.option.firstPoint = [
                that.option.longitude,
                that.option.latitude
              ];
              // 第二个点更新
              that.option.longitude_second = initOption.longitude_second + x;
              that.option.latitude_second = initOption.latitude_second + y;
              that.option.secondPoint = [
                that.option.longitude_second,
                that.option.latitude_second
              ];
              // 第三个点更新
              const radiusPosition =
                shapeCoordinates.getPositionByRadiusAngleTurf(
                  that.option.secondPoint,
                  that.option.radius,
                  90,
                  "degrees"
                );
              that.option.endPoint = [radiusPosition[0], radiusPosition[1]];
              const ret = shapeCoordinates.getRectangleCirclePositions(
                this.option.firstPoint,
                this.option.secondPoint,
                this.option.endPoint
              );
              that.feature
                .getGeometry()
                .setCoordinates([[...ret.positions, ret.positions[0]]]);
            }
            if (["point", "label"].indexOf(that.option.type) >= 0) {
              that.feature
                .getGeometry()
                .setCoordinates([that.option.longitude, that.option.latitude]);
            }
          }
        };
        const upEvent = evt_up => {
          // 取消move 恢复操作
          that.unlockDragPan(dragPan);
          that.unbindMoveEvents(moveEvent, upEvent);
          if (!isMove) return;
          // 添加操作点、
          if (that.option.type == "polygon") that.addLines();
          that.addPoints();
          // 执行绘制结束监听
          that.raiseEndEvent();
        };
        that.bindMoveEvents(moveEvent, upEvent);
      } else if (that.points.getSource().getFeatureById(pickFeature.getId())) {
        // 固定camera
        that.lockDragPan(dragPan);
        const index = Number(pickFeature.getId());
        const moveEvent = evt_move => {
          let move_coordinate = that.olMap.getCoordinateFromPixel(
            evt_move.pixel
          );
          if (!move_coordinate) return;
          isMove = true;
          const move_lon = move_coordinate[0],
            move_lat = move_coordinate[1];
          pickFeature.getGeometry().setCoordinates([move_lon, move_lat]);
          // 更新图形坐标
          if (
            ["polyline", "polygon", "rectangle"].indexOf(that.option.type) >= 0
          ) {
            that.option.coordinates.splice(index, 1, [move_lon, move_lat]);
            const positions =
              that.option.type === "polyline"
                ? [...that.option.coordinates]
                : [[...that.option.coordinates, that.option.coordinates[0]]];
            that.feature.getGeometry().setCoordinates(positions);
          } else if (["circle"].indexOf(that.option.type) >= 0) {
            if (pickFeature.getId() == "circle_center_point") {
              that.option.longitude = move_lon;
              that.option.latitude = move_lat;
              const radius = that.points
                .getSource()
                .getFeatureById("circle_radius_point")
                .getGeometry()
                .getCoordinates();
              that.option.radius = Cesium.Cartesian3.distance(
                Cesium.Cartesian3.fromDegrees(radius[0], radius[1]),
                Cesium.Cartesian3.fromDegrees(
                  move_coordinate[0],
                  move_coordinate[1]
                )
              );
            } else {
              const center = that.points
                .getSource()
                .getFeatureById("circle_center_point")
                .getGeometry()
                .getCoordinates();
              that.option.radius = Cesium.Cartesian3.distance(
                Cesium.Cartesian3.fromDegrees(center[0], center[1]),
                Cesium.Cartesian3.fromDegrees(
                  move_coordinate[0],
                  move_coordinate[1]
                )
              );
            }
            // 获取边界坐标
            const positions = shapeCoordinates.getCirclePositions(
              [this.option.longitude, this.option.latitude],
              this.option.radius,
              "degrees"
            );
            that.feature
              .getGeometry()
              .setCoordinates([[...positions, positions[0]]]);
          } else if (["sector"].indexOf(that.option.type) >= 0) {
            that.option.firstPoint = that.points
              .getSource()
              .getFeatureById("sector_first_point")
              .getGeometry()
              .getCoordinates();
            that.option.secondPoint = that.points
              .getSource()
              .getFeatureById("sector_second_point")
              .getGeometry()
              .getCoordinates();
            that.option.endPoint = that.points
              .getSource()
              .getFeatureById("sector_end_point")
              .getGeometry()
              .getCoordinates();
            if (pickFeature.id == "sector_first_point") {
              that.option.longitude = move_lon;
              that.option.latitude = move_lat;
            }
            // 获取边界坐标
            const ret = shapeCoordinates.getSectorPositions(
              this.option.firstPoint,
              this.option.secondPoint,
              this.option.endPoint
            );
            this.option.startAngle = ret.startAngle;
            this.option.endAngle = ret.endAngle;
            that.feature
              .getGeometry()
              .setCoordinates([[...ret.positions, ret.positions[0]]]);
          } else if (["rectangleCircle"].indexOf(that.option.type) >= 0) {
            that.option.firstPoint = that.points
              .getSource()
              .getFeatureById("rectangleCircle_first_point")
              .getGeometry()
              .getCoordinates();
            that.option.secondPoint = that.points
              .getSource()
              .getFeatureById("rectangleCircle_second_point")
              .getGeometry()
              .getCoordinates();
            that.option.endPoint = that.points
              .getSource()
              .getFeatureById("rectangleCircle_end_point")
              .getGeometry()
              .getCoordinates();
            if (pickFeature.id == "rectangleCircle_first_point") {
              that.option.longitude = move_lon;
              that.option.latitude = move_lat;
            } else if (pickFeature.id == "rectangleCircle_second_point") {
              that.option.longitude_second = move_lon;
              that.option.latitude_second = move_lat;
            }
            const ret = shapeCoordinates.getRectangleCirclePositions(
              this.option.firstPoint,
              this.option.secondPoint,
              this.option.endPoint
            );
            // 更新属性信息
            this.option.radius = ret.radius;
            that.feature
              .getGeometry()
              .setCoordinates([[...ret.positions, ret.positions[0]]]);
          }
        };
        const upEvent = evt_up => {
          // 取消move 恢复操作
          that.unlockDragPan(dragPan);
          that.unbindMoveEvents(moveEvent, upEvent);
          if (!isMove) return;
          // 执行绘制结束监听
          that.raiseEndEvent({
            editType: "changePoint",
            pointIndex: index
          });
          // 重绘操作边线
          if (["polyline", "polygon"].indexOf(that.option.type) >= 0) {
            that.refreshEditView();
          }
        };
        that.bindMoveEvents(moveEvent, upEvent);
      } else if (that.lines.getSource().getFeatureById(pickFeature.getId())) {
        // 固定camera
        that.lockDragPan(dragPan);
        // 获取索引
        const index = pickFeature.get("index");
        // 坐标
        let addPoint_coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
        if (!addPoint_coordinate) return;
        // 新增点
        const addPoint = new ol.Feature({
          geometry: new ol.geom.Point(addPoint_coordinate)
        });
        addPoint.setStyle(
          new ol.style.Style({
            image: new ol.style.Circle(that.feature_options.point)
          })
        );
        this.points.getSource().addFeature(addPoint);
        // 操作线段坐标记录
        let initLinePositions = pickFeature.getGeometry().getCoordinates();
        const changePosition = isAdd => {
          // 操作线段坐标更新
          const newLinePositions = Cesium.clone(initLinePositions, true);
          newLinePositions.splice(1, 0, addPoint_coordinate);
          const linePositions = newLinePositions;
          pickFeature.getGeometry().setCoordinates(linePositions);
          // 图形坐标更新
          if (isAdd) {
            that.option.coordinates.splice(index + 1, 0, addPoint_coordinate);
          } else {
            that.option.coordinates.splice(index + 1, 1, addPoint_coordinate);
            addPoint.getGeometry().setCoordinates(addPoint_coordinate);
          }
          if (that.option.type == "polygon") {
            that.feature
              .getGeometry()
              .setCoordinates([
                [...that.option.coordinates, that.option.coordinates[0]]
              ]);
          } else {
            that.feature.getGeometry().setCoordinates(that.option.coordinates);
          }
        };
        changePosition(true);
        const moveEvent = evt_move => {
          let move_coordinate = that.olMap.getCoordinateFromPixel(
            evt_move.pixel
          );
          if (!move_coordinate) return;
          addPoint_coordinate = move_coordinate;
          changePosition();
        };
        const upEvent = evt_up => {
          // 取消move 恢复操作
          that.unlockDragPan(dragPan);
          that.unbindMoveEvents(moveEvent, upEvent);
          // 执行绘制结束监听
          that.raiseEndEvent({
            editType: "addPoint",
            pointIndex: index + 1
          });
          // 重绘操作边线
          that.refreshEditView();
        };
        that.bindMoveEvents(moveEvent, upEvent);
      }
    };
    // 线、面添加双击删除节点
    if (["polyline", "polygon"].indexOf(that.option.type) >= 0) {
      that.addLines();
      this.events["dblclick"] = evt => {
        let pickFeature = null;
        this.olMap.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
          const featureId = feature.getId();
          if (
            featureId &&
            that.points.getSource().getFeatureById(feature.getId())
          ) {
            pickFeature = feature;
          }
          return true;
        });
        if (!pickFeature) return;
        const index = Number(pickFeature.getId());
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
        // 重绘操作边线
        that.refreshEditView();
        // 更新图形
        if (that.option.type == "polyline") {
          that.feature.getGeometry().setCoordinates(that.option.coordinates);
        }
        if (that.option.type == "polygon") {
          that.feature
            .getGeometry()
            .setCoordinates([
              [...that.option.coordinates, that.option.coordinates[0]]
            ]);
        }
        // 执行绘制结束监听
        that.raiseEndEvent({
          editType: "deletePoint",
          pointIndex:
            index == that.option.coordinates.length ? index - 1 : index
        });
      };
    }
    this.setMapEvents();
  }
  /**添加点 */
  addPoints() {
    const properties = this.getEditProperties();
    let points = {};
    if (["polyline", "polygon", "rectangle"].indexOf(this.option.type) >= 0) {
      this.option.coordinates.map((p, index) => {
        points[index] = [p[0], p[1]];
      });
    }
    if (["circle"].indexOf(this.option.type) >= 0) {
      const position = Cesium.Cartesian3.fromDegrees(
        this.option.longitude,
        this.option.latitude,
        this.option.maxHeight
      );
      const radiusPosition = shapeCoordinates.getPositionByRadiusAngle(
        position,
        this.option.radius,
        0,
        "degrees"
      );
      points["circle_center_point"] = [
        this.option.longitude,
        this.option.latitude
      ];
      points["circle_radius_point"] = [radiusPosition[0], radiusPosition[1]];
    }
    if (["sector"].indexOf(this.option.type) >= 0) {
      const firstPoint = [this.option.longitude, this.option.latitude];
      const secondPosition = shapeCoordinates.getPositionByRadiusAngleTurf(
        firstPoint,
        this.option.radius,
        this.option.startAngle,
        "degrees"
      );
      const endPosition = shapeCoordinates.getPositionByRadiusAngleTurf(
        firstPoint,
        this.option.radius,
        this.option.endAngle,
        "degrees"
      );
      points["sector_first_point"] = firstPoint;
      points["sector_second_point"] = [secondPosition[0], secondPosition[1]];
      points["sector_end_point"] = [endPosition[0], endPosition[1]];
      this.option.firstPoint = firstPoint;
      this.option.secondPoint = [secondPosition[0], secondPosition[1]];
      this.option.endPoint = [endPosition[0], endPosition[1]];
    }
    if (["rectangleCircle"].indexOf(this.option.type) >= 0) {
      points["rectangleCircle_first_point"] = [
        this.option.longitude,
        this.option.latitude
      ];
      points["rectangleCircle_second_point"] = [
        this.option.longitude_second,
        this.option.latitude_second
      ];
      const radiusPosition = shapeCoordinates.getPositionByRadiusAngleTurf(
        points["rectangleCircle_second_point"],
        this.option.radius,
        90,
        "degrees"
      );
      points["rectangleCircle_end_point"] = [
        radiusPosition[0],
        radiusPosition[1]
      ];
      this.option.firstPoint = points["rectangleCircle_first_point"];
      this.option.secondPoint = points["rectangleCircle_second_point"];
      this.option.endPoint = points["rectangleCircle_end_point"];
    }
    for (let id in points) {
      const coor = points[id];
      const currentPoint = new ol.Feature({
        geometry: new ol.geom.Point(coor),
        properties
      });
      currentPoint.setStyle(
        new ol.style.Style({
          image: new ol.style.Circle(this.feature_options.point)
          // text: new ol.style.Text({
          //   text: id,
          //   font: "bold 20px sans-serif",
          //   fill: new ol.style.Fill({ color: "#ffffff" }),
          //   stroke: new ol.style.Stroke({ color: "#000000", width: 2 }),
          //   scale: 0.5,
          //   offsetX: 0,
          //   offsetY: 0,
          //   textBaseline: "middle"
          // })
        })
      );
      currentPoint.setId(id);
      this.points.getSource().addFeature(currentPoint);
    }
  }
  /**添加线 */
  addLines() {
    const properties = this.getEditProperties();
    const coordinates = Cesium.clone(this.option.coordinates, true);
    if (this.option.type == "polygon") {
      // 坐标
      coordinates.push(coordinates[0]);
    }
    coordinates.forEach((c, index) => {
      if (index < coordinates.length - 1) {
        const polyline = new ol.Feature({
          geometry: new ol.geom.LineString([c, coordinates[index + 1]]),
          properties
        });
        polyline.setStyle(new ol.style.Style(this.feature_options.polyline));
        polyline.setId(`line_${index}`);
        polyline.set("index", index);
        this.lines.getSource().addFeature(polyline);
      }
    });
  }
  /**添加预览 */
  addGeometry() {
    const properties = this.getEditProperties();
    if (["polyline"].indexOf(this.option.type) >= 0) {
      this.feature = new ol.Feature({
        geometry: new ol.geom.LineString(this.option.coordinates),
        properties
      });
      const outlineColor = this.operateOption.outlineColor;
      this.feature.setStyle(
        new ol.style.Style({
          stroke: new ol.style.Stroke({ color: outlineColor, width: 2 })
        })
      );
      this.geometry.getSource().addFeature(this.feature);
    }
    if (
      ["polygon", "rectangle", "sector", "rectangleCircle", "circle"].indexOf(
        this.option.type
      ) >= 0
    ) {
      const polygon = Object.assign({}, this.feature_options.polygon);
      let coordinates = [];
      if (this.option.type == "circle") {
        // 获取扇形边界坐标
        coordinates = shapeCoordinates.getCirclePositions(
          [this.option.longitude, this.option.latitude],
          this.option.radius,
          "degrees"
        );
      }
      if (this.option.type == "sector") {
        const ret = shapeCoordinates.getSectorPositions(
          this.option.firstPoint,
          this.option.secondPoint,
          this.option.endPoint
        );
        // 更新属性信息
        this.option.startAngle = ret.startAngle;
        this.option.endAngle = ret.endAngle;
        coordinates = ret.positions;
      }
      if (this.option.type == "rectangleCircle") {
        const ret = shapeCoordinates.getRectangleCirclePositions(
          this.option.firstPoint,
          this.option.secondPoint,
          this.option.endPoint
        );
        // 更新属性信息
        this.option.radius = ret.radius;
        coordinates = ret.positions;
      }
      if (["polygon", "rectangle"].indexOf(this.option.type) >= 0) {
        coordinates = this.option.coordinates;
      }
      this.feature = new ol.Feature({
        geometry: new ol.geom.Polygon([[...coordinates, coordinates[0]]]),
        properties
      });
      this.feature.setStyle(new ol.style.Style(polygon));
      this.geometry.getSource().addFeature(this.feature);
    }
    if (["point"].indexOf(this.option.type) >= 0) {
      this.feature = new ol.Feature({
        geometry: new ol.geom.Point([
          this.option.longitude,
          this.option.latitude
        ]),
        properties
      });
      this.feature.setStyle(
        new ol.style.Style({
          image: new ol.style.Circle(this.feature_options.point)
        })
      );
      this.geometry.getSource().addFeature(this.feature);
    }
    if (["label"].indexOf(this.option.type) >= 0) {
      this.feature = new ol.Feature({
        geometry: new ol.geom.Point([
          this.option.longitude,
          this.option.latitude
        ]),
        properties
      });
      this.feature.setStyle(
        new ol.style.Style({
          text: new ol.style.Text(
            Object.assign(
              {
                text: this.option.text
              },
              this.feature_options.label
            )
          )
        })
      );
      this.feature.setId(`geometry_${this.option.type}`);
      this.geometry.getSource().addFeature(this.feature);
    }
  }
  /**清除修改所添加的内容 */
  clear() {
    this.points.getSource().clear();
    this.lines.getSource().clear();
    this.geometry.getSource().clear();
    for (const [type, event] of Object.entries(this.events)) {
      this.olMap.removeEventListener(type, event);
    }
  }
}
export { DrawHandlerEdit };
