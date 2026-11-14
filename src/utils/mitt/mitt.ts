import type { Emitter } from "mitt";
import mitt from "mitt";

/** 非地图控制的全局事件。地图显隐、模式等请走 mapMitt */
type Events = {
  [key: string]: any;
};

interface MyEmitter extends Emitter<Events> {
  offAll?: () => void;
  on: any;
}

export const emitter: MyEmitter = mitt<Events>();

const oriOn = emitter.on;
// on 返回卸载函数，调用方不用再单独记 handler
emitter.on = (type, handler): Function => {
  oriOn.call(emitter, type, handler);
  return () => {
    emitter.off(type, handler);
  };
};

emitter.offAll = () => {
  const events = [...emitter.all.keys()];
  events.forEach(item => {
    emitter.off(item);
  });
};
