import { onBeforeUnmount, ref, watch } from "vue";
import { flyToHome } from "@/3dMap/global";
import { mapRuntime } from "@/3dMap/components/mapView/creatMap/createMaps";
import { HtmlTagCollection } from "@/3dMap/sdkUtils/htmlTag";
import { createTagPoints } from "./data";

/** 进入示例即创建通用标牌集合，二三维切换由集合内部处理 */
export function useHtmlTag() {
  const visible = ref(true);
  const drag = ref(false);
  const collision = ref(true);
  const lineColor = ref("#ff0000");
  const lineWidth = ref(1.5);
  let api: HtmlTagCollection | null = null;

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
    if (!mapRuntime.ready || api) return;
    api = new HtmlTagCollection();
    createTagPoints().forEach(point => {
      api?.add({
        position: [point.lon, point.lat],
        html: point.html,
        id: point.id
      });
    });
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
    () => mapRuntime.ready,
    () => mount(),
    { immediate: true }
  );

  onBeforeUnmount(() => {
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
