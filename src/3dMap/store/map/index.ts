import { defineStore } from "pinia";
import { store } from "@/store";
import { emitSdkUtilsMapModeChange } from "./actions/emitSdkUtilsMapModeChange";

/**
 * 与 hatc-xt-front-core 地图仓库对齐的最小状态。
 * SDK 内 locateToCoordinates 通过 mapMode 判断当前是 cesium 还是 ol。
 */
export const useMapStore = defineStore({
  id: "pure-map",
  state: () => ({
    mapModeIs2D: false,
    /** 地图是否显示。由 mapView 挂载后打开 */
    mapVisible: false,
    /** 地图容器附加样式 */
    mapViewStyle: "",
    /** 坐标等工具条的行内样式 */
    mapToolStyle: {
      top: "",
      bottom: "",
      coordinate: "",
      weather3dLegend: ""
    }
  }),
  getters: {
    mapMode(): "ol" | "cesium" {
      return this.mapModeIs2D ? "ol" : "cesium";
    }
  },
  actions: {
    emitSdkUtilsMapModeChange,
    /** 切换地图显隐 */
    setMapVisible(state: boolean) {
      this.mapVisible = state;
    },
    /** 容器卸载时只复位显隐，不改当前二三维模式 */
    logOut() {
      this.mapVisible = false;
      this.mapViewStyle = "";
      this.mapToolStyle = {
        top: "",
        bottom: "",
        coordinate: "",
        weather3dLegend: ""
      };
    }
  }
});

const mapStore = useMapStore(store);
let prevMapModeIs2D = mapStore.mapModeIs2D;
// mapMode 一变就执行上面的统一通知
mapStore.$subscribe((_mutation, state) => {
  if (state.mapModeIs2D === prevMapModeIs2D) return;
  prevMapModeIs2D = state.mapModeIs2D;
  mapStore.emitSdkUtilsMapModeChange();
});

export default function mapData() {
  return useMapStore(store);
}
