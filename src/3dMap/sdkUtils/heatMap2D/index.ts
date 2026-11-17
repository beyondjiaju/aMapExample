import { viewer, olMap } from "@/3dMap/global";
import { mapEmitter } from "@/3dMap/interface";
import { HeatMap2D as HeatMap2DCesium } from "@/3dMap/sdk/cesiumUtils";
import { HeatMap2D as HeatMap2DOl } from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";

/**
 * 二三维通用热力图。
 * 只往当前模式的地图上加图层，历史数据在切换模式时再铺到新地图。
 */
class HeatMap2D {
  options: any;
  mouseLookAt: any;
  handler: any;
  history: any[];
  mapEmitterOff: any;
  constructor(options?) {
    this.options = { ...(options || {}) };
    this.mouseLookAt = options?.mouseLookAt ?? null;
    this.handler = null;
    this.history = [];
    this.mapEmitterOff = null;
    this.setByMapMode();
    // 模式切换后丢掉旧热力，按历史记录在新地图上重建
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      () => {
        this.handler?.destroy();
        this.handler = null;
        this.setByMapMode();
        this.history.forEach(item => {
          item.result = this.handler?.add(item.data, item.options);
        });
      }
    );
  }
  /** 按当前 mapMode 创建对应热力图，并带上当前鼠标监听设置 */
  setByMapMode() {
    const mapMode = mapData().mapMode;
    const option = { ...this.options, mouseLookAt: this.mouseLookAt };
    if (mapMode === "cesium" && viewer && !viewer.isDestroyed?.()) {
      this.handler = new HeatMap2DCesium(viewer, option);
      return;
    }
    if (mapMode === "ol" && olMap) {
      this.handler = new HeatMap2DOl(olMap, option);
    }
  }
  add(data, options) {
    const result = this.handler?.add(data, options);
    this.history.push({ data, options, result });
    return result;
  }
  setMouseLookAt(mouseLookAt) {
    this.mouseLookAt = mouseLookAt;
    this.options.mouseLookAt = mouseLookAt;
    this.handler?.setMouseLookAt(mouseLookAt);
  }
  bindMouse() {
    this.handler?.bindMouse();
  }
  unbindMouse() {
    this.handler?.unbindMouse();
  }
  /** 三维拾取鼠标热力值，二维对象没有这个方法 */
  emitMouseValue(windowPosition) {
    this.handler?.emitMouseValue?.(windowPosition);
  }
  remove(heatMap) {
    const index = this.history.findIndex(
      item => item === heatMap || item.result === heatMap
    );
    if (index < 0) {
      this.handler?.remove(heatMap);
      return;
    }
    const record = this.history[index];
    if (record.result) this.handler?.remove(record.result);
    this.history.splice(index, 1);
  }
  removeAll() {
    this.handler?.removeAll();
    this.history = [];
  }
  destroy() {
    this.mapEmitterOff?.();
    this.mapEmitterOff = null;
    this.handler?.destroy();
    this.handler = null;
    this.history = [];
  }
}
export { HeatMap2D };
