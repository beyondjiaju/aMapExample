import { onBeforeUnmount, watch } from "vue";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import * as olSdk from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";
import { olMap, viewer } from "@/3dMap/global";
import { mapRuntime } from "@/3dMap/components/mapView/creatMap/createMaps";
import { TAG_CENTER, tagSeeds } from "./data";

/** 进入示例即创建标签集合并放入测试标签，离开或切换二三维时注销 */
export function useHtmlTagCollection() {
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
    const Tag = is2d ? olSdk.HtmlTag : cesiumSdk.HtmlTag;
    const host = is2d ? olMap : viewer;
    if (!host || (!is2d && viewer?.isDestroyed?.())) return;
    const collection = is2d
      ? new olSdk.HtmlTagCollection(olMap)
      : new cesiumSdk.HtmlTagCollection(viewer);
    tagSeeds().forEach(seed => {
      const position = is2d
        ? [TAG_CENTER[0] + seed.lonOffset, TAG_CENTER[1]]
        : Cesium.Cartesian3.fromDegrees(TAG_CENTER[0] + seed.lonOffset, TAG_CENTER[1]);
      collection.add(
        new Tag(host, {
          position,
          html: seed.html,
          id: seed.id
        })
      );
    });
    api = collection;
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
