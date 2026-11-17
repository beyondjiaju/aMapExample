import { viewer, olMap } from "@/3dMap/global";
import { mapEmitter } from "@/3dMap/interface";
import { MeasureHandler as MeasureHandlerCesium } from "@/3dMap/sdk/cesiumUtils";
import { MeasureHandler as MeasureHandlerOl } from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";

const measureOptions = {
  endType: "contextmenu",
  moveEvent: true
};

/** 二三维通用测量。只创建当前模式的测量对象，切换后按当前测量类型重新开始 */
class Measure {
  handler: any;
  measureType: any;
  onTypeChange: any;
  mapEmitterOff: any;
  constructor(option?) {
    this.handler = null;
    this.measureType = "";
    this.onTypeChange = option?.onTypeChange;
    this.mapEmitterOff = null;
    this.setByMapMode();
    // 模式切换后清掉旧测量，并在新地图上恢复切换前的测量类型
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      () => {
        const type = this.measureType;
        this.handler?.destroy();
        this.handler = null;
        this.measureType = "";
        this.setByMapMode();
        if (!type) return;
        this.change(type);
      }
    );
  }
  /** 按当前 mapMode 创建测量对象 */
  setByMapMode() {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium" && viewer && !viewer.isDestroyed?.()) {
      this.handler = new MeasureHandlerCesium(viewer, measureOptions);
      return;
    }
    if (mapMode === "ol" && olMap) {
      this.handler = new MeasureHandlerOl(olMap, measureOptions);
    }
  }
  change(type) {
    if (!this.handler) this.setByMapMode();
    if (type == "clear" || (this.measureType && this.measureType == type)) {
      this.handler?.clear();
      this.handler?.stop();
      this.measureType = "";
      this.onTypeChange?.("");
      return;
    }
    this.handler?.start(type);
    this.measureType = type;
    this.onTypeChange?.(type);
  }
  destroy() {
    this.mapEmitterOff?.();
    this.mapEmitterOff = null;
    this.handler?.destroy();
    this.handler = null;
    this.measureType = "";
  }
}
export { Measure };
