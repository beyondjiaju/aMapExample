import { message } from "@/utils/message";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
import {
  PolylineAntialiasingMaterialProperty,
  shapeCoordinates,
  coordinateConversionTool
} from "@/3dMap/sdk/cesiumUtils";
/**获取结束类型 */
const getEndType = endType => {
  if (endType === "dblclick") {
    return Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK;
  }
  return Cesium.ScreenSpaceEventType.RIGHT_CLICK;
};
const getEndTipText = mode_endType => {
  if (mode_endType == Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK) {
    return "双击结束";
  }
  return "右键结束";
};
/**绘制对象 */
class DrawHandler {
  constructor(viewer, option = {}) {
    const defaultOption = {
      style: "fill", // outLine
      color: Cesium.Color.fromCssColorString("#FFFF00").withAlpha(0.5),
      outlineColor: Cesium.Color.fromCssColorString("#FFFF00"),
      outlineWidth: 4,
      moveEvent: true, // 移动事件
      moveCoordinate: true, // 移动实时坐标，moveEvent为true生效
      endType: "contextmenu"
    };
    // 合并参数
    const newOption = Object.assign(defaultOption, option);
    const { moveCoordinate, endType, ...other } = newOption;
    this.moveCoordinate = moveCoordinate;
    this.moveLabel = null;
    this.tipEntity = null;
    this.viewer = viewer;
    this.scene = this.viewer.scene;
    this.ellipsoid = this.scene.globe.ellipsoid;
    this.canvas = this.scene.canvas;
    this.handler = new Cesium.ScreenSpaceEventHandler(this.canvas);
    this.drawFinished = new Cesium.Event();
    // 样式
    this.options = {
      ...other,
      endType: getEndType(endType)
    };
    // 添加过程中
    this.dataSource_draw = new Cesium.CustomDataSource("drawDataSource_draw");
    this.viewer.dataSources.add(this.dataSource_draw);
    // 添加集合
    this.dataSource = new Cesium.CustomDataSource("drawDataSource");
    this.viewer.dataSources.add(this.dataSource);
    // 鼠标样式
    this.mapDomMouseout = () => {
      // 移除tip
      this.removeDrawTip();
      // 移动坐标移除
      this.removeMoveLabel();
    };
    this.viewer.scene.canvas.addEventListener("mouseout", this.mapDomMouseout);
  }
  /**开始绘制
   * @param {String} type 绘制类型
   * @param {Object} options 根据绘制类型定义绘制样式options
   * @param {String} options.style default: fill
   * @param {Object} options.color Cesium.Color
   * @param {Object} options.outlineColor Cesium.Color
   * @param {Number} options.outlineWidth default: 2 style:outline模式下生效
   */
  start(type, options = {}) {
    let newStartOptions = options || {};
    if (newStartOptions.endType) {
      newStartOptions["endType"] = getEndType(newStartOptions.endType);
    }
    if (type == "point") {
      this.drawPoint(newStartOptions);
    }
    if (type == "billboard") {
      this.drawBillboard(newStartOptions);
    }
    if (type == "label") {
      this.drawLabel(newStartOptions);
    } else if (type == "polyline") {
      this.drawPolyline(newStartOptions);
    } else if (type == "polygon") {
      this.drawPolygon(newStartOptions);
    } else if (type == "rectangle") {
      this.drawRectangle(newStartOptions);
    } else if (type == "circle") {
      this.drawCircle(newStartOptions);
    } else if (type == "sector") {
      this.drawSector(newStartOptions);
    } else if (type == "rectangleCircle") {
      this.drawRectangleCircle(newStartOptions);
    }
  }
  /**更新绘制参数 */
  upDataAttribute(name, value) {
    if (this.newOptions) {
      this.newOptions[name] = value;
    }
  }
  /**初始化绘制
   * 合并绘制参数并重置上一次绘制状态
   * @param {Object} options 绘制样式参数
   */
  initDraw(options) {
    const that = this;
    // 合并绘制参数
    that.newOptions = Object.assign(that.options, options);
    // 停止上一次绘制并清空过程图形
    that.stop();
    // 设置鼠标样式为crosshair
    that.viewer.scene.canvas.style.cursor = "crosshair";
  }
  /**单击添加图形（点、图标、文字等单点图形）
   * @param {Function} buildEntityOption 实体参数构建函数，参数为 { cartesian, cartographic, id }
   */
  drawOnceByClick(buildEntityOption) {
    const that = this;
    that.handler.setInputAction(m => {
      // 点击位置坐标
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      if (!cartesian) return;
      const cartographic = Cesium.Cartographic.fromCartesian(cartesian);
      // id
      const id = Date.now();
      const entityOption = buildEntityOption({ cartesian, cartographic, id });
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(entityOption);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
  /**注册鼠标移动监听
   * 移动时实时更新绘制图形，鼠标移出画布时移除提示
   * @param {Function} onMove 移动回调，参数为移动位置 cartesian
   * @param {Function} onMoveStart 移动开始标记回调（用于更新加点状态）
   */
  addMoveAction(onMove, onMoveStart) {
    const that = this;
    that.handler.setInputAction(move => {
      // 标记已移动，允许继续加点
      onMoveStart && onMoveStart();
      const move_cartesian = that.viewer.camera.pickEllipsoid(move.endPosition);
      if (!move_cartesian) {
        // 移除tip
        that.removeDrawTip();
        // 移动坐标移除
        that.removeMoveLabel();
        return;
      }
      onMove(move_cartesian);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }
  /**添加实体并触发绘制结束监听
   * @param {Object} entityOption 实体参数
   * @returns {Object} 添加后的实体
   */
  addAndRaiseFinished(entityOption) {
    const newDrawEntity = this.add(entityOption);
    // 执行绘制结束监听
    this.drawFinished.raiseEvent(newDrawEntity);
    return newDrawEntity;
  }
  /**点 */
  drawPoint(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    // 单击绘制点
    that.drawOnceByClick(({ cartesian, cartographic, id }) => ({
      id,
      name: "point",
      position: cartesian,
      point: {
        color: that.newOptions.color,
        pixelSize: Cesium.defaultValue(that.newOptions.pixelSize, 6),
        outlineColor: that.newOptions.outlineColor,
        outlineWidth: Cesium.defaultValue(that.newOptions.outlineWidth, 2)
      },
      properties: {
        type: "point",
        coordinate: [
          Cesium.Math.toDegrees(cartographic.longitude),
          Cesium.Math.toDegrees(cartographic.latitude),
          cartographic.height
        ]
      }
    }));
  }
  /**图标 */
  drawBillboard(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    // 单击绘制图标
    that.drawOnceByClick(({ cartesian, cartographic, id }) => ({
      id,
      name: "billboard",
      position: cartesian,
      billboard: {
        image: that.newOptions.image,
        color: that.newOptions.color,
        scale: Cesium.defaultValue(that.newOptions.scale, 1)
      },
      properties: {
        type: "billboard",
        coordinate: [
          Cesium.Math.toDegrees(cartographic.longitude),
          Cesium.Math.toDegrees(cartographic.latitude),
          cartographic.height
        ]
      }
    }));
  }
  /**文字 */
  drawLabel(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    // 单击绘制文字
    that.drawOnceByClick(({ cartesian, cartographic, id }) => {
      if (!that.newOptions.text) {
        that.newOptions.text = "文字描述";
      }
      return {
        id,
        name: "label",
        position: cartesian,
        label: {
          text: that.newOptions.text,
          scale: Cesium.defaultValue(that.newOptions.scale, 1),
          fillColor: that.newOptions.color,
          font: "20px",
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          outlineColor: that.newOptions.outlineColor,
          outlineWidth: Cesium.defaultValue(that.newOptions.outlineWidth, 2),
          showBackground: Cesium.defaultValue(
            that.newOptions.showBackground,
            false
          ),
          backgroundColor: Cesium.defaultValue(
            that.newOptions.backgroundColor,
            Cesium.Color.BLACK.withAlpha(0.5)
          ),
          backgroundPadding: new Cesium.Cartesian2(4, 8)
        },
        properties: {
          type: "label",
          coordinate: [
            Cesium.Math.toDegrees(cartographic.longitude),
            Cesium.Math.toDegrees(cartographic.latitude),
            cartographic.height
          ],
          text: that.newOptions.text
        }
      };
    });
  }
  /**线 */
  drawPolyline(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    let endTipText = getEndTipText(that.newOptions.endType);
    let positions = [],
      entityOption,
      drawEntity;
    let isMove = true;
    const setTip = cartesian => {
      // 添加tip
      const tipText = positions.length > 1 ? endTipText : "点击绘制";
      this.addDrawTip(cartesian, tipText);
      // 移动坐标添加
      this.addMoveLabel(cartesian);
    };
    const click = m => {
      const id = Date.now();
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      const noCanAddPoint = that.newOptions.moveEvent
        ? isMove == false
        : cartesian.equals(positions[positions.length - 1]);
      if (!cartesian || noCanAddPoint) return;
      // 点
      that.addPoint(cartesian);
      // 线
      positions.push(cartesian);
      if (that.newOptions.moveEvent) {
        if (positions.length < 2) {
          positions.push(cartesian);
        }
      } else {
        setTip(cartesian);
      }
      if (!drawEntity && positions.length >= 2) {
        entityOption = {
          id,
          name: "polyline",
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              return positions;
            }, false),
            width: Cesium.defaultValue(that.newOptions.width, 4.0),
            material: new PolylineAntialiasingMaterialProperty({
              color: new Cesium.Color(
                that.newOptions.color.red,
                that.newOptions.color.green,
                that.newOptions.color.blue,
                1
              )
              // color: Cesium.Color.YELLOW
            })
          },
          properties: {
            type: "polyline"
          }
        };
        drawEntity = that.dataSource_draw.entities.add(entityOption);
      }
      isMove = false;
    };
    that.handler.setInputAction(click, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新线段终点
      that.addMoveAction(
        move_cartesian => {
          if (drawEntity) {
            positions[positions.length - 1] = move_cartesian;
          }
          setTip(move_cartesian);
        },
        () => {
          isMove = true;
        }
      );
    }
    that.handler.setInputAction(m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      if (!cartesian) return;
      // 移除最后点
      if (
        that.newOptions.endType == Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
      ) {
        if (that.newOptions.moveEvent) {
          positions.pop();
        }
      }
      // 追加点
      if (that.newOptions.endType == Cesium.ScreenSpaceEventType.RIGHT_CLICK) {
        if (!that.newOptions.moveEvent) {
          click(m);
        }
      }
      // 返回实体
      if (drawEntity && positions.length > 1) {
        // 存储
        entityOption.polyline.positions =
          entityOption.polyline.positions.getValue(
            that.viewer.clock.currentTime
          );
        entityOption.properties.coordinates = that.cartesianArrayToDegreesArray(
          entityOption.polyline.positions
        );
        // 添加并触发绘制结束监听
        that.addAndRaiseFinished(entityOption);
      }
      that.dataSource_draw.entities.removeAll();
      drawEntity = null;
      positions = [];
    }, that.newOptions.endType);
  }
  /**面 */
  drawPolygon(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    let endTipText = getEndTipText(that.newOptions.endType);
    let positions = [],
      line,
      entityOption = {
        properties: {
          type: "polygon"
        }
      },
      drawEntity;
    let isMove = true;
    const setTip = cartesian => {
      const tipEnd = that.newOptions.moveEvent
        ? positions.length > 2
        : positions.length >= 2;
      // 添加tip
      const tipText = tipEnd ? endTipText : "点击绘制";
      this.addDrawTip(cartesian, tipText);
      // 移动坐标添加
      this.addMoveLabel(cartesian);
    };
    const click = m => {
      const id = Date.now();
      entityOption.id = id;
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      const noCanAddPoint = that.newOptions.moveEvent
        ? isMove == false
        : cartesian.equals(positions[positions.length - 1]);
      if (!cartesian || noCanAddPoint) return;
      // 点
      that.addPoint(cartesian);
      // 坐标
      positions.push(cartesian);
      if (that.newOptions.moveEvent) {
        if (positions.length < 2) {
          positions.push(cartesian);
        }
      } else {
        setTip(cartesian);
      }
      // 线
      if (positions.length == 2) {
        const polylineOption = {
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const linePositions = JSON.parse(JSON.stringify(positions));
              if (linePositions.length > 2) {
                linePositions.push(positions[0]);
              }
              return linePositions;
            }, false),
            width: Cesium.defaultValue(that.newOptions.width, 4.0),
            material: new PolylineAntialiasingMaterialProperty({
              color: that.newOptions.outlineColor
            })
          }
        };
        if (that.newOptions.style == "outline") {
          entityOption.name = "polyline";
          polylineOption.polyline.material =
            new PolylineAntialiasingMaterialProperty({
              color: that.newOptions.color
            });
          entityOption.polyline = polylineOption.polyline;
        }
        line = that.dataSource_draw.entities.add(polylineOption);
      }
      // 面
      if (
        !drawEntity &&
        positions.length > 2 &&
        that.newOptions.style == "fill"
      ) {
        entityOption.name = "polygon";
        entityOption.polygon = {
          hierarchy: new Cesium.CallbackProperty(() => {
            return new Cesium.PolygonHierarchy(positions);
          }, false),
          material: that.newOptions.color,
          outline: true
        };
        drawEntity = that.dataSource_draw.entities.add(entityOption);
      }
      isMove = false;
    };
    that.handler.setInputAction(click, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新图形
      that.addMoveAction(
        move_cartesian => {
          if (line || drawEntity) {
            positions[positions.length - 1] = move_cartesian;
          }
          setTip(move_cartesian);
        },
        () => {
          isMove = true;
        }
      );
    }
    that.handler.setInputAction(m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      if (!cartesian) return;
      // 移除最后点
      if (
        that.newOptions.endType == Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
      ) {
        if (that.newOptions.moveEvent) {
          positions.pop();
        }
      }
      // 追加点
      if (that.newOptions.endType == Cesium.ScreenSpaceEventType.RIGHT_CLICK) {
        if (!that.newOptions.moveEvent) {
          click(m);
        }
      }
      // 返回实体
      if (positions.length > 2) {
        // 存储
        if (that.newOptions.style == "outline") {
          entityOption.polyline.positions =
            entityOption.polyline.positions.getValue(
              that.viewer.clock.currentTime
            );
          const newPosition = JSON.parse(
            JSON.stringify(entityOption.polyline.positions)
          );
          newPosition.shift();
          entityOption.properties.coordinates =
            that.cartesianArrayToDegreesArray(newPosition);
        } else {
          entityOption.polygon.hierarchy =
            entityOption.polygon.hierarchy.getValue(
              that.viewer.clock.currentTime
            ).positions;
          entityOption.properties.coordinates =
            that.cartesianArrayToDegreesArray(entityOption.polygon.hierarchy);
        }
        let coordinatesNew = JSON.parse(
          JSON.stringify(entityOption.properties.coordinates)
        );
        coordinatesNew.push(coordinatesNew[0]);
        // 面是否正常判断
        let poly = turf.polygon([coordinatesNew]);
        let kinks = turf.kinks(poly);
        if (kinks.features.length > 0) {
          message("请正确绘制多边形！", { type: "warning" });
        } else {
          // 添加并触发绘制结束监听
          that.addAndRaiseFinished(entityOption);
        }
      }
      that.dataSource_draw.entities.removeAll();
      drawEntity = null;
      positions = [];
    }, that.newOptions.endType);
  }
  /**矩形 */
  drawRectangle(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const endTipText = "点击结束";
    let positions = {
      start: null,
      end: null
    };
    let entityOption, drawEntity;
    let isMove = true;
    const setTip = cartesian => {
      // 添加tip
      const tipText = positions.start ? endTipText : "点击绘制";
      this.addDrawTip(cartesian, tipText);
      // 移动坐标添加
      this.addMoveLabel(cartesian);
    };
    const setDrawEntity = () => {
      const id = Date.now();
      if (that.newOptions.style == "fill") {
        entityOption = {
          id,
          name: "rectangle",
          rectangle: {
            coordinates: new Cesium.CallbackProperty(() => {
              return Cesium.Rectangle.fromCartesianArray([
                positions.start,
                positions.end
              ]);
            }, false),
            height: 0.1,
            material: that.newOptions.color,
            outline: true,
            outlineColor: that.newOptions.outlineColor
          },
          properties: {
            type: "rectangle"
          }
        };
      } else if (that.newOptions.style == "outline") {
        entityOption = {
          id,
          name: "polyline",
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const c = Cesium.Rectangle.fromCartesianArray([
                positions.start,
                positions.end
              ]);
              const radiansArray = [
                [c.west, c.north],
                [c.west, c.south],
                [c.east, c.south],
                [c.east, c.north],
                [c.west, c.north]
              ];
              return Cesium.Cartesian3.fromRadiansArray(
                radiansArray.flat(Infinity)
              );
            }, false),
            width: Cesium.defaultValue(that.newOptions.outlineWidth, 4.0),
            material: new PolylineAntialiasingMaterialProperty({
              color: that.newOptions.color
            })
          },
          properties: {
            type: "rectangle"
          }
        };
      }
      drawEntity = that.dataSource_draw.entities.add(entityOption);
    };
    const setDrawEntityEnd = () => {
      entityOption.properties.points = positions;
      if (that.newOptions.style == "outline") {
        entityOption.polyline.positions =
          entityOption.polyline.positions.getValue(
            that.viewer.clock.currentTime
          );
      } else {
        entityOption.rectangle.coordinates =
          entityOption.rectangle.coordinates.getValue(
            that.viewer.clock.currentTime
          );
      }
      // 存储
      const c = Cesium.Rectangle.fromCartesianArray([
        positions.start,
        positions.end
      ]);
      const radiansArray = [
        [c.west, c.north],
        [c.west, c.south],
        [c.east, c.south],
        [c.east, c.north],
        [c.west, c.north]
      ];
      const newPosition = Cesium.Cartesian3.fromRadiansArray(
        radiansArray.flat(Infinity)
      );
      newPosition.shift();
      entityOption.properties.coordinates =
        that.cartesianArrayToDegreesArray(newPosition);
      entityOption.properties.rectangle = Cesium.Rectangle.fromCartesianArray([
        positions.start,
        positions.end
      ]);
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(entityOption);
      that.dataSource_draw.entities.removeAll();
      drawEntity = null;
      positions = [];
    };
    const click = m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      const noCanAddPoint = that.newOptions.moveEvent
        ? isMove == false
        : cartesian.equals(positions.start);
      if (!cartesian || noCanAddPoint) return;
      // 点
      that.addPoint(cartesian);
      if (that.newOptions.moveEvent) {
        if (!positions.start && !positions.end) {
          positions.start = cartesian;
          positions.end = cartesian;
          setDrawEntity();
        } else {
          setDrawEntityEnd();
        }
        isMove = false;
      } else {
        if (!positions.start) {
          positions.start = cartesian;
          setTip(cartesian);
        } else if (!positions.end) {
          positions.end = cartesian;
          setDrawEntity();
          setDrawEntityEnd();
        }
      }
    };
    that.handler.setInputAction(click, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新矩形
      that.addMoveAction(
        move_cartesian => {
          if (drawEntity) {
            positions.end = move_cartesian;
          }
          setTip(move_cartesian);
        },
        () => {
          isMove = true;
        }
      );
    }
  }
  /**圆形 */
  drawCircle(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const endTipText = "点击结束";
    let radius = 0,
      positions = {
        start: null,
        end: null
      },
      entityOption,
      drawEntity;
    let isMove = true;
    const setTip = cartesian => {
      // 添加tip
      const tipText = positions.start ? endTipText : "点击绘制";
      this.addDrawTip(cartesian, tipText);
      // 移动坐标添加
      this.addMoveLabel(cartesian);
    };
    const setDrawEntity = () => {
      const id = Date.now();
      if (that.newOptions.style == "fill") {
        entityOption = {
          id,
          name: "ellipse",
          position: positions.start,
          ellipse: {
            semiMajorAxis: new Cesium.CallbackProperty(() => {
              return radius;
            }, false),
            semiMinorAxis: new Cesium.CallbackProperty(() => {
              return radius;
            }, false),
            material: that.newOptions.color,
            height: Cesium.defaultValue(that.newOptions.height, 0.05),
            outline: true,
            outlineColor: that.newOptions.outlineColor
          },
          properties: {
            type: "circle"
          }
        };
      } else if (that.newOptions.style == "outline") {
        entityOption = {
          id,
          name: "polyline",
          polyline: {
            positions: new Cesium.CallbackProperty(() => {
              const linePositions = shapeCoordinates.getCirclePositions(
                positions.start,
                radius
              );
              return linePositions;
            }, false),
            width: Cesium.defaultValue(that.newOptions.outlineWidth, 4.0),
            material: new PolylineAntialiasingMaterialProperty({
              color: that.newOptions.color
            })
          },
          properties: {
            type: "circle"
          }
        };
      }
      drawEntity = that.dataSource_draw.entities.add(entityOption);
    };
    const setDrawEntityEnd = () => {
      // 记录
      entityOption.properties.points = positions;
      if (that.newOptions.style == "outline") {
        entityOption.polyline.positions =
          entityOption.polyline.positions.getValue(
            that.viewer.clock.currentTime
          );
      } else {
        entityOption.ellipse.semiMajorAxis = radius;
        entityOption.ellipse.semiMinorAxis = radius;
      }
      // 存储
      const newPosition = shapeCoordinates.getCirclePositions(
        positions.start,
        radius
      );
      newPosition.shift();
      entityOption.properties.coordinates =
        that.cartesianArrayToDegreesArray(newPosition);
      const start_carto = Cesium.Cartographic.fromCartesian(positions.start);
      entityOption.properties.center = [
        Cesium.Math.toDegrees(start_carto.longitude),
        Cesium.Math.toDegrees(start_carto.latitude),
        start_carto.height
      ];
      entityOption.properties.radius = radius;
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(entityOption);
      that.dataSource_draw.entities.removeAll();
      drawEntity = null;
      positions = {
        start: null,
        end: null
      };
    };
    const click = m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      const noCanAddPoint = that.newOptions.moveEvent
        ? isMove == false
        : cartesian.equals(positions.start);
      if (!cartesian || noCanAddPoint) return;
      // 点
      that.addPoint(cartesian);
      if (that.newOptions.moveEvent) {
        if (!positions.start) {
          positions.start = cartesian;
          positions.end = cartesian;
          setDrawEntity();
        } else {
          setDrawEntityEnd();
        }
        isMove = false;
      } else {
        if (!positions.start) {
          positions.start = cartesian;
          setTip(cartesian);
        } else if (!positions.end) {
          positions.end = cartesian;
          radius = Cesium.Cartesian3.distance(positions.start, positions.end);
          setDrawEntity();
          setDrawEntityEnd();
        }
      }
    };
    that.handler.setInputAction(click, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新圆形
      that.addMoveAction(
        move_cartesian => {
          if (drawEntity) {
            positions.end = move_cartesian;
            radius = Cesium.Cartesian3.distance(
              positions.start,
              move_cartesian
            );
          }
          setTip(move_cartesian);
        },
        () => {
          isMove = true;
        }
      );
    }
  }
  /**扇形 */
  drawSector(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const endTipText = "点击结束";
    let positions = {
        first: null,
        second: null,
        end: null
      },
      hasSecond = false,
      radius = 0,
      startAngle = 0,
      endAngle = 0,
      entityOption = {
        properties: {
          type: "sector"
        }
      },
      drawEntity,
      drawPositions = [];
    let isMove = true;
    let polylineOption = {
      width: Cesium.defaultValue(that.newOptions.outlineWidth, 4.0),
      material: new PolylineAntialiasingMaterialProperty({
        color: that.newOptions.color
      })
    };
    const setTip = cartesian => {
      // 添加tip
      const tipText = positions.first && hasSecond ? endTipText : "点击绘制";
      this.addDrawTip(cartesian, tipText);
      // 移动坐标添加
      this.addMoveLabel(cartesian);
    };
    const setDrawEntity = () => {
      if (!positions.first || !positions.second) {
        return;
      }
      if (!positions.end) {
        polylineOption.positions = new Cesium.CallbackProperty(() => {
          return [positions.first, positions.second];
        }, false);
        that.dataSource_draw.entities.add({
          polyline: polylineOption
        });
      } else {
        const sectorData = shapeCoordinates.getSectorPositions(
          positions.first,
          positions.second,
          positions.end
        );
        drawPositions = sectorData.positions;
        radius = sectorData.radius;
        startAngle = sectorData.startAngle;
        endAngle = sectorData.endAngle;
        // 不存在添加实体
        if (!drawEntity) {
          // 清除line
          that.dataSource_draw.entities.removeAll();
          // 添加
          if (that.newOptions.style == "fill") {
            entityOption.name = "polygon";
            entityOption.polygon = {
              hierarchy: new Cesium.CallbackProperty(() => {
                return new Cesium.PolygonHierarchy(
                  Cesium.Cartesian3.fromDegreesArray(
                    drawPositions.flat(Infinity)
                  )
                );
              }, false),
              material: that.newOptions.color,
              height: 0.1,
              outline: true,
              outlineColor: that.newOptions.outlineColor
            };
          } else if (that.newOptions.style == "outline") {
            entityOption.name = "polyline";
            polylineOption.positions = new Cesium.CallbackProperty(() => {
              return Cesium.Cartesian3.fromDegreesArray(
                drawPositions.flat(Infinity)
              );
            }, false);
            entityOption.polyline = polylineOption;
          }
          drawEntity = that.dataSource_draw.entities.add(entityOption);
        }
      }
    };
    const setDrawEntityEnd = () => {
      // 记录
      entityOption.properties.points = positions;
      entityOption.properties.radius = radius;
      entityOption.properties.startAngle = startAngle;
      entityOption.properties.endAngle = endAngle;
      if (that.newOptions.style == "outline") {
        entityOption.polyline.positions =
          entityOption.polyline.positions.getValue(
            that.viewer.clock.currentTime
          );
      } else {
        entityOption.polygon.hierarchy =
          entityOption.polygon.hierarchy.getValue(
            that.viewer.clock.currentTime
          ).positions;
      }
      entityOption.properties.coordinates = drawPositions;
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(entityOption);
      that.dataSource_draw.entities.removeAll();
      drawEntity = null;
      positions = {
        first: null,
        second: null,
        end: null
      };
      startAngle = 0;
      endAngle = 0;
      radius = 0;
      hasSecond = false;
      entityOption = {
        properties: {
          type: "sector"
        }
      };
    };
    const click = m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      if (!cartesian || (that.newOptions.moveEvent && isMove == false)) return;
      // 点
      that.addPoint(cartesian);
      if (that.newOptions.moveEvent) {
        if (!positions.first) {
          positions.first = cartesian;
          positions.second = cartesian;
        } else {
          if (!hasSecond) {
            hasSecond = true;
          } else {
            setDrawEntityEnd();
          }
        }
        isMove = false;
      } else {
        if (!positions.first) {
          positions.first = cartesian;
          setTip(cartesian);
        } else {
          if (!hasSecond) {
            positions.second = cartesian;
            hasSecond = true;
            setTip(cartesian);
            setDrawEntity();
          } else {
            positions.end = cartesian;
            setDrawEntity();
            setDrawEntityEnd();
          }
        }
      }
    };
    that.handler.setInputAction(click, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新扇形
      that.addMoveAction(
        move_cartesian => {
          if (!positions.first) return;
          if (!hasSecond) {
            positions.second = move_cartesian;
          } else {
            positions.end = move_cartesian;
          }
          setDrawEntity();
        },
        () => {
          isMove = true;
        }
      );
    }
  }
  /**长圆 */
  drawRectangleCircle(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const endTipText = "点击结束";
    let positions = {
        first: null,
        second: null,
        end: null
      },
      radius = 0,
      hasSecond = false,
      entityOption = {
        properties: {
          type: "rectangleCircle"
        }
      },
      drawEntity,
      drawPositions = [];
    let isMove = true;
    let polylineOption = {
      width: Cesium.defaultValue(that.newOptions.outlineWidth, 4.0),
      material: new PolylineAntialiasingMaterialProperty({
        color: that.newOptions.color
      })
    };
    const setTip = cartesian => {
      // 添加tip
      const tipText = positions.first && hasSecond ? endTipText : "点击绘制";
      this.addDrawTip(cartesian, tipText);
      // 移动坐标添加
      this.addMoveLabel(cartesian);
    };
    const setDrawEntity = () => {
      if (!positions.first || !positions.second) {
        return;
      }
      if (!positions.end) {
        polylineOption.positions = new Cesium.CallbackProperty(() => {
          return [positions.first, positions.second];
        }, false);
        that.dataSource_draw.entities.add({
          polyline: polylineOption
        });
      } else {
        const ovalData = shapeCoordinates.getRectangleCirclePositions(
          positions.first,
          positions.second,
          positions.end
        );
        drawPositions = ovalData.positions;
        radius = ovalData.radius;
        // 不存在添加实体
        if (!drawEntity) {
          // 清除line
          that.dataSource_draw.entities.removeAll();
          // 添加
          if (that.newOptions.style == "fill") {
            entityOption.name = "polygon";
            entityOption.polygon = {
              hierarchy: new Cesium.CallbackProperty(() => {
                return new Cesium.PolygonHierarchy(
                  Cesium.Cartesian3.fromDegreesArray(
                    drawPositions.flat(Infinity)
                  )
                );
              }, false),
              material: that.newOptions.color,
              height: 0.1,
              outline: true,
              outlineColor: that.newOptions.outlineColor
            };
          } else if (that.newOptions.style == "outline") {
            entityOption.name = "polyline";
            polylineOption.positions = new Cesium.CallbackProperty(() => {
              return Cesium.Cartesian3.fromDegreesArray(
                drawPositions.flat(Infinity)
              );
            }, false);
            entityOption.polyline = polylineOption;
          }
          drawEntity = that.dataSource_draw.entities.add(entityOption);
        }
      }
    };
    const setDrawEntityEnd = () => {
      // 记录
      entityOption.properties.points = positions;
      entityOption.properties.radius = radius;
      if (that.newOptions.style == "outline") {
        entityOption.polyline.positions =
          entityOption.polyline.positions.getValue(
            that.viewer.clock.currentTime
          );
      } else {
        entityOption.polygon.hierarchy =
          entityOption.polygon.hierarchy.getValue(
            that.viewer.clock.currentTime
          ).positions;
      }
      entityOption.properties.coordinates = drawPositions;
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(entityOption);
      that.dataSource_draw.entities.removeAll();
      drawEntity = null;
      positions = {
        first: null,
        second: null,
        end: null
      };
      radius = 0;
      hasSecond = false;
      entityOption = {
        properties: {
          type: "rectangleCircle"
        }
      };
    };
    const click = m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      if (!cartesian || (that.newOptions.moveEvent && isMove == false)) return;
      // 点
      that.addPoint(cartesian);
      if (that.newOptions.moveEvent) {
        if (!positions.first) {
          positions.first = cartesian;
          positions.second = cartesian;
        } else {
          if (!hasSecond) {
            hasSecond = true;
          } else {
            setDrawEntityEnd();
          }
        }
        isMove = false;
      } else {
        if (!positions.first) {
          positions.first = cartesian;
          setTip(cartesian);
        } else {
          if (!hasSecond) {
            positions.second = cartesian;
            hasSecond = true;
            setTip(cartesian);
            setDrawEntity();
          } else {
            positions.end = cartesian;
            setDrawEntity();
            setDrawEntityEnd();
          }
        }
      }
    };
    that.handler.setInputAction(click, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新长圆
      that.addMoveAction(
        move_cartesian => {
          setTip(move_cartesian);
          if (!positions.first) return;
          if (!hasSecond) {
            positions.second = move_cartesian;
          } else {
            positions.end = move_cartesian;
          }
          setDrawEntity();
        },
        () => {
          isMove = true;
        }
      );
    }
  }
  /**添加点 */
  addPoint(cartesian) {
    const that = this;
    // 点
    that.dataSource_draw.entities.add({
      position: cartesian,
      point: {
        color: new Cesium.Color(
          that.newOptions.color.red,
          that.newOptions.color.green,
          that.newOptions.color.blue,
          1
        ),
        pixelSize: 4,
        height: Cesium.defaultValue(that.newOptions.height, 0.05),
        outlineColor: that.newOptions.outlineColor,
        outlineWidth: 2
      }
    });
  }
  /**添加实体
   * @param {Object} cesium entity options
   */
  add(options) {
    const that = this;
    const entityType = options.name;
    // 添加
    const entity = this.dataSource.entities.add(options);
    // 记录
    if (entityType == "polyline") {
      options[entityType].material = options[entityType].material.color;
    }
    if (!entity.properties) entity.properties = {};
    // callback数据处理
    if (options.name == "polyline") {
      options.polyline.positions = entity.polyline.positions.getValue(
        that.viewer.clock.currentTime
      );
    } else if (options.name == "polygon") {
      if (options.polygon) {
        options.polygon.hierarchy = entity.polygon.hierarchy.getValue(
          that.viewer.clock.currentTime
        );
      } else if (options.polyline) {
        options.polyline.material = entity.polyline.material.color;
        options.polyline.positions = entity.polyline.positions.getValue(
          that.viewer.clock.currentTime
        );
      }
    } else if (options.name == "rectangle") {
      if (options.rectangle) {
        options.rectangle.coordinates = entity.rectangle.coordinates.getValue(
          that.viewer.clock.currentTime
        );
      } else if (options.polyline) {
        options.polyline.material = entity.polyline.material.color;
        options.polyline.positions = entity.polyline.positions.getValue(
          that.viewer.clock.currentTime
        );
      }
    } else if (options.name == "circle") {
      if (options.ellipse) {
        options.ellipse.semiMajorAxis = entity.ellipse.semiMajorAxis.getValue(
          that.viewer.clock.currentTime
        );
        options.ellipse.semiMinorAxis = entity.ellipse.semiMinorAxis.getValue(
          that.viewer.clock.currentTime
        );
      } else if (options.polyline) {
        options.polyline.material = entity.polyline.material.color;
        options.polyline.positions = entity.polyline.positions.getValue(
          that.viewer.clock.currentTime
        );
      }
    }
    entity.properties.option = options;
    return entity;
  }
  /**开启删除*/
  remove(entity) {
    this.dataSource.entities.remove(entity);
  }
  /**获取label通用样式 */
  getLabelOption() {
    return {
      font: "bold 14px sans-serif",
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      pixelOffset: new Cesium.Cartesian2(0, 25),
      // scaleByDistance: new Cesium.NearFarScalar(0, 0.8, 1000000, 0),
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      outlineWidth: 4,
      outlineColor: Cesium.Color.BLACK
      // showBackground: true,
      // backgroundColor: Cesium.Color.fromCssColorString("#000").withAlpha(0.3),
      // backgroundPadding: new Cesium.Cartesian2(5, 10)
    };
  }
  /**在当前绘制图形基础上添加json数据图形
   * @param {Object} json downLoad保存文件内容
   */
  addFromJson(json) {
    const that = this;
    for (const [key, value] of Object.entries(json.data)) {
      value.forEach(val => {
        const type = val.name;
        if (!that.dataSource.entities.getById(val.id)) {
          const entity = that.dataSource.entities.add(val);
          // 记录
          if (!entity.properties) entity.properties = {};
          entity.properties.option = val;
          if (val[type].material) {
            if (type == "polyline") {
              entity[type].material = new PolylineAntialiasingMaterialProperty({
                color: val[type].material
              });
            } else {
              entity[type].material = new Cesium.ColorMaterialProperty(
                val[type].material
              );
            }
          }
        }
      });
    }
  }
  /**保存已绘制内容至本地
   * @param {String} name 文件名称 default: drawEntities
   */
  downLoad(name) {
    this.stop();
    const downLoadName = Cesium.defaultValue(name, "drawEntities");
    // 数据整理
    const data = {};
    this.dataSource.entities.values.forEach(entity => {
      let type = entity.properties.getValue(this.viewer.clock.currentTime).type;
      if (!data[type]) data[type] = [];
      data[type].push(entity.properties.option);
    });
    const a = document.createElement("a");
    const loadData = {
      data
    };
    const json = JSON.stringify(loadData);
    const url = `data:,${json}`;
    a.href = url;
    a.download = downLoadName + ".json";
    a.click();
  }
  /**停止绘制 */
  stop() {
    // viewer 已销毁时（如退出登录先清地图）不再访问 scene
    const viewerAlive =
      this.viewer &&
      !(
        typeof this.viewer.isDestroyed === "function" &&
        this.viewer.isDestroyed()
      );
    // 恢复鼠标样式
    if (viewerAlive) this.viewer.scene.canvas.style.cursor = "default";
    if (this.dataSource_draw) {
      // 清空绘制过程中产生的图形
      this.dataSource_draw.entities.removeAll();
      this.tipEntity = null;
      this.moveLabel = null;
    }
    if (this.handler) {
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
      this.handler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
      );
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
      this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
  }
  cartesianArrayToDegreesArray(cartesianArray) {
    const cartographicArray =
      Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(cartesianArray);
    const coordinates = [];
    cartographicArray.forEach(cartographic => {
      coordinates.push([
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude)
      ]);
    });
    return coordinates;
  }
  /**清空绘制 */
  clear() {
    // 停止绘制并清空过程图形（stop 已处理）
    this.stop();
    if (this.dataSource) {
      // 清空存储图形
      this.dataSource.entities.removeAll();
    }
  }
  /**添加提示 */
  addDrawTip(cartesian, text) {
    if (!cartesian) return;
    if (!this.tipEntity) {
      this.tipEntity = this.dataSource_draw.entities.add({
        position: cartesian,
        label: Object.assign(this.getLabelOption(), {
          text
        })
      });
      return;
    }
    this.tipEntity.position = cartesian;
    this.tipEntity.label.text = text;
  }
  /**移除提示 */
  removeDrawTip() {
    if (!this.tipEntity) return;
    this.dataSource_draw.entities.remove(this.tipEntity);
    this.tipEntity = null;
  }
  /**绘制过程中添加位置 */
  addMoveLabel(cartesian) {
    if (!cartesian || !this.moveCoordinate) return;
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const lon = Cesium.Math.toDegrees(carto.longitude);
    const lat = Cesium.Math.toDegrees(carto.latitude);
    const degrees_new = coordinateConversionTool.degreesToDegrees60(
      lon,
      lat,
      true
    );
    const text = `${degrees_new.longString}\n${degrees_new.latString}\n`;
    if (!this.moveLabel) {
      this.moveLabel = this.dataSource_draw.entities.add({
        position: cartesian,
        label: Object.assign(this.getLabelOption(), {
          text,
          pixelOffset: new Cesium.Cartesian2(0, 0)
        })
      });
      return;
    }
    this.moveLabel.position = cartesian;
    this.moveLabel.label.text = text;
  }
  /**移除绘制过程中位置 */
  removeMoveLabel() {
    if (!this.moveLabel) return;
    this.dataSource_draw.entities.remove(this.moveLabel);
    this.moveLabel = null;
  }
  /**注销对象 */
  destroy() {
    this.stop();
    this.clear();
    const viewerAlive =
      this.viewer &&
      !(
        typeof this.viewer.isDestroyed === "function" &&
        this.viewer.isDestroyed()
      );
    if (viewerAlive) {
      this.viewer.dataSources.remove(this.dataSource, true);
      if (this.mapDomMouseout) {
        this.viewer.scene.canvas.removeEventListener(
          "mouseout",
          this.mapDomMouseout
        );
        this.mapDomMouseout = null;
      }
    }
    this.drawFinished = null;
    this.dataSource = null;
    this.viewer = null;
    this.scene = null;
    this.ellipsoid = null;
    this.canvas = null;
    this.handler = null;
    this.options = null;
  }
}
export { DrawHandler };
