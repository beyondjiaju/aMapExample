import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
import {
  PolylineAntialiasingMaterialProperty,
  coordinateConversionTool,
  HtmlTag,
  HtmlTagCollection
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
/**测量对象 */
class MeasureHandler {
  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this.scene = this.viewer.scene;
    this.ellipsoid = this.scene.globe.ellipsoid;
    this.canvas = this.scene.canvas;
    this.handler = new Cesium.ScreenSpaceEventHandler(this.canvas);
    // 添加过程中
    this.dataSource_measure = new Cesium.CustomDataSource(
      "drawDataSource_measure"
    );
    this.viewer.dataSources.add(this.dataSource_measure);
    // 添加集合
    this.dataSource = new Cesium.CustomDataSource("measureDataSource");
    this.viewer.dataSources.add(this.dataSource);
    const defaultOptions = {
      color: "#ffff00",
      alpha: 0.5,
      endType: "contextmenu",
      moveEvent: true, // 移动事件
      coordinateFormat: "lonlat" // 坐标展示格式，默认经纬度
    };
    const newOptions = Object.assign(defaultOptions, options);
    this.endType = getEndType(newOptions.endType);
    this.moveEvent = newOptions.moveEvent;
    // 坐标格式可在对象上直接修改，后续测量按当前值生成文本
    this.coordinateFormat = newOptions.coordinateFormat;
    this.setColor(newOptions.color, newOptions.alpha);
  }
  /**更新绘制颜色。每次新建样式对象，已绘制的测量仍持有旧颜色 */
  setColor(color, alpha) {
    this.color = color ?? this.color ?? "#ffff00";
    this.alpha = alpha ?? this.alpha ?? 0.5;
    const solid = Cesium.Color.fromCssColorString(this.color);
    this.entity_options = {
      point: {
        pixelSize: 6,
        color: solid.withAlpha(this.alpha),
        outlineWidth: 2,
        outlineColor: Cesium.Color.fromCssColorString(this.color)
      },
      label: {
        font: "bold 20px sans-serif",
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        fillColor: Cesium.Color.fromCssColorString(this.color),
        pixelOffset: new Cesium.Cartesian2(0, -10),
        scaleByDistance: new Cesium.NearFarScalar(0, 1, 9999999, 0),
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        outlineWidth: 2
      },
      polyline: {
        material: new PolylineAntialiasingMaterialProperty({
          color: Cesium.Color.fromCssColorString(this.color)
        }),
        width: 4,
        zIndex: 99999999
      },
      polygon: {
        material: Cesium.Color.fromCssColorString(this.color).withAlpha(this.alpha)
      }
    };
  }
  /**复制当前点样式，只给新测量使用 */
  copyPointOption() {
    return Object.assign({}, this.entity_options.point);
  }
  /**复制当前文字样式，只给新测量使用 */
  copyLabelOption() {
    return Object.assign({}, this.entity_options.label);
  }
  /**开启绘制
   * @param {String} type
   */
  start(type) {
    this.dataSource_measure.entities.removeAll();
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
    that.viewer.scene.canvas.style.cursor = "crosshair";
    that.handler.setInputAction(m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position),
        cartographic = Cesium.Cartographic.fromCartesian(cartesian),
        lon = Cesium.Math.toDegrees(cartographic.longitude).toFixed(5),
        lat = Cesium.Math.toDegrees(cartographic.latitude).toFixed(5),
        height = String(cartographic.height),
        h =
          height.substr(height.indexOf(".") + 1).length > 5
            ? cartographic.height.toFixed(5) + "m"
            : cartographic.height + "m";
      // 按当前坐标格式生成标注，lonlat 为经纬度，dms 为度分秒
      let text = `X: ${lon}\nY: ${lat}\nZ: ${h}`;
      if (this.coordinateFormat === "dms") {
        const degrees_new = coordinateConversionTool.degreesToDegrees60(
          lon,
          lat,
          true
        );
        // Cesium.Label 会过滤 U+202A–U+206F，分秒符号 ′ ″ 在其中会被去掉，只剩 °；换成可显示的 ʹ ʺ
        text = `${degrees_new.showLatString}\n${degrees_new.showLongString}\n`
          .replace(/\u2032/g, "\u02B9")
          .replace(/\u2033/g, "\u02BA");
      }
      // 每次点击按当前颜色新建样式，不改已有测量
      const point = this.copyPointOption();
      const label = this.copyLabelOption();
      label.text = text;
      this.dataSource.entities.add({
        position: cartesian,
        point,
        label
      });
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
  /**水平距离 */
  distance() {
    const that = this;
    that.stop();
    const endTipText = getEndTipText(that.endType);
    // 设置样式为crosshair
    that.viewer.scene.canvas.style.cursor = "crosshair";
    let point = Object.assign({}, this.entity_options.point);
    let label = Object.assign({}, this.entity_options.label);
    let polyline = Object.assign({}, this.entity_options.polyline);
    let addLabel = Object.assign({}, this.entity_options.label);
    let positions = [],
      center,
      hisDistance,
      distance = 0,
      distanceAdd = 0,
      measureLabel = null,
      measureEntity,
      tipEntity;
    let allLabelData = [];
    let isMove = true;
    const setTip = cartesian => {
      const tipText = positions.length >= 1 ? endTipText : "点击测量";
      if (!tipEntity) {
        tipEntity = that.dataSource_measure.entities.add({
          position: cartesian,
          label: Object.assign(this.getLabelOption(), {
            text: tipText
          })
        });
      } else {
        tipEntity.label.text = tipText;
        tipEntity.position = cartesian;
        tipEntity.show = true;
      }
    };
    const setShowEntity = () => {
      if (positions.length > 1) {
        const linePositions = [
          positions[positions.length - 1],
          positions[positions.length - 2]
        ];
        center = Cesium.BoundingSphere.fromPoints(linePositions).center;
        distance = Math.ceil(
          Cesium.Cartesian3.distance(linePositions[0], linePositions[1])
        );
        // labels
        hisDistance = distance;
        distanceAdd += distance;
        if (allLabelData.length == positions.length - 2) {
          allLabelData.push({
            position: center,
            text: `${(distance * 0.001).toFixed(2)}km`
          });
        } else {
          allLabelData[allLabelData.length - 1] = {
            position: center,
            text: `${(distance * 0.001).toFixed(2)}km`
          };
        }
      }
      // 超过两端展示总长
      if (positions.length > 2) {
        measureEntity.label.show = true;
      }
    };
    const click = m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      const noCanAddPoint = that.moveEvent
        ? isMove == false
        : cartesian.equals(positions[positions.length - 1]);
      if (!cartesian || noCanAddPoint) return;
      // 新点使用当前颜色，已有点保持原色
      that.dataSource_measure.entities.add({
        position: cartesian,
        point: that.copyPointOption()
      });
      // 坐标处理
      positions.push(cartesian);
      if (that.moveEvent) {
        if (positions.length < 2) {
          positions.push(cartesian);
        }
        isMove = false;
      } else {
        setTip(cartesian);
        if (positions.length < 2) return;
        setShowEntity();
      }
      // 总长度
      distanceAdd += distance;
      if (hisDistance) {
        distanceAdd -= hisDistance;
        hisDistance = null;
      }
      // 新标注使用当前颜色，已有标注保持原色
      label.fillColor = Cesium.Color.fromCssColorString(that.color);
      label.text = new Cesium.CallbackProperty(() => {
        return `${(distance * 0.001).toFixed(2)}km`;
      }, false);
      if (measureLabel) {
        measureLabel.label.text = `${(distance * 0.001).toFixed(2)}km`;
        measureLabel.position = center;
      }
      measureLabel = that.dataSource_measure.entities.add({
        position: new Cesium.CallbackProperty(() => {
          return center;
        }, false),
        label
      });
      // 线
      if (!measureEntity) {
        // 线在首次创建时取当前颜色，之后不再改这条线
        polyline = Object.assign({}, that.entity_options.polyline);
        addLabel = that.copyLabelOption();
        addLabel.fillColor = Cesium.Color.fromCssColorString(that.color);
        addLabel.show = false;
        addLabel.text = new Cesium.CallbackProperty(() => {
          return `${(distanceAdd * 0.001).toFixed(2)}km`;
        }, false);
        polyline.positions = new Cesium.CallbackProperty(() => {
          return positions;
        }, false);
        measureEntity = that.dataSource_measure.entities.add({
          position: new Cesium.CallbackProperty(() => {
            return positions[positions.length - 1];
          }, false),
          polyline,
          label: addLabel
        });
      }
    };
    that.handler.setInputAction(click, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    if (this.moveEvent) {
      that.handler.setInputAction(move => {
        isMove = true;
        const move_cartesian = that.viewer.camera.pickEllipsoid(
          move.endPosition
        );
        if (!move_cartesian) {
          if (tipEntity) {
            tipEntity.show = false;
          }
          return;
        }
        setTip(move_cartesian);
        if (positions.length < 2) return;
        positions[positions.length - 1] = move_cartesian;
        if (hisDistance) {
          distanceAdd -= hisDistance;
        }
        setShowEntity();
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
    that.handler.setInputAction(m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      if (!cartesian) return;
      // 移除最后点
      if (that.endType == Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK) {
        if (that.moveEvent) {
          positions.pop();
        }
      }
      // 追加点
      if (that.endType == Cesium.ScreenSpaceEventType.RIGHT_CLICK) {
        if (!that.moveEvent && positions.length > 0) {
          click(m);
        }
      }
      if (positions.length < 2) return;
      positions.forEach(p => {
        that.dataSource.entities.add({
          position: p,
          point: that.copyPointOption()
        });
      });
      allLabelData.forEach(val => {
        label.text = val.text;
        that.dataSource.entities.add({
          position: val.position,
          polyline,
          label
        });
      });
      label.fillColor = Cesium.Color.fromCssColorString(this.color);
      label.text = `${(distanceAdd * 0.001).toFixed(2)}km`;
      that.dataSource.entities.add({
        position: positions[positions.length - 1],
        polyline,
        label
      });
      if (tipEntity) that.dataSource_measure.entities.remove(tipEntity);
      that.stop();
      that.distance();
    }, that.endType);
  }
  /**水平面积 */
  area() {
    const that = this;
    that.stop();
    const endTipText = getEndTipText(that.endType);
    // 设置样式为crosshair
    that.viewer.scene.canvas.style.cursor = "crosshair";
    let point = Object.assign({}, this.entity_options.point);
    let polyline = Object.assign({}, this.entity_options.polyline);
    let polygon = Object.assign({}, this.entity_options.polygon);
    let label = Object.assign({}, this.entity_options.label);
    let positions = [],
      line = null,
      moveArea = 0,
      hisMoveArea = 0,
      allArea = 0,
      measureEntity,
      tipEntity;
    let isMove = true;
    const setTip = cartesian => {
      const tipEnd = that.moveEvent
        ? positions.length > 2
        : positions.length >= 2;
      const tipText = tipEnd ? endTipText : "点击测量";
      if (!tipEntity) {
        tipEntity = that.dataSource_measure.entities.add({
          position: cartesian,
          label: Object.assign(this.getLabelOption(), {
            text: tipText
          })
        });
      } else {
        tipEntity.label.text = tipText;
        tipEntity.position = cartesian;
        tipEntity.show = true;
      }
    };
    const setShowEntity = () => {
      if (positions.length == 2) {
        // 线在首次创建时取当前颜色，之后不再改这条线
        if (!line) {
          polyline = Object.assign({}, that.entity_options.polyline);
        }
        polyline.positions = new Cesium.CallbackProperty(() => {
          const newPositions = [positions, positions[0]];
          return newPositions.flat(Infinity);
        }, false);
        line = that.dataSource_measure.entities.add({
          polyline
        });
      }
      if (positions.length > 2 && !measureEntity) {
        polygon = Object.assign({}, that.entity_options.polygon);
        label = that.copyLabelOption();
        label.text = new Cesium.CallbackProperty(() => {
          return `${allArea.toFixed(2)}km²`;
        }, false);
        polygon.hierarchy = new Cesium.CallbackProperty(() => {
          return new Cesium.PolygonHierarchy(positions);
        }, false);
        measureEntity = that.dataSource_measure.entities.add({
          position: new Cesium.CallbackProperty(() => {
            if (positions.length < 3) {
              return positions[positions.length - 1];
            } else {
              return Cesium.BoundingSphere.fromPoints(positions).center;
            }
          }, false),
          polygon,
          label
        });
      }
      if (positions.length >= 3) {
        const ps = [
          positions[0],
          positions[positions.length - 2],
          positions[positions.length - 1],
          positions[0]
        ];
        const ps_carto =
          Cesium.Ellipsoid.WGS84.cartesianArrayToCartographicArray(ps);
        const ps_degrees = [];
        ps_carto.forEach(p => {
          ps_degrees.push([
            Cesium.Math.toDegrees(p.longitude),
            Cesium.Math.toDegrees(p.latitude)
          ]);
        });
        const t_polygon = turf.polygon([ps_degrees]);
        moveArea = turf.area(t_polygon) * 0.000001;
        if (hisMoveArea) allArea -= hisMoveArea;
        allArea += moveArea;
        if (that.moveEvent) {
          hisMoveArea = moveArea;
        }
      }
    };
    const click = m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      const noCanAddPoint = that.moveEvent
        ? isMove == false
        : cartesian.equals(positions[positions.length - 1]);
      if (!cartesian || noCanAddPoint) return;
      // 新点使用当前颜色，已有点保持原色
      that.dataSource_measure.entities.add({
        position: cartesian,
        point: that.copyPointOption()
      });
      // 坐标处理
      positions.push(cartesian);
      if (that.moveEvent) {
        if (positions.length < 2) {
          positions.push(cartesian);
        }
        if (positions.length > 2) {
          hisMoveArea = 0;
        }
        setShowEntity();
        isMove = false;
      } else {
        setTip(cartesian);
        setShowEntity();
      }
    };
    that.handler.setInputAction(click, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    if (this.moveEvent) {
      that.handler.setInputAction(move => {
        isMove = true;
        const move_cartesian = that.viewer.camera.pickEllipsoid(
          move.endPosition
        );
        if (!move_cartesian) {
          if (tipEntity) {
            tipEntity.show = false;
          }
          return;
        }
        setTip(move_cartesian);
        positions[positions.length - 1] = move_cartesian;
        setShowEntity();
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }
    that.handler.setInputAction(m => {
      const cartesian = that.viewer.camera.pickEllipsoid(m.position);
      if (!cartesian) return;
      // 移除最后点
      if (that.endType == Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK) {
        if (that.moveEvent) {
          positions.pop();
        }
      }
      // 追加点
      if (that.endType == Cesium.ScreenSpaceEventType.RIGHT_CLICK) {
        if (!that.moveEvent && positions.length > 1) {
          click(m);
        }
      }
      if (positions.length < 3) return;
      positions.forEach(p => {
        that.dataSource.entities.add({
          position: p,
          point: that.copyPointOption()
        });
      });
      let centerPosition = Cesium.BoundingSphere.fromPoints(positions).center;
      that.dataSource.entities.add({
        position: centerPosition,
        polyline,
        polygon,
        label
      });
      that.dataSource_measure.entities.removeAll();
      that.stop();
      that.area();
    }, that.endType);
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
  /**停止测量 */
  stop() {
    // 恢复鼠标样式
    this.viewer.scene.canvas.style.cursor = "default";
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.RIGHT_CLICK);
    this.handler.removeInputAction(
      Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
    );
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_DOWN);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_UP);
    this.handler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }
  /**清除测量 */
  clear() {
    // 清空绘制存储
    this.dataSource.entities.removeAll();
    this.dataSource_measure.entities.removeAll();
  }
  /**注销测量对象 */
  destroy() {
    this.stop();
    this.clear();
    this.viewer.dataSources.remove(this.dataSource, true);
    this.dataSource = null;
    this.viewer.dataSources.remove(this.dataSource_measure, true);
    this.dataSource_measure = null;
    this.viewer = null;
    this.scene = null;
    this.ellipsoid = null;
    this.canvas = null;
    this.handler = null;
  }
}
export { MeasureHandler };
