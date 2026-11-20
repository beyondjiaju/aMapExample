import * as ol from "@/3dMap/sdk/ol";
import { getColorAlpha } from "./CorlorTool";
import * as turf from "@turf/turf";
import { coordinateConversionTool } from "@/3dMap/sdk/cesiumUtils";
import { cloneDeep } from "lodash";
const getEndTipText = mode_endType => {
  if (mode_endType == "dblclick") {
    return "双击结束";
  }
  return "右键结束";
};
/**测量对象 */
class MeasureHandler {
  constructor(olMap, options = {}) {
    this.olMap = olMap;
    this.events = {};
    // 添加过程中
    this.layer_measure = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.olMap.addLayer(this.layer_measure);
    // 添加集合
    this.layer = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.olMap.addLayer(this.layer);
    const defaultOptions = {
      color: "#ffff00",
      alpha: 0.5,
      endType: "contextmenu",
      moveEvent: true, // 移动事件
      coordinateFormat: "lonlat" // 坐标展示格式，默认经纬度
    };
    const newOptions = Object.assign(defaultOptions, options);
    this.endType = newOptions.endType;
    this.moveEvent = newOptions.moveEvent;
    // 坐标格式可在对象上直接修改，后续测量按当前值生成文本
    this.coordinateFormat = newOptions.coordinateFormat;
    this.setColor(newOptions.color, newOptions.alpha);
  }
  /**更新绘制颜色。每次新建样式对象，已绘制的测量仍持有旧颜色 */
  setColor(color, alpha) {
    this.color = color ?? this.color ?? "#ffff00";
    this.alpha = alpha ?? this.alpha ?? 0.5;
    const colorWithAlpha = getColorAlpha(this.color, this.alpha);
    this.feature_options = {
      point: {
        radius: 4, // 半径
        fill: new ol.style.Fill({ color: colorWithAlpha }),
        stroke: new ol.style.Stroke({ color: this.color, width: 2 })
      },
      label: {
        font: "bold 16px sans-serif",
        fill: new ol.style.Fill({ color: this.color }),
        stroke: new ol.style.Stroke({ color: "#000000", width: 2 }),
        scale: 1
      },
      polyline: {
        stroke: new ol.style.Stroke({ color: this.color, width: 2 })
      },
      polygon: {
        fill: new ol.style.Fill({ color: colorWithAlpha }), // 半透明填充
        stroke: new ol.style.Stroke({ color: this.color, width: 2 })
      }
    };
  }
  /**复制当前点样式，只给新测量使用 */
  copyPointOption() {
    return Object.assign({}, this.feature_options.point);
  }
  /**开启绘制
   * @param {String} type
   */
  start(type) {
    this.layer_measure.getSource().clear();
    /**位置测量 */
    if (type == "coordinate") {
      this.coordinate();
    } else if (type == "distance") {
      this.distance();
    } else if (type == "area") {
      this.area();
    }
  }
  /**位置测量 */
  coordinate() {
    const that = this;
    that.stop();
    // 设置样式为crosshair
    this.olMap.getViewport().style.cursor = "crosshair";
    this.events = {
      click: function (evt) {
        let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
        const lon = coordinate[0].toFixed(5);
        const lat = coordinate[1].toFixed(5);
        // 按当前坐标格式生成标注，lonlat 为经纬度，dms 为度分秒
        let text = `X: ${lon}\nY: ${lat}`;
        if (that.coordinateFormat === "dms") {
          const degrees_new = coordinateConversionTool.degreesToDegrees60(
            lon,
            lat,
            true
          );
          text = `${degrees_new.showLatString}\n${degrees_new.showLongString}\n`;
        }
        // 每次点击按当前颜色新建样式，不改已有测量
        const point = that.copyPointOption();
        const label = Object.assign({ offsetY: -20 }, that.feature_options.label);
        label.text = text;
        const feature = new ol.Feature({
          geometry: new ol.geom.Point(coordinate)
        });
        feature.setStyle(
          new ol.style.Style({
            image: new ol.style.Circle(point),
            text: new ol.style.Text(label)
          })
        );
        that.layer.getSource().addFeature(feature);
      }
    };
    this.setMapEvents();
  }
  /**水平距离 */
  distance() {
    const that = this;
    that.stop();
    const endTipText = getEndTipText(that.endType);
    // 设置样式为crosshair
    this.olMap.getViewport().style.cursor = "crosshair";
    let point = Object.assign({}, this.feature_options.point);
    let label = Object.assign({}, this.feature_options.label);
    let polyline = Object.assign({}, this.feature_options.polyline);
    let addLabel = cloneDeep(this.feature_options.label);
    let positions = [],
      center,
      hisDistance,
      distance = 0,
      distanceAdd = 0,
      measureLabel = null,
      measureGraphics,
      tipFeature;
    let isMove = true;
    let tipLabel = cloneDeep(this.feature_options.label);
    tipLabel.fill.setColor("#ffffff");
    tipLabel.offsetY = 20;
    let allLabelData = [];
    const setShowFeature = () => {
      if (positions.length > 1) {
        const linePositions = [
          positions[positions.length - 1],
          positions[positions.length - 2]
        ];
        center = turf.center(turf.points(linePositions)).geometry.coordinates;
        distance = turf.distance(
          turf.point(linePositions[0]),
          turf.point(linePositions[1]),
          { units: "kilometers" }
        );
        const text = `${distance.toFixed(2)}km`;
        if (!measureLabel) {
          label = Object.assign({}, that.feature_options.label);
          label.text = text;
          measureLabel = new ol.Feature({
            geometry: new ol.geom.Point(center)
          });
          measureLabel.setStyle(
            new ol.style.Style({
              text: new ol.style.Text(label)
            })
          );
          that.layer_measure.getSource().addFeature(measureLabel);
        } else {
          measureLabel.getGeometry().setCoordinates(center);
          measureLabel.getStyle().getText().setText(text);
        }
        // labels
        hisDistance = distance;
        distanceAdd += distance;
        if (allLabelData.length == positions.length - 2) {
          allLabelData.push({
            position: center,
            text: `${distance.toFixed(2)}km`
          });
        } else {
          allLabelData[allLabelData.length - 1] = {
            position: center,
            text: `${distance.toFixed(2)}km`
          };
        }
      }
      // 总长度
      if (measureGraphics && measureGraphics.line) {
        measureGraphics.line.getGeometry().setCoordinates(positions);
      }
      if (measureGraphics && measureGraphics.addLabel) {
        measureGraphics.addLabel
          .getGeometry()
          .setCoordinates(positions[positions.length - 1]);
        measureGraphics.addLabel
          .getStyle()
          .getText()
          .setText(`${distanceAdd.toFixed(2)}km`);
      }
    };
    const setTip = coordinate => {
      const tipText = positions.length >= 1 ? endTipText : "点击测量";
      if (!tipFeature) {
        tipFeature = new ol.Feature({
          geometry: new ol.geom.Point(coordinate)
        });
        tipLabel.text = tipText;
        tipFeature.setStyle(
          new ol.style.Style({
            text: new ol.style.Text(tipLabel)
          })
        );
        that.layer_measure.getSource().addFeature(tipFeature);
      } else {
        tipFeature.getStyle().getText().setText(tipText);
        tipFeature.getGeometry().setCoordinates(coordinate);
      }
    };
    const click = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      const noCanAddPoint = that.events.pointermove
        ? isMove == false
        : coordinate[0] == positions[positions.length - 1]?.[0] &&
          coordinate[1] == positions[positions.length - 1]?.[1];
      if (!coordinate || noCanAddPoint) return;
      // 点
      const currentPoint = new ol.Feature({
        geometry: new ol.geom.Point(coordinate)
      });
      currentPoint.setStyle(
        new ol.style.Style({
          image: new ol.style.Circle(that.copyPointOption())
        })
      );
      that.layer_measure.getSource().addFeature(currentPoint);
      // 坐标处理
      positions.push(coordinate);
      if (that.events.pointermove) {
        if (positions.length < 2) {
          positions.push(coordinate);
        }
        isMove = false;
      } else {
        setTip(coordinate);
        if (positions.length < 2) return;
        setShowFeature();
      }
      // 总长度
      distanceAdd += distance;
      if (hisDistance) {
        distanceAdd -= hisDistance;
        hisDistance = null;
      }
      if (measureLabel) {
        const labelFeature = new ol.Feature({
          geometry: new ol.geom.Point(center)
        });
        labelFeature.setStyle(
          new ol.style.Style({
            text: new ol.style.Text(label)
          })
        );
        that.layer_measure.getSource().addFeature(labelFeature);
      }
      // 线
      if (!measureGraphics) {
        // 线在首次创建时取当前颜色，之后不再改这条线
        polyline = Object.assign({}, that.feature_options.polyline);
        addLabel = cloneDeep(that.feature_options.label);
        addLabel.fill.setColor(that.color);
        addLabel.text = `${distanceAdd.toFixed(2)}km`;
        addLabel.offsetY = -20;
        measureGraphics = {
          line: new ol.Feature({
            geometry: new ol.geom.LineString(positions)
          }),
          addLabel: new ol.Feature({
            geometry: new ol.geom.Point(positions[positions.length - 1])
          })
        };
        measureGraphics.line.setStyle(new ol.style.Style(polyline));
        measureGraphics.addLabel.setStyle(
          new ol.style.Style({
            text: new ol.style.Text(addLabel)
          })
        );
        that.layer_measure.getSource().addFeature(measureGraphics.line);
        that.layer_measure.getSource().addFeature(measureGraphics.addLabel);
      }
    };
    this.events = {
      click
    };
    if (this.moveEvent) {
      this.events.pointermove = function (evt) {
        isMove = true;
        let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
        if (!coordinate) {
          if (tipFeature) {
            tipFeature.getStyle().getText().setText("");
          }
          return;
        }
        setTip(coordinate);
        if (positions.length < 2) return;
        positions[positions.length - 1] = coordinate;
        if (hisDistance) {
          distanceAdd -= hisDistance;
        }
        setShowFeature();
      };
    }
    this.events[that.endType] = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      if (!coordinate) return;
      // 移除最后点
      if (that.endType == "dblclick") {
        if (that.moveEvent) {
          positions.pop();
        }
      }
      // 追加点
      if (that.endType == "contextmenu" && positions.length > 0) {
        if (!that.moveEvent) {
          click(evt);
        }
      }
      if (positions.length < 2) {
        that.layer_measure.getSource().clear();
        that.stop();
        that.distance();
        return;
      }
      positions.forEach(p => {
        // 点
        const rightEndPoint = new ol.Feature({
          geometry: new ol.geom.Point(p)
        });
        rightEndPoint.setStyle(
          new ol.style.Style({
            image: new ol.style.Circle(that.copyPointOption())
          })
        );
        that.layer.getSource().addFeature(rightEndPoint);
      });
      allLabelData.forEach(val => {
        const { text, ...other } = label;
        const rightEndLabel = new ol.Feature({
          geometry: new ol.geom.Point(val.position)
        });
        rightEndLabel.setStyle(
          new ol.style.Style({
            text: new ol.style.Text({
              ...other,
              text: val.text
            })
          })
        );
        that.layer.getSource().addFeature(rightEndLabel);
      });
      that.layer.getSource().addFeature(measureGraphics.line);
      that.layer.getSource().addFeature(measureGraphics.addLabel);
      that.layer_measure.getSource().clear();
      that.stop();
      that.distance();
    };
    this.setMapEvents();
  }
  /**水平面积 */
  area() {
    const that = this;
    that.stop();
    const endTipText = getEndTipText(that.endType);
    // 设置样式为crosshair
    this.olMap.getViewport().style.cursor = "crosshair";
    let point = Object.assign({}, this.feature_options.point);
    let polyline = Object.assign({}, this.feature_options.polyline);
    let polygon = Object.assign({}, this.feature_options.polygon);
    let label = Object.assign({}, this.feature_options.label);
    let positions = [],
      line = null,
      moveArea = 0,
      hisMoveArea = 0,
      allArea = 0,
      measureGraphics,
      tipFeature;
    let isMove = true;
    let tipLabel = cloneDeep(this.feature_options.label);
    tipLabel.fill.setColor("#ffffff");
    tipLabel.offsetY = 20;
    const setShowFeature = () => {
      if (positions.length == 2) {
        if (!line) {
          // 线在首次创建时取当前颜色，之后不再改这条线
          polyline = Object.assign({}, that.feature_options.polyline);
          line = new ol.Feature({
            geometry: new ol.geom.LineString(positions)
          });
          line.setStyle(new ol.style.Style(polyline));
          that.layer_measure.getSource().addFeature(line);
        } else {
          line.getGeometry().setCoordinates(positions);
        }
      }
      if (positions.length >= 3) {
        const ps = [
          positions[0],
          positions[positions.length - 2],
          positions[positions.length - 1],
          positions[0]
        ];
        const t_polygon = turf.polygon([ps]);
        moveArea = turf.area(t_polygon) * 0.000001;
        if (hisMoveArea) allArea -= hisMoveArea;
        allArea += moveArea;
        if (that.events.pointermove) {
          hisMoveArea = moveArea;
        }
        // polygon
        if (!measureGraphics) {
          that.layer_measure.getSource().removeFeature(line);
          line = null;
          polygon = Object.assign({}, that.feature_options.polygon);
          label = Object.assign({}, that.feature_options.label);
          label.text = `${allArea.toFixed(2)}km²`;
          polygon.text = new ol.style.Text(label);
          measureGraphics = new ol.Feature({
            geometry: new ol.geom.Polygon([[...positions, positions[0]]])
          });
          measureGraphics.setStyle(new ol.style.Style(polygon));
          that.layer_measure.getSource().addFeature(measureGraphics);
        } else {
          measureGraphics
            .getGeometry()
            .setCoordinates([[...positions, positions[0]]]);
          measureGraphics
            .getStyle()
            .getText()
            .setText(`${allArea.toFixed(2)}km²`);
        }
      }
    };
    const setTip = coordinate => {
      const tipEnd = that.events.pointermove
        ? positions.length > 2
        : positions.length >= 2;
      const tipText = tipEnd ? endTipText : "点击测量";
      if (!tipFeature) {
        tipFeature = new ol.Feature({
          geometry: new ol.geom.Point(coordinate)
        });
        tipLabel.text = tipText;
        tipFeature.setStyle(
          new ol.style.Style({
            text: new ol.style.Text(tipLabel)
          })
        );
        that.layer_measure.getSource().addFeature(tipFeature);
      } else {
        tipFeature.getStyle().getText().setText(tipText);
        tipFeature.getGeometry().setCoordinates(coordinate);
      }
    };
    const click = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      const noCanAddPoint = that.events.pointermove
        ? isMove == false
        : coordinate[0] == positions[positions.length - 1]?.[0] &&
          coordinate[1] == positions[positions.length - 1]?.[1];
      if (!coordinate || noCanAddPoint) return;
      // 点
      const currentPoint = new ol.Feature({
        geometry: new ol.geom.Point(coordinate)
      });
      currentPoint.setStyle(
        new ol.style.Style({
          image: new ol.style.Circle(that.copyPointOption())
        })
      );
      that.layer_measure.getSource().addFeature(currentPoint);
      // 坐标处理
      positions.push(coordinate);
      if (that.events.pointermove) {
        if (positions.length < 2) {
          positions.push(coordinate);
        }
        if (positions.length > 2) {
          hisMoveArea = 0;
        }
        isMove = false;
      } else {
        setTip(coordinate);
        setShowFeature();
      }
    };
    this.events = {
      click
    };
    if (this.moveEvent) {
      this.events.pointermove = function (evt) {
        isMove = true;
        let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
        if (!coordinate) {
          if (tipFeature) {
            tipFeature.getStyle().getText().setText("");
          }
          return;
        }
        setTip(coordinate);
        positions[positions.length - 1] = coordinate;
        setShowFeature();
      };
    }
    this.events[that.endType] = function (evt) {
      let coordinate = that.olMap.getCoordinateFromPixel(evt.pixel);
      if (!coordinate) return;
      // 移除最后点
      if (that.endType == "dblclick") {
        if (that.moveEvent) {
          positions.pop();
        }
      }
      // 追加点
      if (that.endType == "contextmenu") {
        if (!that.moveEvent) {
          click(evt);
        }
      }
      if (positions.length < 3) return;
      positions.forEach(p => {
        // 点
        const rightEndPoint = new ol.Feature({
          geometry: new ol.geom.Point(p)
        });
        rightEndPoint.setStyle(
          new ol.style.Style({
            image: new ol.style.Circle(that.copyPointOption())
          })
        );
        that.layer.getSource().addFeature(rightEndPoint);
      });
      that.layer.getSource().addFeature(measureGraphics);
      that.layer_measure.getSource().clear();
      that.stop();
      that.area();
    };
    this.setMapEvents();
  }
  /**设置监听 */
  setMapEvents() {
    for (const [type, event] of Object.entries(this.events)) {
      this.olMap.addEventListener(type, event);
    }
  }
  /**停止测量 */
  stop() {
    // 恢复鼠标样式
    this.olMap.getViewport().style.cursor = "default";
    for (const [type, event] of Object.entries(this.events)) {
      this.olMap.removeEventListener(type, event);
    }
    this.events = {};
  }
  /**清除测量 */
  clear() {
    // 清空绘制存储
    this.layer.getSource().clear();
    this.layer_measure.getSource().clear();
  }
  /**注销测量对象 */
  destroy() {
    this.stop();
    this.clear();
    this.olMap.removeLayer(this.layer);
    this.layer = null;
    this.olMap.removeLayer(this.layer_measure);
    this.layer_measure = null;
    this.olMap = null;
    this.ellipsoid = null;
    this.canvas = null;
    this.events = null;
  }
}
export { MeasureHandler };
