import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
import * as ol from "@/3dMap/sdk/ol";
import { getHeight } from "@/3dMap/sdk/olUtils";
/**创建HTMLTag对象*/
class HtmlTag {
  /**初始化HTMLTag
   * @param {Object} olMap
   * @param {Object} options
   * @param {Object} options.position 坐标 [lon, lat]
   * @param {String} options.html
   * @param {String} options.id
   * @param {Boolean} options.noEvent default:true
   * @param {Array} options.translate 位置偏移[x, y] default:[0,0]
   * @param {Number} options.alignmentMode 对齐方式 default:7  0(top_left),1,2,3(center_left),4,5,6(bottom_left),7,8
   * @param {Boolean} options.show 显示状态 default:true
   * @param {Number} options.minVisibleDistance 最小可视距离 default:0
   * @param {Number} options.minVisibleDistance 最大可视距离 default:Number.MAX_VALUE
   * @param {Number} options.zIndex 堆叠顺序 default:auto
   * @param {Boolean} options.isDrag 是否可拖动 default:false noEvent为false生效
   * @param {String} options.dragLineColor 拖拽线颜色 default:#fff
   * @param {Number} options.dragLineWidth 拖拽线宽度 default:1
   */
  constructor(olMap, options) {
    const that = this;
    that.olMap = olMap;
    const defaultOptions = {
      noEvent: true,
      translate: [0, 0],
      alignmentMode: 7,
      show: true,
      minVisibleDistance: 0,
      maxVisibleDistance: Number.MAX_VALUE,
      zIndex: "auto",
      isDrag: false,
      dragLineColor: "#ffffff",
      dragLineWidth: 1.5
    };
    that.options = Object.assign(defaultOptions, options);
    that.id = that.options.id || "";
    // 创建、设置
    const div = document.createElement("div");
    div.id = that.id;
    div.className = that.options.className || "";
    div.style.cssText = "position: absolute;color:#fff;white-space: nowrap;";
    // 设置偏移
    const translateX = Number(that.options.translate[0]),
      translateY = Number(that.options.translate[1]);
    switch (that.options.alignmentMode) {
      case 0:
        div.style.transform =
          "translate(" + translateX + "px, " + translateY + "px)";
        break;
      case 1:
        div.style.transform =
          "translate(calc(-50% + " + translateX + "px), " + translateY + "px)";
        break;
      case 2:
        div.style.transform =
          "translate(calc(-100% + " + translateX + "px), " + translateY + "px)";
        break;
      case 3:
        div.style.transform =
          "translate(" + translateX + "px, calc(-50% + " + translateY + "px))";
        break;
      case 4:
        div.style.transform =
          "translate(calc(-50% + " +
          translateX +
          "px), calc(-50% + " +
          translateY +
          "px))";
        break;
      case 5:
        div.style.transform =
          "translate(calc(-100% + " +
          translateX +
          "px), calc(-50% + " +
          translateY +
          "px))";
        break;
      case 6:
        div.style.transform =
          "translate(" + translateX + "px, calc(-100% + " + translateY + "px))";
        break;
      case 7:
        div.style.transform =
          "translate(calc(-50% + " +
          translateX +
          "px), calc(-100% + " +
          translateY +
          "px))";
        break;
      case 8:
        div.style.transform =
          "translate(calc(-100% + " +
          translateX +
          "px), calc(-100% + " +
          translateY +
          "px))";
        break;
      default:
        break;
    }
    that.dom = that.olMap.getTargetElement().appendChild(div);
    const pixel = that.olMap.getPixelFromCoordinate(that.options.position);
    if (pixel) {
      that.windowCoord = {
        x: pixel[0],
        y: pixel[1]
      };
      that.dom.style.top = that.windowCoord.y + "px";
      that.dom.style.left = that.windowCoord.x + "px";
    }
    // 监听参数设置 监听 可更改属性
    that.html = that.options.html;
    that.dom.innerHTML = that.html;
    that.noEvent = that.options.noEvent;
    that.minVisibleDistance = that.options.minVisibleDistance;
    that.maxVisibleDistance = that.options.maxVisibleDistance;
    that.zIndex = that.options.zIndex;
    that.position = that.options.position;
    that.historyPosition = that.options.position;
    that.show = that.options.show;
    that.isDrag = that.options.isDrag;
    that.dragLineColor = that.options.dragLineColor;
    that.dragLineWidth = that.options.dragLineWidth;
    that.addListener();
  }
  addListener() {
    const that = this;
    // 监听
    that.listener = () => {
      // 有拖拽使用拖拽坐标
      if (that.dragPosition) {
        if (
          JSON.stringify(that.position) === JSON.stringify(that.historyPosition)
        ) {
          const turfOptions = {
            units: "kilometers"
          };
          // 计算角度与距离
          const pointHis = turf.point(that.historyPosition),
            pointNew = turf.point(that.position),
            angle = turf.bearing(pointHis, pointNew),
            distance = turf.distance(pointHis, pointNew, turfOptions);
          // 根据角度距离计算新的dragPosition
          const pointDrag = turf.point(that.dragPosition),
            newDragPosition = turf.destination(
              pointDrag,
              distance,
              angle,
              turfOptions
            );
          that.dragPosition = [
            newDragPosition.geometry.coordinates[0],
            newDragPosition.geometry.coordinates[1]
          ];
          // 更新历史坐标记录
          that.historyPosition = that.position;
        }
        const pixel = that.olMap.getPixelFromCoordinate(that.dragPosition);
        that.windowCoord = {
          x: pixel[0],
          y: pixel[1]
        };
        that.dragLinePositions = [that.position, that.dragPosition];
        if (that.dragLine) {
          that.dragLine.feature
            .getGeometry()
            ?.setCoordinates(that.dragLinePositions);
        }
      } else {
        const pixel = that.olMap.getPixelFromCoordinate(that.position);
        that.windowCoord = {
          x: pixel[0],
          y: pixel[1]
        };
      }
      // 显示状态
      if (that.show) {
        const cameraHeight = getHeight(this.olMap);
        // 可视距离
        if (
          cameraHeight >= that.minVisibleDistance &&
          cameraHeight <= that.maxVisibleDistance
        ) {
          // 线坐标 最近距离
          if (that.position_near) {
            that.dragLinePositions = [that.position, that.position_near];
            if (that.dragLine) {
              that.dragLine.feature
                .getGeometry()
                ?.setCoordinates(that.dragLinePositions);
            }
          }
          // 拖动坐标存储并重新计算偏移
          if (that.isDrag && !that.dragEvent) {
            that.dragEvent = true;
            that.dom.onmousedown = downEvent => {
              downEvent.preventDefault();
              const targetElement = that.olMap.getTargetElement();
              // 获取鼠标基于元素偏移
              const offsetX =
                  downEvent.clientX -
                  targetElement.offsetLeft -
                  that.windowCoord.x,
                offsetY =
                  downEvent.clientY -
                  targetElement.offsetTop -
                  that.windowCoord.y;
              document.onmousemove = moveEvent => {
                moveEvent = moveEvent || window.event;
                // 获取鼠标在container中位置
                const moveX =
                    moveEvent.clientX - targetElement.offsetLeft - offsetX,
                  moveY = moveEvent.clientY - targetElement.offsetTop - offsetY;
                // 坐标转换并赋值
                let coordinate = that.olMap.getCoordinateFromPixel([
                  moveX,
                  moveY
                ]);
                if (coordinate) {
                  that.dragPosition = coordinate;
                }
                that.addLine = true;
              };
              document.onmouseup = upEvent => {
                document.onmousemove = null;
                document.onmouseup = null;
                that.dom.onmousedown = null;
                that.dragEvent = false;
              };
            };
          }
          // 设置tag标签
          if (that.isDrag) {
            that.dom.style.cursor = "move";
          } else {
            that.dom.style.cursor = "default";
          }
          // that.dom.innerHTML = that.html;
          that.dom.style.zIndex = that.zIndex;
          that.dom.style.pointerEvents = that.noEvent ? "none" : "all";
          if (!that.windowCoord) return;
          that.dom.style.top = that.windowCoord.y + "px";
          that.dom.style.left = that.windowCoord.x + "px";
          that.dom.style.display = "block";
          if (that.dragLine) that.dragLine.layer.setVisible(true);
          // 绘制线
          if (!that.dragLine && that.addLine) {
            that.addLine = false;
            const geometry = new ol.geom.LineString(that.dragLinePositions);
            const style = new ol.style.Style({
              stroke: new ol.style.Stroke({
                color: that.dragLineColor,
                width: that.dragLineWidth
              })
            });
            that.dragLine = {
              layer: new ol.VectorLayer({
                source: new ol.VectorSource()
              }),
              feature: new ol.Feature({
                geometry: new ol.geom.LineString(that.dragLinePositions),
                featureData: {
                  geometry,
                  style
                }
              })
            };
            that.dragLine.layer.setZIndex(Number.MAX_VALUE);
            that.olMap.addLayer(this.dragLine.layer);
            that.dragLine.feature.setStyle(style);
            this.dragLine.layer.getSource().addFeature(that.dragLine.feature);
          }
          if (!that.dragLine) return;
          /**线连接tag最近点效果 */
          // 获取标签边界点
          const domWidth = that.dom.offsetWidth,
            domHeight = that.dom.offsetHeight;
          let min_x, max_x, min_y, max_y;
          if (
            that.options.alignmentMode == 0 ||
            that.options.alignmentMode == 3 ||
            that.options.alignmentMode == 6
          ) {
            min_x = that.windowCoord.x + that.options.translate[0];
            max_x = that.windowCoord.x + domWidth + that.options.translate[0];
          }
          if (
            that.options.alignmentMode == 1 ||
            that.options.alignmentMode == 4 ||
            that.options.alignmentMode == 7
          ) {
            min_x =
              that.windowCoord.x - domWidth / 2 + that.options.translate[0];
            max_x =
              that.windowCoord.x + domWidth / 2 + that.options.translate[0];
          }
          if (
            that.options.alignmentMode == 2 ||
            that.options.alignmentMode == 5 ||
            that.options.alignmentMode == 8
          ) {
            min_x = that.windowCoord.x - domWidth + that.options.translate[0];
            max_x = that.windowCoord.x + that.options.translate[0];
          }
          if (
            that.options.alignmentMode == 0 ||
            that.options.alignmentMode == 1 ||
            that.options.alignmentMode == 2
          ) {
            min_y = that.windowCoord.y + that.options.translate[1];
            max_y = that.windowCoord.y + domHeight + that.options.translate[1];
          }
          if (
            that.options.alignmentMode == 3 ||
            that.options.alignmentMode == 4 ||
            that.options.alignmentMode == 5
          ) {
            min_y =
              that.windowCoord.y - domHeight / 2 + that.options.translate[1];
            max_y =
              that.windowCoord.y + domHeight / 2 + that.options.translate[1];
          }
          if (
            that.options.alignmentMode == 6 ||
            that.options.alignmentMode == 7 ||
            that.options.alignmentMode == 8
          ) {
            min_y = that.windowCoord.y - domHeight + that.options.translate[1];
            max_y = that.windowCoord.y + that.options.translate[1];
          }
          const domOutLine_windowCoordinates = [
            {
              x: min_x,
              y: min_y
            },
            {
              x: min_x,
              y: max_y
            },
            {
              x: max_x,
              y: max_y
            },
            {
              x: max_x,
              y: min_y
            }
          ];
          // 边界转换cartesian3
          const domOutLine_cartesian = [];
          domOutLine_windowCoordinates.forEach(coordinate => {
            const cartesian = that.olMap.getCoordinateFromPixel([
              coordinate.x,
              coordinate.y
            ]);
            if (!cartesian) return;
            domOutLine_cartesian.push(cartesian);
          });
          if (domOutLine_cartesian.length > 0) {
            if (domOutLine_cartesian.length == 1) {
              that.position_near = domOutLine_cartesian[0];
            } else {
              // 创建点与线并计算最短距离点
              const line = turf.lineString([
                  ...domOutLine_cartesian,
                  domOutLine_cartesian[0]
                ]),
                point = turf.point(that.position);
              const nearestPointOnLine = turf.nearestPointOnLine(line, point, {
                units: "kilometers",
                steps: 360
              });
              // 存储最短距离点cartesian3格式坐标
              that.position_near = [
                nearestPointOnLine.geometry.coordinates[0],
                nearestPointOnLine.geometry.coordinates[1]
              ];
            }
          }
        } else {
          that.dom.style.display = "none";
          if (that.dragLine) that.dragLine.layer.setVisible(false);
        }
      } else {
        that.dom.style.display = "none";
        if (that.dragLine) that.dragLine.layer.setVisible(false);
      }
    };
    that.olMap.addEventListener("postrender", that.listener);
  }
  /**更新html */
  setHtml(html) {
    const that = this;
    that.dom.innerHTML = html;
  }
  /**注销标牌 */
  destroy() {
    const that = this;
    that.olMap.removeEventListener("postrender", that.listener);
    that.listener = null;
    that.windowCoord = null;
    document.onmousemove = null;
    document.onmouseup = null;
    that.dom.onmousedown = null;
    that.olMap.getTargetElement().removeChild(that.dom);
    that.dom = null;
    that.html = null;
    that.zIndex = null;
    that.noEvent = null;
    that.isDrag = null;
    that.dragEvent = null;
    if (that.dragLine) {
      that.olMap.removeLayer(that.dragLine.layer);
      that.dragLine = null;
    }
    that.dragPosition = null;
    that.dragLinePositions = null;
    that.minVisibleDistance = null;
    that.maxVisibleDistance = null;
    that.position = null;
    that.show = null;
    that.options = null;
    that.olMap = null;
  }
}
export { HtmlTag };
