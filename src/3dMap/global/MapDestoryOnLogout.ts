import mapDestory from "./MapDestory";
import mapData from "@/3dMap/store/map";
import { removeMapEvents } from "./MapEventsRegistry";

/** 地图容器卸载时先摘掉事件，再复位状态并销毁实例 */
export default () => {
  removeMapEvents();
  mapData().logOut();
  // 等仍挂在容器上的工具先完成卸载，再销毁 viewer / olMap
  setTimeout(() => {
    mapDestory();
  });
};
