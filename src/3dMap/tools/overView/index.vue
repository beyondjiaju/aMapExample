<template>
  <TechButton :active="active" @click="toggle">鹰眼</TechButton>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import TechButton from "@/3dMap/components/techButton/index.vue";
import mapData from "@/3dMap/store/map";
import { olMap, viewer } from "@/3dMap/global";
import { OverViewMap as CesiumOverViewMap } from "@/3dMap/sdk/cesiumUtils";
import { OverViewMap as OlOverViewMap } from "@/3dMap/sdk/olUtils";

const mapStore = mapData();
const active = ref(false);
let overview: { destroy?: () => void } | null = null;

const overviewOption = {
  width: 220,
  height: 140,
  right: 12,
  bottom: 25,
  left: "none",
  top: "none",
  show: true
};

function destroyOverview() {
  overview?.destroy?.();
  overview = null;
}

/** 按当前二三维创建鹰眼，选中时才挂上 */
function openOverview() {
  destroyOverview();
  if (mapStore.mapModeIs2D) {
    if (!olMap) return;
    overview = new OlOverViewMap({ map: olMap, ...overviewOption });
    return;
  }
  if (!viewer) return;
  overview = new CesiumOverViewMap({ viewer, ...overviewOption });
}

function toggle() {
  active.value = !active.value;
  if (active.value) openOverview();
  else destroyOverview();
}

// 切换二三维后容器才显示，选中状态要按新模式重建鹰眼
watch(
  () => mapStore.mapModeIs2D,
  () => {
    if (!active.value) return;
    nextTick(() => openOverview());
  }
);

onBeforeUnmount(() => destroyOverview());
</script>
