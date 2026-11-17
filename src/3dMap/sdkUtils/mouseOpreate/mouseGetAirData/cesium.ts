import { mapEmitter } from "@/3dMap/interface";
import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer } from "@/3dMap/global";
class MouseGetAirDataCesium {
  handler: any;
  eventsData: any;
  eventTypeData: any;
  constructor() {
    this.handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    this.eventsData = {};
    this.eventTypeData = {
      left_click: Cesium.ScreenSpaceEventType.LEFT_CLICK,
      right_click: Cesium.ScreenSpaceEventType.RIGHT_CLICK,
      mouse_move: Cesium.ScreenSpaceEventType.MOUSE_MOVE
    };
  }
  /**添加监听
   * @param { String } eventType
   * @param { Function } callback
   */
  addEvent(
    option = {
      eventType: "mouse_move",
      callback: null
    }
  ) {
    const { eventType, ...other } = option;
    const eventTypeKey = eventType;
    const eventTypeNew = this.eventTypeData[eventType];
    const newOption = {
      ...other,
      eventType: eventTypeNew,
      mapDomMouseoutEvent: null
    };
    if (this.eventsData[eventTypeKey]) {
      this.removeEventByType(eventTypeKey);
    }
    this.handler.setInputAction(m => {
      const position =
        eventTypeNew === Cesium.ScreenSpaceEventType.MOUSE_MOVE
          ? m.endPosition
          : m.position;
      const pickArr = viewer.scene.drillPick(position);
      let pickProperties = {};
      pickArr.forEach(pick => {
        if (Cesium.defined(pick)) {
          const entity = Cesium.defaultValue(pick.id, pick.primitive.id);
          if (entity instanceof Cesium.Entity && entity.properties) {
            const properties = entity.properties.getValue(
              viewer.clock.currentTime
            );
            if (pickProperties[properties.id]) return;
            pickProperties[properties.id] = properties;
          }
        }
      });
      if (newOption.callback) {
        newOption.callback(pickProperties);
      }
    }, eventTypeNew);
    // 记录全部事件
    this.eventsData[eventTypeKey] = newOption;
    // move 添加移动到map外部监听
    if (eventTypeKey == "mouse_move") {
      this.eventsData[eventTypeKey].mapDomMouseoutEvent = () => {
        newOption.callback();
      };
      viewer.scene.canvas.addEventListener(
        "mouseout",
        this.eventsData[eventTypeKey].mapDomMouseoutEvent
      );
    }
  }
  removeEventByType(type) {
    const currentEvent = this.eventsData[type];
    this.handler?.removeInputAction(currentEvent.eventType);
    if (currentEvent.mapDomMouseoutEvent) {
      viewer.scene.canvas.removeEventListener(
        "mouseout",
        currentEvent.mapDomMouseoutEvent
      );
    }
    delete this.eventsData[type];
  }
  removeAllEvent() {
    for (let type in this.eventsData) {
      this.removeEventByType(type);
    }
    this.eventsData = {};
  }
  destroy() {
    this.removeAllEvent();
    this.handler?.destroy();
  }
}
export default MouseGetAirDataCesium;
