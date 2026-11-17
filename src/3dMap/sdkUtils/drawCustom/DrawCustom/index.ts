import { viewer, olMap } from "@/3dMap/global";
import { mapEmitter } from "@/3dMap/interface";
import { DrawHandler as DrawHandlerCesium } from "@/3dMap/sdk/cesiumUtils";
import { DrawHandler as DrawHandlerOl } from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";

/** 二三维通用绘制。只创建当前模式的绘制对象，切换后按正在绘制的类型续上 */
class DrawCustom {
  handler: any;
  drawType: any;
  drawOptions: any;
  onDrawFinished: any;
  mapEmitterOff: any;
  constructor(option?) {
    this.handler = null;
    this.drawType = "";
    this.drawOptions = null;
    this.onDrawFinished = option?.onDrawFinished;
    this.mapEmitterOff = null;
    this.setByMapMode();
    // 模式切换后重建当前地图的绘制对象，并恢复切换前的绘制类型
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      () => {
        const type = this.drawType;
        const options = this.drawOptions;
        this.handler?.destroy();
        this.handler = null;
        this.setByMapMode();
        if (!type) return;
        if (type == "input") {
          this.handler?.stop();
          return;
        }
        this.handler?.clear();
        this.handler?.start(type, options);
      }
    );
  }
  /** 按当前 mapMode 创建绘制对象，并挂上绘制结束回调 */
  setByMapMode() {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium" && viewer && !viewer.isDestroyed?.()) {
      this.handler = new DrawHandlerCesium(viewer);
    } else if (mapMode === "ol" && olMap) {
      this.handler = new DrawHandlerOl(olMap);
    }
    this.handler?.drawFinished.addEventListener(shap => {
      this.onDrawFinished?.(shap);
    });
  }
  /** 记录当前绘制类型，供模式切换后恢复 */
  setDrawType(type, options = null) {
    this.drawType = type || "";
    this.drawOptions = options;
  }
  clear() {
    this.handler?.clear();
  }
  stop() {
    this.handler?.stop();
  }
  start(type, options) {
    this.handler?.start(type, options);
  }
  remove(shap) {
    this.handler?.remove(shap);
  }
  destroy() {
    this.mapEmitterOff?.();
    this.mapEmitterOff = null;
    this.handler?.destroy();
    this.handler = null;
    this.drawType = "";
    this.drawOptions = null;
  }
}
export { DrawCustom };
