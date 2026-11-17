import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { navigation } from "@/3dMap/sdk/cesiumUtils";
import { flyToHome, olMap, viewer } from "@/3dMap/global";
import { mapEmitter } from "@/3dMap/interface";
import mapData from "@/3dMap/store/map";
import { mapRuntime } from "@/3dMap/components/mapView/creatMap/createMaps";

/** 二三维共用组件内的指北针，旋转角分别取相机航向和二维视图旋转 */
export function useNavigationCustom() {
  const mapStore = mapData();
  const heading = ref(0);
  const rotation = ref(0);
  let unbindRotation: (() => void) | null = null;
  let removeHeading: (() => void) | null = null;

  const angle = computed(() =>
    mapStore.mapModeIs2D ? rotation.value : -heading.value
  );

  /** 距离图例仍由三维导航创建，默认罗盘改由组件绘制，这里只隐藏原罗盘 */
  function hideCesiumCompass() {
    if (!viewer || viewer.isDestroyed?.()) return;
    if (!document.querySelector(".compass")) navigation(viewer);
    const compass = document.querySelector<HTMLElement>(".compass");
    if (compass) compass.style.display = "none";
  }

  /** 三维航向变化时更新指北针 */
  function bindCesiumHeading() {
    if (removeHeading || !viewer || viewer.isDestroyed?.()) return;
    const update = () => {
      heading.value = viewer.camera?.heading || 0;
    };
    removeHeading = viewer.scene.postRender.addEventListener(update);
    update();
  }

  /** 二维旋转角变化时更新指北针 */
  function bindOlRotation() {
    unbindRotation?.();
    unbindRotation = null;
    const view = olMap?.getView?.();
    if (!view) return;
    const update = () => {
      rotation.value = view.getRotation?.() || 0;
    };
    view.on("change:rotation", update);
    update();
    unbindRotation = () => view.un("change:rotation", update);
  }

  /** 回到初始位置，二维三维都走同一套 homeData */
  function resetNorth() {
    flyToHome();
  }

  function sync() {
    if (!mapRuntime.ready) return;
    hideCesiumCompass();
    bindCesiumHeading();
    bindOlRotation();
  }

  let offMapInit: (() => void) | null = null;

  onMounted(() => {
    // ready 不是响应式字段，地图加载完成走事件；已完成时直接挂上
    sync();
    offMapInit = mapEmitter.on("domEvents:mapViewerInit", sync);
  });

  onBeforeUnmount(() => {
    offMapInit?.();
    unbindRotation?.();
    removeHeading?.();
  });

  return { angle, resetNorth };
}
