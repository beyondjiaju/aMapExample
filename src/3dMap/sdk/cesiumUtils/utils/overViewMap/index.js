import * as Cesium from "@/3dMap/sdk/cesium";
import { PolylineAntialiasingMaterialProperty } from "../material/PolylineAntialiasingMaterialProperty";
import worldImg from "./images/earth_color_low_4096.jpg";
/**鹰眼 */
class OverViewMap {
  constructor(options) {
    if (!options.viewer) return;
    this.viewer = options.viewer;
    const defaultOptions = {
      show: true,
      width: 300,
      height: 200,
      top: "none",
      left: 5,
      bottom: 5,
      right: 5,
      zIndex: 9999999999,
      centerRectColor: Cesium.Color.YELLOW
    };
    this.options = Object.assign(defaultOptions, options);
    this.show = this.options.show;
    this.interacting = false;
    // 鹰眼
    this.overMapData = {};
    this.addListener();
  }
  addListener() {
    const that = this;
    if (!that.listener) {
      that.listener = () => {
        if (that.interacting) return;
        // 初始化鹰眼视图
        if (!that.overMapData.dom) {
          const div = document.createElement("div");
          div.id = that.viewer.container.id + "_OverViewMap";
          const isShow = that.show ? "block" : "none";
          div.style.cssText = `position: absolute;
                                        width: ${that.options.width}px;
                                        height: ${that.options.height}px;
                                        top: ${that.options.top}px;
                                        left: ${that.options.left}px;
                                        bottom: ${that.options.bottom}px;
                                        right: ${that.options.right}px;
                                        z-index: ${that.options.zIndex}px;
                                        display: ${isShow}px;
                                        background: #000;`;
          that.overMapData.dom = that.viewer.container.appendChild(div);
          // 初始化
          that.overMapData.viewer = new Cesium.Viewer(div.id, {
            baseLayerPicker: false,
            animation: false,
            fullscreenButton: false,
            vrButton: false,
            geocoder: false,
            homeButton: false,
            infoBox: false,
            sceneModePicker: false,
            selectionIndicator: false,
            timeline: false,
            navigationHelpButton: false,
            shadows: false,
            shouldAnimate: false,
            imageryProvider: false
          });
          that.overMapData.viewer.cesiumWidget.creditContainer.style.display =
            "none";
          that.overMapData.viewer.scene.screenSpaceCameraController.enableInputs = false;
          that.bindPointer();
          // 添加底图
          Cesium.SingleTileImageryProvider.fromUrl(worldImg).then(provider => {
            that.overMapData.viewer.imageryLayers.addImageryProvider(provider);
          });
          // 2D模式
          that.overMapData.viewer.scene.mode = 2;
          // 添加操作事件
          // that.overMapData.handler = new Cesium.ScreenSpaceEventHandler(that.overMapData.viewer.scene.canvas);
          // that.overMapData.handler.setInputAction(()=>{
          //     that.removeListener();
          // }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
          // 添加监听
          that.overMapData.listener = () => {
            if (!that.overMapData.isMouseover) return;
            const over_position = that.overMapData.viewer.camera.position,
              over_heading = that.overMapData.viewer.camera.heading,
              over_pitch = that.overMapData.viewer.camera.pitch,
              over_roll = that.overMapData.viewer.camera.roll;
            // that.overMapData.rectangle_coordinates = that.overMapData.viewer.camera.computeViewRectangle();
            // console.log(that.overMapData.rectangle_coordinates);
            // if(!that.overMapData.rectangle_coordinates)return
            // that.overMapData.rectangle_center = Cesium.Rectangle.center(that.overMapData.rectangle_coordinates);
            const over_carto_p =
              Cesium.Cartographic.fromCartesian(over_position);
            that.viewer.camera.setView({
              destination: Cesium.Cartesian3.fromRadians(
                over_carto_p.longitude,
                over_carto_p.latitude,
                over_carto_p.height
              )
              // orientation: {
              //     heading: over_heading,
              //     pitch: over_pitch,
              //     roll: over_roll
              // }
            });
          };
          // that.overMapData.viewer.scene.postRender.addEventListener(that.overMapData.listener);
          // 鼠标移入移出事件
          // that.overMapData.mouseover = ()=>{
          //     that.overMapData.isMouseover = true;
          //     that.removeListener();
          // }
          // that.overMapData.mouseout = ()=>{
          //     that.overMapData.isMouseover = false;
          //     that.addListener();
          // }
          // that.overMapData.dom.addEventListener('mouseover', that.overMapData.mouseover);
          // that.overMapData.dom.addEventListener('mouseout', that.overMapData.mouseout);
        }
        // 设置显示状态
        const isShow = that.show ? "block" : "none";
        that.overMapData.dom.style.display = isShow;
        // 获取map视角信息
        const position = that.viewer.camera.position,
          heading = that.viewer.camera.heading,
          pitch = that.viewer.camera.pitch,
          roll = that.viewer.camera.roll;
        const carto_p = Cesium.Cartographic.fromCartesian(position);
        const heightLimit = 2000 * 1000;
        if (carto_p.height < heightLimit) {
          const rect = that.viewer.camera.computeViewRectangle();
          if (rect) {
            that.rectangle_coordinates = rect;
            // 记下限制高度内的矩形大小，超出后不再放大
            that.rectSpan = {
              width: Cesium.Rectangle.computeWidth(rect),
              height: Cesium.Rectangle.computeHeight(rect)
            };
          }
        } else if (that.rectSpan) {
          // 超出高度后保持该大小，只跟随当前位置回显
          const halfW = that.rectSpan.width / 2;
          const halfH = that.rectSpan.height / 2;
          let south = carto_p.latitude - halfH;
          let north = carto_p.latitude + halfH;
          const latLimit = Cesium.Math.PI_OVER_TWO - Cesium.Math.EPSILON6;
          if (south < -latLimit) {
            north -= south + latLimit;
            south = -latLimit;
          }
          if (north > latLimit) {
            south -= north - latLimit;
            north = latLimit;
          }
          that.rectangle_coordinates = new Cesium.Rectangle(
            carto_p.longitude - halfW,
            south,
            carto_p.longitude + halfW,
            north
          );
        }
        if (that.overMapData.viewer) {
          if (!that.overMapData.rectangle) {
            that.overMapData.rectangle = that.overMapData.viewer.entities.add({
              rectangle: {
                coordinates: new Cesium.CallbackProperty(() => {
                  return that.rectangle_coordinates;
                }, false),
                material: that.options.centerRectColor.withAlpha(0.5)
              },
              // 黄色边线与二维视窗框描边一致，避免只剩半透明填充看不清
              // polyline: {
              //   positions: new Cesium.CallbackProperty(() => {
              //     const rect = that.rectangle_coordinates;
              //     if (!rect) return [];
              //     return [
              //       Cesium.Cartesian3.fromRadians(rect.west, rect.south),
              //       Cesium.Cartesian3.fromRadians(rect.west, rect.north),
              //       Cesium.Cartesian3.fromRadians(rect.east, rect.north),
              //       Cesium.Cartesian3.fromRadians(rect.east, rect.south),
              //       Cesium.Cartesian3.fromRadians(rect.west, rect.south)
              //     ];
              //   }, false),
              //   width: 2.5,
              //   material: new PolylineAntialiasingMaterialProperty({
              //     color: that.options.centerRectColor
              //   }),
              //   clampToGround: true
              // },
              show: false
            });
          }
          that.overMapData.rectangle.show = !!that.rectangle_coordinates;
          let viewHeight = 0,
            // maxHeight = 3000000;
            maxHeight = 8874143.35297852;
          if (carto_p.height >= maxHeight) {
            viewHeight = maxHeight * 4.5;
          } else {
            viewHeight = carto_p.height * 4.5;
          }
          that.overMapData.viewer.camera.setView({
            destination: Cesium.Cartesian3.fromRadians(
              carto_p.longitude,
              carto_p.latitude,
              viewHeight
            ),
            orientation: {
              heading,
              pitch,
              roll
            }
          });
        }
      };
    }
    that.viewer.scene.postRender.addEventListener(that.listener);
  }
  /** 点击或拖动时，用落点平移当前视窗矩形，再交给主球定位 */
  moveOverviewByPosition(windowPosition) {
    const overview = this.overMapData?.viewer;
    const rect = this.rectangle_coordinates;
    if (!overview || !rect || !windowPosition) return;
    const cartesian = overview.camera.pickEllipsoid(
      windowPosition,
      overview.scene.globe.ellipsoid
    );
    if (!cartesian) return;
    const carto = Cesium.Cartographic.fromCartesian(cartesian);
    const width = Cesium.Rectangle.computeWidth(rect);
    const height = Cesium.Rectangle.computeHeight(rect);
    let south = carto.latitude - height / 2;
    let north = carto.latitude + height / 2;
    const limit = Cesium.Math.PI_OVER_TWO - Cesium.Math.EPSILON6;
    if (south < -limit) {
      north -= south + limit;
      south = -limit;
    }
    if (north > limit) {
      south -= north - limit;
      north = limit;
    }
    const next = new Cesium.Rectangle(
      carto.longitude - width / 2,
      south,
      carto.longitude + width / 2,
      north
    );
    this.rectangle_coordinates = next;
    this.viewer.camera.setView({
      destination: next
    });
  }

  /** 鹰眼上按下即定位，拖动过程中持续把新矩形同步到主球 */
  bindPointer() {
    if (this.overMapData.handler || !this.overMapData.viewer) return;
    const handler = new Cesium.ScreenSpaceEventHandler(
      this.overMapData.viewer.scene.canvas
    );
    this.overMapData.handler = handler;
    handler.setInputAction(event => {
      this.interacting = true;
      this.moveOverviewByPosition(event.position);
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
    handler.setInputAction(event => {
      if (!this.interacting) return;
      this.moveOverviewByPosition(event.endPosition);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction(() => {
      this.interacting = false;
    }, Cesium.ScreenSpaceEventType.LEFT_UP);
  }

  setVisible(state) {
    this.show = state;
  }
  removeListener() {
    this.viewer.scene.postRender.removeEventListener(this.listener);
  }
  /**鹰眼 */
  destroy() {
    if (this.listener) {
      this.removeListener();
      this.listener = null;
    }
    this.options = null;
    this.show = null;
    this.overMapData.handler?.destroy();
    this.overMapData.viewer.destroy();
    this.viewer.container.removeChild(this.overMapData.dom);
    this.overMapData = null;
    this.viewer = null;
  }
}
export { OverViewMap };
