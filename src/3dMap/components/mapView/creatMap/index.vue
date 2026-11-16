<template>
  <div
    id="mapContainer"
    :style="mapStore.mapViewStyle"
    v-show="mapStore.mapVisible"
  >
    <!-- 三维容器 -->
    <div id="cesiumContainer" v-show="!mapStore.mapModeIs2D">
      <div id="map3DCoordinates" :style="mapStore.mapToolStyle.coordinate" />
    </div>
    <!-- 二维容器 -->
    <div id="olContainer" v-show="mapStore.mapModeIs2D">
      <div id="map2DCoordinates" :style="mapStore.mapToolStyle.coordinate" />
    </div>
    <!-- 默认地图上的通用工具按钮 -->
    <Tool1 class="map-common-tools" />
  </div>
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, watch } from "vue";
import { mapEmitter } from "@/3dMap/interface";
import mapDestoryOnLogout from "@/3dMap/global/MapDestoryOnLogout";
import { setMapEmitterEvents } from "@/3dMap/global/MapEventsRegistry";
import mapData from "@/3dMap/store/map";
import Tool1 from "@/3dMap/tool/tool_1.vue";
import hook from "./hook";

const mapStore = mapData();
const { viewerIsLoad, olIsLoad, getMapConfig } = hook();
let mapViewerInit = false;

/** 二三维都就绪后发一次加载完成通知 */
watch([viewerIsLoad, olIsLoad], ([viewerReady, olReady]) => {
  if (!viewerReady || !olReady || mapViewerInit) return;
  setMapEmitterEvents();
  mapEmitter.emit("domEvents:mapViewerInit");
  mapViewerInit = true;
});

onMounted(() => {
  // 先挂上显隐监听，再创建地图，避免 mapView 挂载时事件丢失
  setMapEmitterEvents();
  getMapConfig();
});
onUnmounted(() => {
  mapDestoryOnLogout();
  mapViewerInit = false;
});
</script>
<style scoped lang="scss">
#mapContainer {
  position: absolute;
  inset: 0;
  margin: 0;
  overflow: hidden;
  color: #fff;
  background: #000;
  #cesiumContainer,
  #olContainer {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }
}
.map-common-tools {
  position: absolute;
  top: 12px;
  /* 方法面板已改到地图左侧，工具回到地图右上角 */
  right: 12px;
  z-index: 6;
}
#map3DCoordinates,
#map2DCoordinates {
  position: absolute;
  right: 12px;
  bottom: 8px;
  z-index: 5;
}
:deep(.ol-zoom),
:deep(.ol-rotate),
:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
