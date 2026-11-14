import { nextTick, onBeforeUnmount, onMounted } from "vue";
import { mapEmitter } from "@/3dMap/interface";
import { olMap, viewer } from "@/3dMap/global";
import mapData from "@/3dMap/store/map";

/** 容器挪进页面后画布可能仍是 0 尺寸，补一次刷新 */
const resizeMountedMap = () => {
  viewer?.resize?.();
  olMap?.updateSize?.();
};

/** 显示或隐藏已创建的地图容器 */
const set3dMap = (mapVisible: boolean) => {
  mapData().setMapVisible(mapVisible);
  mapEmitter.emit("mapEvents:changeMap", {
    mapVisible
  });
};

export const showMap = () => {
  set3dMap(true);
};

export const hideMap = () => {
  set3dMap(false);
};

/** 把地图容器挪进当前组件，从而在引用处挂载地图 */
export const insetMapToDom = (
  domRef,
  slotDomRef,
  mapContainerId = "mapContainer"
) => {
  const mapContainer = document.getElementById(mapContainerId);
  if (!domRef.value) {
    console.error("inset domRef no find");
    return;
  }
  if (!mapContainer) {
    console.error("mapContainer no find");
    return;
  }
  nextTick(() => {
    domRef.value.appendChild(mapContainer);
    mapContainer.appendChild(slotDomRef.value);
    showMap();
    requestAnimationFrame(() => resizeMountedMap());
  });
};

/** 卸载时把地图容器放回隐藏宿主，避免销毁实例 */
export const removeMapByDom = (
  domRef,
  slotDomRef,
  mapContainerId = "mapContainer",
  treeMapContainerId = "treeMapContainer"
) => {
  const mapContainer = document.getElementById(mapContainerId);
  if (!domRef.value) {
    console.error("remove domRef no find");
    return;
  }
  if (!mapContainer) {
    console.error("mapContainer no find");
    return;
  }
  hideMap();
  if (slotDomRef.value?.parentNode === mapContainer) {
    mapContainer.removeChild(slotDomRef.value);
  }
  if (mapContainer.parentNode === domRef.value) {
    domRef.value.removeChild(mapContainer);
  }
  document.getElementById(treeMapContainerId)?.appendChild(mapContainer);
};

/** 在组件挂载周期内自动挂上、卸下地图 */
export default function (
  domRef,
  slotDomRef,
  mapContainerId = "mapContainer",
  treeMapContainerId = "treeMapContainer"
) {
  onMounted(() => {
    insetMapToDom(domRef, slotDomRef, mapContainerId);
  });
  onBeforeUnmount(() => {
    removeMapByDom(domRef, slotDomRef, mapContainerId, treeMapContainerId);
  });
}
