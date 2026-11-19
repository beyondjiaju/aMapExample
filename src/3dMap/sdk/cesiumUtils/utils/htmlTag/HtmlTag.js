import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
import { PolylineAntialiasingMaterialProperty } from "@/3dMap/sdk/cesiumUtils";
/**创建HTMLTag对象*/
class HtmlTag {
  /**初始化HTMLTag
   * @param {Object} viewer
   * @param {Object} options
   * @param {Object} options.position 坐标 cartesian3
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
  constructor(viewer, options) {
    const that = this;
    that.viewer = viewer;
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
    that.dom = that.viewer.container.appendChild(div);
    const position_carto = Cesium.Cartographic.fromCartesian(
      that.options.position
    );
    // 监听参数设置 监听 可更改属性
    that.html = that.options.html;
    that.dom.innerHTML = that.html;
    that.noEvent = that.options.noEvent;
    that.minVisibleDistance = that.options.minVisibleDistance;
    that.maxVisibleDistance = that.options.maxVisibleDistance;
    that.zIndex = that.options.zIndex;
    that.position = that.options.position;
    that.height = position_carto.height;
    that.historyPosition = that.options.position;
    that.show = that.options.show;
    that.isDrag = that.options.isDrag;
    that.dragLineColor = that.options.dragLineColor;
    that.dragLineWidth = that.options.dragLineWidth;
    that.addListener();
  }
  addListener() {
    const that = this;
    const scene = that.viewer.scene;
    // 监听
    that.listener = () => {
      const position_carto = Cesium.Cartographic.fromCartesian(that.position);
      // 有拖拽使用拖拽坐标
      if (that.dragPosition) {
        if (!that.position.equals(that.historyPosition)) {
          const turfOptions = {
            units: "kilometers"
          };
          // 计算角度与距离
          const pHis = Cesium.Cartographic.fromCartesian(that.historyPosition),
            pNew = Cesium.Cartographic.fromCartesian(that.position),
            pointHis = turf.point([
              Cesium.Math.toDegrees(pHis.longitude),
              Cesium.Math.toDegrees(pHis.latitude)
            ]),
            pointNew = turf.point([
              Cesium.Math.toDegrees(pNew.longitude),
              Cesium.Math.toDegrees(pNew.latitude)
            ]),
            angle = turf.bearing(pointHis, pointNew),
            distance = turf.distance(pointHis, pointNew, turfOptions);
          // 根据角度距离计算新的dragPosition
          const pDrag = Cesium.Cartographic.fromCartesian(that.dragPosition),
            pointDrag = turf.point([
              Cesium.Math.toDegrees(pDrag.longitude),
              Cesium.Math.toDegrees(pDrag.latitude)
            ]),
            newDragPosition = turf.destination(
              pointDrag,
              distance,
              angle,
              turfOptions
            );
          that.dragPosition = Cesium.Cartesian3.fromDegrees(
            newDragPosition.geometry.coordinates[0],
            newDragPosition.geometry.coordinates[1]
          );
          // 更新历史坐标记录
          that.historyPosition = that.position;
        }
        const drag_carto = Cesium.Cartographic.fromCartesian(that.dragPosition),
          newDragPosition = Cesium.Cartesian3.fromRadians(
            drag_carto.longitude,
            drag_carto.latitude,
            position_carto.height
          );
        that.windowCoord = Cesium.SceneTransforms.worldToWindowCoordinates(
          scene,
          newDragPosition
        );
        that.dragLinePositions = [that.position, newDragPosition];
      } else {
        that.windowCoord = Cesium.SceneTransforms.worldToWindowCoordinates(
          scene,
          that.position
        );
      }
      const cameraOccluder = new Cesium.EllipsoidalOccluder(
        Cesium.Ellipsoid.WGS84,
        that.viewer.camera.position
      );
      const viewerVisible = cameraOccluder.isPointVisible(that.position);
      // 是否遮挡
      if (this.viewer.scene.mode == 3 && !viewerVisible) {
        that.dom.style.display = "none";
      } else {
        // 显示状态
        if (that.show) {
          const cameraHeight =
            this.viewer.scene.globe.ellipsoid.cartesianToCartographic(
              that.viewer.camera.position
            ).height;
          // 可视距离
          if (
            this.viewer.scene.mode == 2 ||
            (cameraHeight >= that.minVisibleDistance &&
              cameraHeight <= that.maxVisibleDistance)
          ) {
            // 线坐标 最近距离
            if (that.position_near) {
              that.dragLinePositions = [that.position, that.position_near];
            }
            // 拖动坐标存储并重新计算偏移
            if (that.isDrag && !that.dragEvent) {
              that.dragEvent = true;
              that.dom.onmousedown = downEvent => {
                downEvent.preventDefault();
                // 获取鼠标基于元素偏移
                const offsetX =
                    downEvent.clientX -
                    that.viewer.container.offsetLeft -
                    that.windowCoord.x,
                  offsetY =
                    downEvent.clientY -
                    that.viewer.container.offsetTop -
                    that.windowCoord.y;
                document.onmousemove = moveEvent => {
                  moveEvent = moveEvent || window.event;
                  // 获取鼠标在container中位置
                  const moveX =
                      moveEvent.clientX -
                      that.viewer.container.offsetLeft -
                      offsetX,
                    moveY =
                      moveEvent.clientY -
                      that.viewer.container.offsetTop -
                      offsetY;
                  // 坐标转换并赋值
                  const movePositionClient = new Cesium.Cartesian2(
                      moveX,
                      moveY
                    ),
                    pickRay = that.viewer.camera.getPickRay(movePositionClient),
                    movePositionCartesian3 = pickRay
                      ? scene.globe.pick(pickRay, scene)
                      : undefined;
                  if (movePositionCartesian3) {
                    const movePositionCartesian3_carto =
                      Cesium.Cartographic.fromCartesian(movePositionCartesian3);
                    that.dragPosition = Cesium.Cartesian3.fromRadians(
                      movePositionCartesian3_carto.longitude,
                      movePositionCartesian3_carto.latitude,
                      that.height
                    );
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
            if (that.dragLine) that.dragLine.show = true;
            // 绘制线
            if (!that.dragLine && that.addLine) {
              that.addLine = false;
              that.dragLine = that.viewer.entities.add({
                polyline: {
                  positions: new Cesium.CallbackProperty(() => {
                    return that.dragLinePositions;
                  }, false),
                  material: new PolylineAntialiasingMaterialProperty({
                    color: Cesium.Color.fromCssColorString(
                      that.dragLineColor
                    )
                  }),
                  width: that.dragLineWidth
                }
              });
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
              max_y =
                that.windowCoord.y + domHeight + that.options.translate[1];
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
              min_y =
                that.windowCoord.y - domHeight + that.options.translate[1];
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
            const domOutLine_cartesian3 = [];
            domOutLine_windowCoordinates.forEach(coordinate => {
              const domOutLine_cartesian2 = new Cesium.Cartesian2(
                coordinate.x,
                coordinate.y
              );
              const outlineRay = that.viewer.camera.getPickRay(
                domOutLine_cartesian2
              );
              // getPickRay 在画布尺寸为 0 或场景过渡中会返回 undefined
              if (!outlineRay) return;
              const c3 = scene.globe.pick(outlineRay, scene);
              if (!c3) return;
              domOutLine_cartesian3.push(c3);
            });
            if (domOutLine_cartesian3.length > 0) {
              if (domOutLine_cartesian3.length == 1) {
                that.position_near = domOutLine_cartesian3[0];
              } else {
                // 转cartographic
                const domOutLine_cartographic =
                    scene.globe.ellipsoid.cartesianArrayToCartographicArray(
                      domOutLine_cartesian3
                    ),
                  domOutLine_degrees = [];
                domOutLine_cartographic.forEach(
                  (cartographic, cartographicIndex) => {
                    domOutLine_degrees.push([
                      Cesium.Math.toDegrees(cartographic.longitude),
                      Cesium.Math.toDegrees(cartographic.latitude)
                    ]);
                    if (
                      cartographicIndex ==
                      domOutLine_cartographic.length - 1
                    ) {
                      domOutLine_degrees.push(domOutLine_degrees[0]);
                    }
                  }
                );
                // 创建点与线并计算最短距离点
                const point_cartographic =
                  scene.globe.ellipsoid.cartesianToCartographic(that.position);
                const line = turf.lineString(domOutLine_degrees),
                  point = turf.point([
                    Cesium.Math.toDegrees(point_cartographic.longitude),
                    Cesium.Math.toDegrees(point_cartographic.latitude)
                  ]);
                const nearestPointOnLine = turf.nearestPointOnLine(
                  line,
                  point,
                  {
                    units: "kilometers",
                    steps: 360
                  }
                );
                // 存储最短距离点cartesian3格式坐标
                that.position_near = Cesium.Cartesian3.fromDegrees(
                  nearestPointOnLine.geometry.coordinates[0],
                  nearestPointOnLine.geometry.coordinates[1],
                  0
                );
              }
            }
          } else {
            that.dom.style.display = "none";
            if (that.dragLine) that.dragLine.show = false;
          }
        } else {
          that.dom.style.display = "none";
          if (that.dragLine) that.dragLine.show = false;
        }
      }
    };
    scene.postRender.addEventListener(that.listener);
  }
  /**更新html */
  setHtml(html) {
    const that = this;
    that.dom.innerHTML = html;
  }
  /**注销标牌 */
  destroy() {
    const that = this;
    that.viewer.scene.postRender.removeEventListener(that.listener);
    that.listener = null;
    that.windowCoord = null;
    document.onmousemove = null;
    document.onmouseup = null;
    that.dom.onmousedown = null;
    that.viewer.container.removeChild(that.dom);
    that.dom = null;
    that.html = null;
    that.zIndex = null;
    that.noEvent = null;
    that.isDrag = null;
    that.dragEvent = null;
    if (that.dragLine) {
      that.viewer.entities.remove(that.dragLine);
      that.dragLine = null;
    }
    that.dragPosition = null;
    that.dragLinePositions = null;
    that.minVisibleDistance = null;
    that.maxVisibleDistance = null;
    that.position = null;
    that.show = null;
    that.options = null;
    that.viewer = null;
  }
}
export { HtmlTag };
