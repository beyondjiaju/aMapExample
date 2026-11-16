import { onBeforeUnmount, ref, watch } from "vue";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import * as olSdk from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";
import { flyToHome, olMap, viewer } from "@/3dMap/global";
import { mapRuntime } from "@/3dMap/components/mapView/creatMap/createMaps";
import { createTagPoints } from "./data";

type TagCollection = {
  setVisible: (state: boolean) => void;
  setDrag: (state: boolean) => void;
  setCollision: (state: boolean) => void;
  setDragLine: (option: { color?: string; width?: number }) => void;
  destroy: () => void;
};

/** 进入示例即创建标签集合，并把随机点位全部加入集合 */
export function useHtmlTag() {
  const mapStore = mapData();
  const visible = ref(true);
  const drag = ref(false);
  const collision = ref(true);
  const lineColor = ref("#ff0000");
  const lineWidth = ref(1.5);
  let api: TagCollection | null = null;
  let token = 0;

  function dispose() {
    api?.destroy();
    api = null;
  }

  /** 按当前勾选和拖动线设置，同步到已加载的集合 */
  function syncControls() {
    if (!api) return;
    api.setVisible(visible.value);
    api.setDrag(drag.value);
    api.setCollision(collision.value);
    api.setDragLine({ color: lineColor.value, width: Number(lineWidth.value) });
  }

  function mount() {
    const runToken = ++token;
    dispose();
    if (!mapRuntime.ready || runToken !== token) return;
    const is2d = mapStore.mapModeIs2D;
    const host = is2d ? olMap : viewer;
    if (!host || (!is2d && viewer?.isDestroyed?.())) return;
    const Tag = is2d ? olSdk.HtmlTag : cesiumSdk.HtmlTag;
    const collection: TagCollection & { add: (tag: unknown) => void } = is2d
      ? new olSdk.HtmlTagCollection(olMap)
      : new cesiumSdk.HtmlTagCollection(viewer);
    createTagPoints().forEach(point => {
      const position = is2d
        ? [point.lon, point.lat]
        : Cesium.Cartesian3.fromDegrees(point.lon, point.lat);
      collection.add(
        new Tag(host, {
          position,
          html: point.html,
          id: point.id
        })
      );
    });
    api = collection;
    syncControls();
    // 示例数据就绪后回到配置的初始视野
    flyToHome();
  }

  function applyVisible() {
    api?.setVisible(visible.value);
  }

  function applyDrag() {
    api?.setDrag(drag.value);
  }

  function applyCollision() {
    api?.setCollision(collision.value);
  }

  function applyDragLine() {
    const width = Number(lineWidth.value);
    if (!Number.isFinite(width)) return;
    api?.setDragLine({ color: lineColor.value, width });
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

  return {
    visible,
    drag,
    collision,
    lineColor,
    lineWidth,
    applyVisible,
    applyDrag,
    applyCollision,
    applyDragLine
  };
}
