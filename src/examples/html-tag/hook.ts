import { onBeforeUnmount, watch } from "vue";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import * as olSdk from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";
import { olMap, viewer } from "@/3dMap/global";
import { mapRuntime } from "@/3dMap/components/mapView/creatMap/createMaps";
import { TAG_CENTER, TAG_HTML, TAG_ID } from "./data";

/** 进入示例即创建单个 HTML 标签，离开或切换二三维时注销 */
export function useHtmlTag() {
  const mapStore = mapData();
  let api: { destroy: () => void } | null = null;
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
      api = new olSdk.HtmlTag(olMap, {
        position: TAG_CENTER,
        html: TAG_HTML,
        id: TAG_ID,
        noEvent: false,
        isDrag: true
      });
      return;
    }
    if (!viewer || viewer.isDestroyed?.()) return;
    api = new cesiumSdk.HtmlTag(viewer, {
      position: Cesium.Cartesian3.fromDegrees(TAG_CENTER[0], TAG_CENTER[1]),
      html: TAG_HTML,
      id: TAG_ID,
      noEvent: false,
      isDrag: true
    });
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
