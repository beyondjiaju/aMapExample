import { mapEmitter } from "@/3dMap/interface";
import mapData from "@/3dMap/store/map";

/** 已注册的地图事件卸载函数 */
let mapEmitterOffs: Array<() => void> = [];

/** 注册地图显隐。重复调用会先清掉上一轮监听 */
export const setMapEmitterEvents = () => {
  removeMapEvents();
  const offVisible = mapEmitter.on("mapEvents:changeMap", (result: { mapVisible?: boolean } = {}) => {
    mapData().setMapVisible(!!result.mapVisible);
  });
  mapEmitterOffs.push(offVisible);
};

/** 移除已注册的地图事件 */
export const removeMapEvents = () => {
  mapEmitterOffs.forEach(off => {
    try {
      off?.();
    } catch (e) {
      console.warn("移除地图事件失败:", e);
    }
  });
  mapEmitterOffs = [];
};
