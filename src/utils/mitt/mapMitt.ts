import type { Emitter } from "mitt";
import mitt from "mitt";

type mapEventsName = `mapEvents:${string}` | `domEvents:${string}`;

/** 只给地图和界面之间传数据，事件名限定为 mapEvents / domEvents */
type Events = {
  [key: mapEventsName]: any;
};

interface MyEmitter extends Emitter<Events> {
  offAll?: () => void;
  on: any;
}

export const emitter: MyEmitter = mitt<Events>();

const oriOn = emitter.on;
// on 返回卸载函数，地图监听在组件卸载时直接调用即可
emitter.on = (type, handler) => {
  oriOn.call(emitter, type, handler);
  return () => {
    emitter.off(type, handler);
  };
};

emitter.offAll = () => {
  const events = [...emitter.all.keys()];
  events.forEach((item: mapEventsName) => {
    emitter.off(item);
  });
};
