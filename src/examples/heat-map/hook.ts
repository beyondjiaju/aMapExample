import { onBeforeUnmount, watch } from "vue";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import * as olSdk from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";
import { olMap, viewer } from "@/3dMap/global";
import { mapRuntime } from "@/3dMap/components/mapView/creatMap/createMaps";
import { HEAT_STYLE, heatData } from "./data";

/** 进入示例即用测试数据铺一层热力，离开或切换二三维时注销 */
export function useHeatMap() {
  const mapStore = mapData();
  let api: { add: (data: unknown, style: typeof HEAT_STYLE) => void; destroy: () => void } | null = null;
  let token = 0;

  function dispose() {
    api?.destroy();
    api = null;
  }

  function mount() {
    const runToken = ++token;
    dispose();
    if (!mapRuntime.ready || runToken !== token) return;
    const is2d = mapStore.mapModeIs2D;
    if (is2d) {
      if (!olMap) return;
      api = new olSdk.HeatMap2D(olMap);
    } else {
      if (!viewer || viewer.isDestroyed?.()) return;
      api = new cesiumSdk.HeatMap2D(viewer);
    }
    api.add(heatData(), HEAT_STYLE);
  }

  watch(
    () => [mapStore.mapModeIs2D, mapRuntime.ready] as const,
    () => mount(),
    { immediate: true }
  );

  onBeforeUnmount(() => {
    token += 1;
    dispose();
  });
}
