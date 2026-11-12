import { defineStore } from "pinia";
import { store } from "@/store";

/**
 * 与 hatc-xt-front-core 地图仓库对齐的最小状态。
 * SDK 内 locateToCoordinates 通过 mapMode 判断当前是 cesium 还是 ol。
 */
export const useMapStore = defineStore({
  id: "pure-map",
  state: () => ({
    mapModeIs2D: false
  }),
  getters: {
    mapMode(): "ol" | "cesium" {
      return this.mapModeIs2D ? "ol" : "cesium";
    }
  }
});

export default function mapData() {
  return useMapStore(store);
}
