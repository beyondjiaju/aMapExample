import { mapEmitter } from "@/3dMap/interface";
import { olMap } from "@/3dMap/global";
class MouseGetAirDataOl {
  eventsData: any;
  eventTypeData: any;
  constructor() {
    this.eventsData = {};
    this.eventTypeData = {
      left_click: "click",
      right_click: "contextmenu",
      mouse_move: "pointermove"
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
    if (this.eventsData[eventTypeKey]) {
      this.removeEventByType(eventTypeKey);
    }
    this.eventsData[eventTypeKey] = {
      ...other,
      eventType: eventTypeNew,
      mapDomMouseoutEvent: null,
      eventFunction: evt => {
        const pickArr = olMap.getFeaturesAtPixel(evt.pixel) || [];
        let pickProperties = {};
        pickArr.forEach(feature => {
          if (!feature) return;
          const properties = feature.get("properties");
          if (!properties) return;
          if (pickProperties[properties.id]) return;
          pickProperties[properties.id] = properties;
        });
        if (option.callback) {
          option.callback(pickProperties);
        }
      }
    };
    olMap.addEventListener(
      eventTypeNew,
      this.eventsData[eventTypeKey].eventFunction
    );
    // move 添加移动到map外部监听
    if (eventTypeKey == "mouse_move") {
      this.eventsData[eventTypeKey].mapDomMouseoutEvent = () => {
        option.callback();
      };
      olMap
        .getTargetElement()
        .addEventListener(
          "mouseout",
          this.eventsData[eventTypeKey].mapDomMouseoutEvent
        );
    }
  }
  removeEventByType(type) {
    const currentEvent = this.eventsData[type];
    olMap.removeEventListener(
      currentEvent.eventType,
      currentEvent.eventFunction
    );
    if (currentEvent.mapDomMouseoutEvent) {
      olMap
        .getTargetElement()
        .removeEventListener("mouseout", currentEvent.mapDomMouseoutEvent);
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
  }
}
export default MouseGetAirDataOl;
