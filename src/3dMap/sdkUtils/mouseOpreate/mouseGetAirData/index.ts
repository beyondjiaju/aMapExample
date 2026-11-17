import mapData from "@/3dMap/store/map";
import { mapEmitter } from "@/3dMap/interface";
import MouseGetAirDataCesium from "./cesium";
import MouseGetAirDataOl from "./ol";
/**监听 */
class MouseGetAirData {
  mouseGetAirDataByMode: any;
  mapEmitterOff: any;
  allEvents: any;
  constructor() {
    this.setMouseGetAirDataByMode();
    this.allEvents = {};
    // 2\3d切换更新
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      () => {
        this.mouseGetAirDataByMode?.destroy();
        this.mouseGetAirDataByMode = null;
        this.setMouseGetAirDataByMode();
        for (let option of Object.values(this.allEvents)) {
          this.addEvent(option);
        }
      }
    );
  }
  setMouseGetAirDataByMode() {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium") {
      this.mouseGetAirDataByMode = new MouseGetAirDataCesium();
    }
    if (mapMode === "ol") {
      this.mouseGetAirDataByMode = new MouseGetAirDataOl();
    }
  }
  /**添加监听
   * @param { String } eventType left_click, right_click, mouse_move
   * @param { Function } callback
   */
  addEvent(option = {}) {
    const defaultOption = Object.assign(
      {
        eventType: "mouse_move",
        callback: null
      },
      option
    );
    if (!defaultOption.eventType || !defaultOption.callback) {
      return;
    }
    this.mouseGetAirDataByMode?.addEvent(defaultOption);
    this.allEvents[defaultOption.eventType] = defaultOption;
  }
  /**根据类型移除监听 */
  removeEventByType(type) {
    this.mouseGetAirDataByMode?.removeEventByType(type);
    if (this.allEvents[type]) {
      delete this.allEvents[type];
    }
  }
  /**移除全部监听 */
  removeAllEvent() {
    this.mouseGetAirDataByMode?.removeAllEvent();
    this.allEvents = {};
  }
  destroy() {
    this.mouseGetAirDataByMode?.destroy();
    this.mouseGetAirDataByMode = null;
    if (this.mapEmitterOff) {
      this.mapEmitterOff();
      this.mapEmitterOff = null;
    }
    this.allEvents = null;
  }
}
export { MouseGetAirData };
