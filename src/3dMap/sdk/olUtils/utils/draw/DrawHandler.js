import { message } from "@/3dMap/interface";
import { getColorAlpha } from "../CorlorTool";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import * as turf from "@turf/turf";
import {
  shapeCoordinates,
  coordinateConversionTool
} from "@/3dMap/sdk/cesiumUtils";
const getEndTipText = mode_endType => {
  if (mode_endType == "dblclick") {
    return "双击结束";
  }
  return "右键结束";
};
/**绘制对象 */
class DrawHandler {
  constructor(olMap, option = {}) {
    const defaultOption = {
      style: "fill",
      color: "#ffff00",
      alpha: 0.5,
      outlineColor: "#ffff00",
      outlineAlpha: 1,
      outlineWidth: 2,
      moveEvent: true, // 移动事件
      moveCoordinate: true, // 移动实时坐标，moveEvent为true生效
      moveCoordinateFormat: "lonlat", // 鼠标位置坐标格式，lonlat 经纬度，dms 度分秒
      endType: "contextmenu"
    };
    // 合并参数
    const newOption = Object.assign({}, defaultOption, option);
    const { moveCoordinate, ...other } = newOption;
    this.moveCoordinate = moveCoordinate;
    this.moveCoordinateFormat = newOption.moveCoordinateFormat;
    this.moveLabel = null;
    this.tipFeature = null;
    this.olMap = olMap;
    this.events = {};
    this.drawFinished = new Cesium.Event();
    // 样式
    this.options = { ...other };
    // 添加过程中
    this.layer_draw = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.layer_draw.setZIndex(Number.MAX_VALUE);
    this.olMap.addLayer(this.layer_draw);
    // 添加集合
    this.layer = new ol.VectorLayer({
      source: new ol.VectorSource(),
      updateWhileAnimating: true,
      updateWhileInteracting: true
    });
    this.olMap.addLayer(this.layer);
    // 鼠标样式
    this.mapDomMouseout = () => {
      // 移除tip
      this.removeDrawTip();
      // 移动坐标移除
      this.removeMoveLabel();
    };
    this.olMap.addEventListener("mouseout", this.mapDomMouseout);
  }
  /**开始绘制
   * @param {String} type 绘制类型
   * @param {Object} options 根据绘制类型定义绘制样式options
   * @param {String} options.style default: fill
   * @param {Object} options.color Color
   * @param {Object} options.outlineColor Color
   * @param {Number} options.outlineWidth default: 2 线宽
   */
  start(type, options) {
    if (type == "point") {
      this.drawPoint(options);
    }
    if (type == "billboard") {
      this.drawBillboard(options);
    }
    if (type == "label") {
      this.drawLabel(options);
    } else if (type == "polyline") {
      this.drawPolyline(options);
    } else if (type == "polygon") {
      this.drawPolygon(options);
    } else if (type == "rectangle") {
      this.drawRectangle(options);
    } else if (type == "circle") {
      this.drawCircle(options);
    } else if (type == "sector") {
      this.drawSector(options);
    } else if (type == "rectangleCircle") {
      this.drawRectangleCircle(options);
    }
  }
  /**更新绘制参数 */
  upDataAttribute(name, value) {
    if (this.newOptions) {
      this.newOptions[name] = value;
    }
  }
  /**设置监听 */
  setMapEvents() {
    for (const [type, event] of Object.entries(this.events)) {
      this.olMap.addEventListener(type, event);
    }
  }
  /**获取feature样式 */
  getFeatureOptions() {
    const that = this;
    const color = getColorAlpha(that.newOptions.color, that.newOptions.alpha);
    const outlineColor = getColorAlpha(
      that.newOptions.outlineColor,
      that.newOptions.outlineAlpha
    );
    const point = {
      radius: that.newOptions.pixelSize || 6, // 半径
      fill: new ol.style.Fill({ color }),
      stroke: new ol.style.Stroke({
        color: outlineColor,
        width: that.newOptions.outlineWidth
      })
    };
    const label = {
      font: "bold 16px sans-serif",
      scale: that.newOptions.scale || 1,
      fill: new ol.style.Fill({ color }),
      stroke: new ol.style.Stroke({
        color: outlineColor,
        width: that.newOptions.outlineWidth
      })
    };
    // 线统一使用边线颜色、透明度与宽度
    const lineStroke = () =>
      new ol.style.Stroke({
        color: outlineColor,
        width: that.newOptions.outlineWidth || 2
      });
    const polyline = {
      stroke: lineStroke()
    };
    // 边线样式只描边，不创建填充
    const isOutline = that.newOptions.style == "outline";
    const polygon = isOutline
      ? {
          stroke: lineStroke()
        }
      : {
          fill: new ol.style.Fill({ color }),
          stroke: lineStroke()
        };
    return {
      point,
      label,
      polyline,
      polygon
    };
  }
  /** 按当前格式生成鼠标位置文字，lonlat 为经纬度，dms 为度分秒 */
  getMoveCoordinateText(lon, lat) {
    if (this.moveCoordinateFormat === "dms") {
      const degrees_new = coordinateConversionTool.degreesToDegrees60(
        lon,
        lat,
        true
      );
      // 转换失败时继续走经纬度，避免鼠标移动过程被打断
      if (degrees_new) {
        return `${degrees_new.showLatString}\n${degrees_new.showLongString}\n`;
      }
    }
    const lonText = Number(lon).toFixed(5);
    const latText = Number(lat).toFixed(5);
    return `X: ${lonText}\nY: ${latText}`;
  }
  /** 与三维一致，把样式和边线宽度记到结果上，编辑时按 outline 描边 */
  getShapeStyle() {
    return {
      style: this.newOptions.style,
      outlineWidth: this.newOptions.outlineWidth
    };
  }
  /**初始化绘制
   * 合并绘制参数并重置上一次绘制状态
   * @param {Object} options 绘制样式参数
   */
  initDraw(options) {
    const that = this;
    const next = options || {};
    // 鼠标坐标开关和格式挂在实例上，绘制过程中直接读取
    if (typeof next.moveCoordinate === "boolean") {
      that.moveCoordinate = next.moveCoordinate;
    }
    if (next.moveCoordinateFormat) {
      that.moveCoordinateFormat = next.moveCoordinateFormat;
    }
    // 合并绘制参数
    that.newOptions = Object.assign(that.options, next);
    // 停止上一次绘制并清空过程图形
    that.stop();
    // 设置鼠标样式为crosshair
    that.olMap.getViewport().style.cursor = "crosshair";
  }
  /**单击添加图形（点、图标、文字等单点图形）
   * @param {Function} buildFeature 构建feature，参数为点击坐标 coordinate
   * @param {Function} buildStyle 构建样式，参数为点击坐标 coordinate
   */
  drawOnceByClick(buildFeature, buildStyle) {
    const that = this;
    this.events = {
      click: evt => {
        const coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
        if (!coordinate) return;
        const drawFeature = buildFeature(coordinate);
        drawFeature.setStyle(buildStyle(coordinate));
        // 添加并触发绘制结束监听
        that.addAndRaiseFinished(drawFeature);
      }
    };
    this.setMapEvents();
  }
  /**注册鼠标移动监听
   * 移动时实时更新绘制图形，鼠标移出画布时移除提示
   * @param {Function} onMove 移动回调，参数为移动位置 coordinate
   * @param {Function} onMoveStart 移动开始标记回调（用于更新加点状态）
   */
  addPointerMove(onMove, onMoveStart) {
    const that = this;
    this.events.pointermove = evt => {
      // 标记已移动，允许继续加点
      onMoveStart && onMoveStart();
      const coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      if (!coordinate) {
        // 移除tip
        that.removeDrawTip();
        // 移动坐标移除
        that.removeMoveLabel();
        return;
      }
      onMove(coordinate);
    };
  }
  /**添加绘制过程中的点 */
  addDrawPoint(coordinate, point) {
    const currentPoint = new ol.Feature({
      geometry: new ol.geom.Point(coordinate)
    });
    currentPoint.setStyle(
      new ol.style.Style({
        image: new ol.style.Circle(point)
      })
    );
    this.layer_draw.getSource().addFeature(currentPoint);
  }
  /**添加feature至存储图层并触发绘制结束监听 */
  addAndRaiseFinished(drawFeature) {
    this.layer.getSource().addFeature(drawFeature);
    // 执行绘制结束监听
    this.drawFinished.raiseEvent(drawFeature);
  }
  /**点 */
  drawPoint(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const point = that.getFeatureOptions().point;
    // 单击绘制点
    that.drawOnceByClick(
      coordinate =>
        new ol.Feature({
          geometry: new ol.geom.Point(coordinate),
          properties: {
            type: "point",
            coordinate
          }
        }),
      () =>
        new ol.style.Style({
          image: new ol.style.Circle(point)
        })
    );
  }
  /**图标 */
  drawBillboard(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    if (!that.newOptions.image) {
      console.warn("请输入图片");
      return;
    }
    const color = getColorAlpha(that.newOptions.color, that.newOptions.alpha);
    const image = {
      src: that.newOptions.image, // 图标地址
      color,
      scale: that.newOptions.scale || 1 // 图标大小
    };
    // 单击绘制图标
    that.drawOnceByClick(
      coordinate =>
        new ol.Feature({
          geometry: new ol.geom.Point(coordinate),
          properties: {
            type: "billboard",
            coordinate
          }
        }),
      () =>
        new ol.style.Style({
          image: new ol.style.Icon(image)
        })
    );
  }
  /**文字 */
  drawLabel(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const label = that.getFeatureOptions().label;
    // 单击绘制文字
    that.drawOnceByClick(
      coordinate => {
        if (!that.newOptions.text) {
          that.newOptions.text = "文字描述";
        }
        return new ol.Feature({
          geometry: new ol.geom.Point(coordinate),
          properties: {
            type: "label",
            coordinate,
            text: that.newOptions.text
          }
        });
      },
      () =>
        new ol.style.Style({
          text: new ol.style.Text(label)
        })
    );
  }
  /**线 */
  drawPolyline(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    let endTipText = getEndTipText(this.newOptions.endType);
    const featuresOptions = that.getFeatureOptions();
    const point = featuresOptions.point;
    const polyline = featuresOptions.polyline;
    let positions = [];
    let drawFeature;
    let isMove = true;
    const setDrawFeature = () => {
      if (positions.length < 2) {
        return;
      }
      if (!drawFeature) {
        drawFeature = new ol.Feature({
          geometry: new ol.geom.LineString(positions)
        });
        drawFeature.setStyle(new ol.style.Style(polyline));
        that.layer_draw.getSource().addFeature(drawFeature);
      } else {
        drawFeature.getGeometry().setCoordinates(positions);
      }
    };
    const setTip = coordinate => {
      // 添加tip
      const tipText = positions.length >= 1 ? endTipText : "点击绘制";
      that.addDrawTip(coordinate, tipText);
      // 移动坐标添加
      that.addMoveLabel(coordinate);
    };
    const click = evt => {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      const noCanAddPoint = that.events.pointermove
        ? isMove == false
        : coordinate[0] == positions[positions.length - 1]?.[0] &&
          coordinate[1] == positions[positions.length - 1]?.[1];
      if (!coordinate || noCanAddPoint) return;
      // 点
      that.addDrawPoint(coordinate, point);
      // 线
      positions.push(coordinate);
      // pointermove事件判断
      if (that.events.pointermove) {
        if (positions.length < 2) {
          positions.push(coordinate);
        }
        isMove = false;
      } else {
        setTip(coordinate);
        setDrawFeature();
      }
    };
    this.events = {
      click
    };
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新绘制图形
      that.addPointerMove(
        coordinate => {
          setTip(coordinate);
          if (positions.length < 2) return;
          positions[positions.length - 1] = coordinate;
          setDrawFeature();
        },
        () => {
          isMove = true;
        }
      );
    }
    this.events[that.newOptions.endType] = function (evt) {
      // 移除最后点
      if (that.newOptions.endType == "dblclick") {
        if (that.newOptions.moveEvent) {
          positions.pop();
        }
      }
      // 追加点
      if (that.newOptions.endType == "contextmenu") {
        if (!that.newOptions.moveEvent) {
          click(evt);
        }
      }
      // 返回实体
      if (drawFeature && positions.length > 1) {
        // 存储
        drawFeature.set("properties", {
          type: "polyline",
          coordinates: positions,
          ...that.getShapeStyle()
        });
        // 添加并触发绘制结束监听
        that.addAndRaiseFinished(drawFeature);
      }
      that.layer_draw.getSource().clear();
      drawFeature = null;
      positions = [];
    };
    this.setMapEvents();
  }
  /**面 */
  drawPolygon(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    let endTipText = getEndTipText(this.newOptions.endType);
    const featuresOptions = that.getFeatureOptions();
    const point = featuresOptions.point;
    const polyline = featuresOptions.polyline;
    const polygon = featuresOptions.polygon;
    let positions = [],
      line,
      drawFeature;
    let isMove = true;
    const setDrawFeature = () => {
      if (positions.length == 2) {
        if (!line) {
          line = new ol.Feature({
            geometry: new ol.geom.LineString(positions)
          });
          line.setStyle(new ol.style.Style(polyline));
          that.layer_draw.getSource().addFeature(line);
        } else {
          line.getGeometry().setCoordinates(positions);
        }
      }
      if (positions.length > 2) {
        if (!drawFeature) {
          if (line) that.layer_draw.getSource().removeFeature(line);
          drawFeature = new ol.Feature({
            geometry: new ol.geom.Polygon([[...positions, positions[0]]])
          });
          drawFeature.setStyle(new ol.style.Style(polygon));
          that.layer_draw.getSource().addFeature(drawFeature);
        } else {
          drawFeature
            .getGeometry()
            .setCoordinates([[...positions, positions[0]]]);
        }
      }
    };
    const setTip = coordinate => {
      const tipEnd = that.events.pointermove
        ? positions.length > 2
        : positions.length >= 2;
      // 添加tip
      const tipText = tipEnd ? endTipText : "点击绘制";
      that.addDrawTip(coordinate, tipText);
      // 移动坐标添加
      that.addMoveLabel(coordinate);
    };
    const click = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      const noCanAddPoint = that.events.pointermove
        ? isMove == false
        : coordinate[0] == positions[positions.length - 1]?.[0] &&
          coordinate[1] == positions[positions.length - 1]?.[1];
      if (!coordinate || noCanAddPoint) return;
      // 点
      that.addDrawPoint(coordinate, point);
      // 线
      positions.push(coordinate);
      // pointermove事件判断
      if (that.events.pointermove) {
        if (positions.length < 2) {
          positions.push(coordinate);
        }
        isMove = false;
      } else {
        setTip(coordinate);
        setDrawFeature();
      }
    };
    this.events = {
      click
    };
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新绘制图形
      that.addPointerMove(
        coordinate => {
          setTip(coordinate);
          if (positions.length < 2) return;
          positions[positions.length - 1] = coordinate;
          setDrawFeature();
        },
        () => {
          isMove = true;
        }
      );
    }
    this.events[that.newOptions.endType] = function (evt) {
      // 移除最后点
      if (that.newOptions.endType == "dblclick") {
        if (that.newOptions.moveEvent) {
          positions.pop();
        }
      }
      // 追加点
      if (that.newOptions.endType == "contextmenu") {
        if (!that.newOptions.moveEvent) {
          click(evt);
        }
      }
      // 返回实体
      if (drawFeature && positions.length > 2) {
        let coordinatesNew = JSON.parse(JSON.stringify(positions));
        // 面是否正常判断
        let poly = turf.polygon([[...coordinatesNew, coordinatesNew[0]]]);
        let kinks = turf.kinks(poly);
        if (kinks.features.length > 0) {
          message("请正确绘制多边形！", { type: "warning" });
        } else {
          // 存储
          drawFeature.set("properties", {
            type: "polygon",
            coordinates: positions,
            ...that.getShapeStyle()
          });
          // 添加并触发绘制结束监听
          that.addAndRaiseFinished(drawFeature);
        }
      }
      that.layer_draw.getSource().clear();
      drawFeature = null;
      positions = [];
    };
    this.setMapEvents();
  }
  /**矩形 */
  drawRectangle(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const endTipText = "点击结束";
    const featuresOptions = that.getFeatureOptions();
    const point = featuresOptions.point;
    const polygon = featuresOptions.polygon;
    let positions = {
      start: null,
      end: null
    };
    let drawFeature;
    let coordinates = [];
    let isMove = true;
    const setDrawFeature = () => {
      if (!positions.start || !positions.end) {
        return;
      }
      coordinates = [
        [positions.start[0], positions.start[1]],
        [positions.start[0], positions.end[1]],
        [positions.end[0], positions.end[1]],
        [positions.end[0], positions.start[1]]
      ];
      if (!drawFeature) {
        drawFeature = new ol.Feature({
          geometry: new ol.geom.Polygon([[...coordinates, coordinates[0]]])
        });
        drawFeature.setStyle(new ol.style.Style(polygon));
        that.layer_draw.getSource().addFeature(drawFeature);
      } else {
        drawFeature
          .getGeometry()
          .setCoordinates([[...coordinates, coordinates[0]]]);
      }
    };
    const setDrawFeatureEnd = () => {
      // 存储
      drawFeature.set("properties", {
        type: "rectangle",
        coordinates,
        points: positions,
        ...that.getShapeStyle()
      });
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(drawFeature);
      that.layer_draw.getSource().clear();
      positions = {
        start: null,
        end: null
      };
      drawFeature = null;
      coordinates = [];
    };
    const setTip = coordinate => {
      // 添加tip
      const tipText = positions.start ? endTipText : "点击绘制";
      that.addDrawTip(coordinate, tipText);
      // 移动坐标添加
      that.addMoveLabel(coordinate);
    };
    const click = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      const noCanAddPoint = that.events.pointermove
        ? isMove == false
        : coordinate[0] == positions.start?.[0] &&
          coordinate[1] == positions.start?.[1];
      if (!coordinate || noCanAddPoint) return;
      // 点
      that.addDrawPoint(coordinate, point);
      // pointermove事件判断
      if (that.events.pointermove) {
        // position
        if (!positions.start && !positions.end) {
          positions.start = coordinate;
          positions.end = coordinate;
        } else {
          setDrawFeatureEnd();
        }
        isMove = false;
      } else {
        if (!positions.start) {
          positions.start = coordinate;
          setTip(coordinate);
        } else if (!positions.end) {
          positions.end = coordinate;
          setDrawFeature();
          setDrawFeatureEnd();
        }
      }
    };
    this.events = {
      click
    };
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新绘制图形
      that.addPointerMove(
        coordinate => {
          setTip(coordinate);
          if (!positions.start) return;
          positions.end = coordinate;
          setDrawFeature();
        },
        () => {
          isMove = true;
        }
      );
    }
    this.setMapEvents();
  }
  /**圆形 */
  drawCircle(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const endTipText = "点击结束";
    const featuresOptions = that.getFeatureOptions();
    const point = featuresOptions.point;
    const polygon = featuresOptions.polygon;
    let coordinates = [];
    let radius = 0,
      positions = {
        start: null,
        end: null
      },
      drawFeature;
    let isMove = true;
    const setDrawFeature = () => {
      if (!positions.start || !positions.end) {
        return;
      }
      radius = Cesium.Cartesian3.distance(
        Cesium.Cartesian3.fromDegrees(positions.start[0], positions.start[1]),
        Cesium.Cartesian3.fromDegrees(positions.end[0], positions.end[1])
      );
      coordinates = shapeCoordinates.getCirclePositions(
        positions.start,
        radius,
        "degrees"
      );
      if (!drawFeature) {
        drawFeature = new ol.Feature({
          geometry: new ol.geom.Polygon([coordinates])
        });
        drawFeature.setStyle(new ol.style.Style(polygon));
        that.layer_draw.getSource().addFeature(drawFeature);
      } else {
        drawFeature.getGeometry().setCoordinates([coordinates]);
      }
    };
    const setDrawFeatureEnd = () => {
      // 存储
      drawFeature.set("properties", {
        type: "circle",
        coordinates,
        center: positions.start,
        points: positions,
        radius,
        ...that.getShapeStyle()
      });
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(drawFeature);
      that.layer_draw.getSource().clear();
      drawFeature = null;
      positions = {
        start: null,
        end: null
      };
      coordinates = [];
    };
    const setTip = coordinate => {
      // 添加tip
      const tipText = positions.start ? endTipText : "点击绘制";
      that.addDrawTip(coordinate, tipText);
      // 移动坐标添加
      that.addMoveLabel(coordinate);
    };
    const click = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      const noCanAddPoint = that.events.pointermove
        ? isMove == false
        : coordinate[0] == positions.start?.[0] &&
          coordinate[1] == positions.start?.[1];
      if (!coordinate || noCanAddPoint) return;
      // 点
      that.addDrawPoint(coordinate, point);
      // pointermove事件判断
      if (that.events.pointermove) {
        // positions
        if (!positions.start && !positions.end) {
          positions.start = coordinate;
          positions.end = coordinate;
        } else {
          setDrawFeatureEnd();
          radius = 0;
        }
        isMove = false;
      } else {
        if (!positions.start) {
          positions.start = coordinate;
          setTip(coordinate);
        } else if (!positions.end) {
          positions.end = coordinate;
          setDrawFeature();
          setDrawFeatureEnd();
        }
      }
    };
    this.events = {
      click
    };
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新绘制图形
      that.addPointerMove(
        coordinate => {
          setTip(coordinate);
          if (!positions.start) return;
          positions.end = coordinate;
          setDrawFeature();
        },
        () => {
          isMove = true;
        }
      );
    }
    this.setMapEvents();
  }
  /**扇形 */
  drawSector(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const endTipText = "点击结束";
    const featuresOptions = that.getFeatureOptions();
    const point = featuresOptions.point;
    const polyline = featuresOptions.polyline;
    const polygon = featuresOptions.polygon;
    let coordinates = [];
    let line;
    let positions = {
        first: null,
        second: null,
        end: null
      },
      hasSecond = false,
      radius = 0,
      startAngle = 0,
      endAngle = 0,
      drawFeature;
    let isMove = true;
    const setDrawFeature = () => {
      if (!positions.first || !positions.second) {
        return;
      }
      if (!positions.end) {
        if (!line) {
          line = new ol.Feature({
            geometry: new ol.geom.LineString([
              positions.first,
              positions.second
            ])
          });
          line.setStyle(new ol.style.Style(polyline));
          that.layer_draw.getSource().addFeature(line);
        } else {
          line
            .getGeometry()
            .setCoordinates([positions.first, positions.second]);
        }
      } else {
        const sectorData = shapeCoordinates.getSectorPositions(
          Cesium.Cartesian3.fromDegrees(positions.first[0], positions.first[1]),
          Cesium.Cartesian3.fromDegrees(
            positions.second[0],
            positions.second[1]
          ),
          Cesium.Cartesian3.fromDegrees(positions.end[0], positions.end[1])
        );
        coordinates = sectorData.positions;
        radius = sectorData.radius;
        startAngle = sectorData.startAngle;
        endAngle = sectorData.endAngle;
        if (!drawFeature) {
          if (line) that.layer_draw.getSource().removeFeature(line);
          drawFeature = new ol.Feature({
            geometry: new ol.geom.Polygon([coordinates])
          });
          drawFeature.setStyle(new ol.style.Style(polygon));
          that.layer_draw.getSource().addFeature(drawFeature);
        } else {
          drawFeature.getGeometry().setCoordinates([coordinates]);
        }
      }
    };
    const setDrawFeatureEnd = () => {
      // 存储
      drawFeature.set("properties", {
        type: "sector",
        coordinates,
        points: positions,
        startAngle,
        endAngle,
        radius,
        ...that.getShapeStyle()
      });
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(drawFeature);
      that.layer_draw.getSource().clear();
      drawFeature = null;
      positions = {
        first: null,
        second: null,
        end: null
      };
      coordinates = [];
      startAngle = 0;
      endAngle = 0;
      radius = 0;
      hasSecond = false;
    };
    const setTip = coordinate => {
      // 添加tip
      const tipText = positions.first && hasSecond ? endTipText : "点击绘制";
      that.addDrawTip(coordinate, tipText);
      // 移动坐标添加
      that.addMoveLabel(coordinate);
    };
    const click = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      if (!coordinate || (that.events.pointermove && isMove == false)) return;
      // 点
      that.addDrawPoint(coordinate, point);
      // pointermove事件判断
      if (that.events.pointermove) {
        // positions
        if (!positions.first) {
          positions.first = coordinate;
          positions.second = coordinate;
        } else {
          if (!hasSecond) {
            hasSecond = true;
          } else {
            setDrawFeatureEnd();
          }
        }
        isMove = false;
      } else {
        if (!positions.first) {
          positions.first = coordinate;
          setTip(coordinate);
        } else {
          if (!hasSecond) {
            positions.second = coordinate;
            hasSecond = true;
            setTip(coordinate);
            setDrawFeature();
          } else {
            positions.end = coordinate;
            setDrawFeature();
            setDrawFeatureEnd();
          }
        }
      }
    };
    this.events = {
      click
    };
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新绘制图形
      that.addPointerMove(
        coordinate => {
          setTip(coordinate);
          if (!positions.first) return;
          if (!hasSecond) {
            positions.second = coordinate;
          } else {
            positions.end = coordinate;
          }
          setDrawFeature();
        },
        () => {
          isMove = true;
        }
      );
    }
    this.setMapEvents();
  }
  /**长圆 */
  drawRectangleCircle(options) {
    const that = this;
    // 初始化绘制参数与状态
    that.initDraw(options);
    const endTipText = "点击结束";
    const featuresOptions = that.getFeatureOptions();
    const point = featuresOptions.point;
    const polyline = featuresOptions.polyline;
    const polygon = featuresOptions.polygon;
    let coordinates = [];
    let line;
    let positions = {
        first: null,
        second: null,
        end: null
      },
      radius = 0,
      hasSecond = false,
      drawFeature;
    let isMove = true;
    const setDrawFeature = () => {
      if (!positions.first || !positions.second) {
        return;
      }
      if (!positions.end) {
        if (!line) {
          line = new ol.Feature({
            geometry: new ol.geom.LineString([
              positions.first,
              positions.second
            ])
          });
          line.setStyle(new ol.style.Style(polyline));
          that.layer_draw.getSource().addFeature(line);
        } else {
          line
            .getGeometry()
            .setCoordinates([positions.first, positions.second]);
        }
      } else {
        const ovalData = shapeCoordinates.getRectangleCirclePositions(
          positions.first,
          positions.second,
          positions.end
        );
        coordinates = ovalData.positions;
        radius = ovalData.radius;
        if (!drawFeature) {
          if (line) that.layer_draw.getSource().removeFeature(line);
          drawFeature = new ol.Feature({
            geometry: new ol.geom.Polygon([coordinates])
          });
          drawFeature.setStyle(new ol.style.Style(polygon));
          that.layer_draw.getSource().addFeature(drawFeature);
        } else {
          drawFeature.getGeometry().setCoordinates([coordinates]);
        }
      }
    };
    const setDrawFeatureEnd = () => {
      // 存储
      drawFeature.set("properties", {
        type: "rectangleCircle",
        coordinates,
        points: positions,
        radius,
        ...that.getShapeStyle()
      });
      // 添加并触发绘制结束监听
      that.addAndRaiseFinished(drawFeature);
      that.layer_draw.getSource().clear();
      drawFeature = null;
      positions = {
        first: null,
        second: null,
        end: null
      };
      coordinates = [];
      radius = 0;
      hasSecond = false;
    };
    const setTip = coordinate => {
      // 添加tip
      const tipText = positions.first && hasSecond ? endTipText : "点击绘制";
      that.addDrawTip(coordinate, tipText);
      // 移动坐标添加
      that.addMoveLabel(coordinate);
    };
    const click = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      if (!coordinate || (that.events.pointermove && isMove == false)) return;
      // 点
      that.addDrawPoint(coordinate, point);
      // pointermove事件判断
      if (that.events.pointermove) {
        // positions
        if (!positions.first) {
          positions.first = coordinate;
          positions.second = coordinate;
        } else {
          if (!hasSecond) {
            hasSecond = true;
          } else {
            setDrawFeatureEnd();
          }
        }
        isMove = false;
      } else {
        if (!positions.first) {
          positions.first = coordinate;
          setTip(coordinate);
        } else {
          if (!hasSecond) {
            positions.second = coordinate;
            hasSecond = true;
            setTip(coordinate);
            setDrawFeature();
          } else {
            positions.end = coordinate;
            setDrawFeature();
            setDrawFeatureEnd();
          }
        }
      }
    };
    this.events = {
      click
    };
    if (that.newOptions.moveEvent) {
      // 注册鼠标移动监听，实时更新绘制图形
      that.addPointerMove(
        coordinate => {
          setTip(coordinate);
          if (!positions.first) return;
          if (!hasSecond) {
            positions.second = coordinate;
          } else {
            positions.end = coordinate;
          }
          setDrawFeature();
        },
        () => {
          isMove = true;
        }
      );
    }
    this.setMapEvents();
  }
  /**开启删除*/
  remove(feature) {
    this.layer.getSource().removeFeature(feature);
  }
  /**获取label通用样式 */
  getLabelOption() {
    return {
      font: "bold 16px sans-serif",
      scale: 1,
      fill: new ol.style.Fill({ color: "#ffffff" }),
      stroke: new ol.style.Stroke({ color: "#000000", width: 2 })
    };
  }
  /**停止绘制 */
  stop() {
    // olMap 已清理时（如退出登录）不再访问 viewport / 事件
    if (this.olMap) {
      try {
        this.olMap.getViewport().style.cursor = "default";
      } catch (e) {
        /* ignore */
      }
    }
    if (this.layer_draw) {
      // 清空绘制过程中产生的图形
      this.layer_draw.getSource().clear();
      this.tipFeature = null;
      this.moveLabel = null;
    }
    if (this.olMap) {
      for (const [type, event] of Object.entries(this.events)) {
        this.olMap.removeEventListener(type, event);
      }
    }
    this.events = {};
  }
  /**清空绘制 */
  clear() {
    this.stop();
    if (this.layer) {
      // 清空存储图形
      this.layer.getSource().clear();
    }
  }
  /**添加提示 */
  addDrawTip(coordinate, text) {
    if (!coordinate) return;
    if (!this.tipFeature) {
      const label = Object.assign(this.getLabelOption(), {
        text,
        offsetY: 20
      });
      this.tipFeature = new ol.Feature({
        geometry: new ol.geom.Point(coordinate)
      });
      this.tipFeature.setStyle(
        new ol.style.Style({
          text: new ol.style.Text(label)
        })
      );
      this.layer_draw.getSource().addFeature(this.tipFeature);
      return;
    }
    this.tipFeature.getStyle().getText().setText(text);
    this.tipFeature.getGeometry().setCoordinates(coordinate);
  }
  /**移除提示 */
  removeDrawTip() {
    if (!this.tipFeature) return;
    this.layer_draw.getSource().removeFeature(this.tipFeature);
    this.tipFeature = null;
  }
  /**绘制过程中添加位置 */
  addMoveLabel(coordinate) {
    if (!coordinate || !this.moveCoordinate) return;
    const text = this.getMoveCoordinateText(coordinate[0], coordinate[1]);
    if (!this.moveLabel) {
      const label = Object.assign(this.getLabelOption(), {
        text,
        offsetY: -20
      });
      this.moveLabel = new ol.Feature({
        geometry: new ol.geom.Point(coordinate)
      });
      this.moveLabel.setStyle(
        new ol.style.Style({
          text: new ol.style.Text(label)
        })
      );
      this.layer_draw.getSource().addFeature(this.moveLabel);
      return;
    }
    this.moveLabel.getStyle().getText().setText(text);
    this.moveLabel.getGeometry().setCoordinates(coordinate);
  }
  /**移除绘制过程中位置 */
  removeMoveLabel() {
    if (!this.moveLabel) return;
    this.layer_draw.getSource().remove(this.moveLabel);
    this.moveLabel = null;
  }
  /**注销对象 */
  destroy() {
    this.stop();
    this.clear();
    if (!this.olMap) return;
    this.olMap.removeLayer(this.layer);
    this.olMap.removeLayer(this.layer_draw);
    // this.drawFinished._listeners.forEach(listener => {
    //   this.drawFinished.removeEventListener(listener);
    // });
    if (this.mapDomMouseout) {
      this.olMap.removeEventListener("mouseout", this.mapDomMouseout);
      this.mapDomMouseout = null;
    }
    this.drawFinished = null;
    this.layer = null;
    this.layer_draw = null;
    this.olMap = null;
    this.options = null;
  }
}
export { DrawHandler };
