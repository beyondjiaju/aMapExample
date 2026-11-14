import { viewer, olMap, resetMapGlobals } from "./utils/MapState";

/** 清空图形并销毁二三维实例，再清除全局记录 */
export default () => {
  if (viewer) {
    try {
      viewer.entities?.removeAll();
      viewer.dataSources?.removeAll();
      if (typeof viewer.isDestroyed === "function") {
        if (!viewer.isDestroyed()) viewer.destroy();
      } else {
        viewer.destroy();
      }
    } catch (e) {
      console.warn("销毁 viewer 失败:", e);
    }
  }

  if (olMap) {
    try {
      olMap.getLayers()?.clear();
      olMap.setTarget(undefined);
    } catch (e) {
      console.warn("清理 olMap 失败:", e);
    }
  }

  resetMapGlobals();
};
