<template>
  <div class="map-stage">
    <div id="cesiumContainer" v-show="!mapStore.mapModeIs2D">
      <div id="map3DCoordinates" />
    </div>
    <div id="olContainer" v-show="mapStore.mapModeIs2D">
      <div id="map2DCoordinates" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import mapData from "@/3dMap/store/map";
import { createMaps } from "@/map/createMaps";

const mapStore = mapData();

onMounted(() => {
  // 两侧地图都创建，切换时只改可见性与相机，工具实例由示例页自行注销重建
  createMaps();
});
</script>

<style scoped lang="scss">
.map-stage {
  position: absolute;
  inset: 0;
  background: #02060d;
}

#cesiumContainer,
#olContainer {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

#map3DCoordinates,
#map2DCoordinates {
  position: absolute;
  right: 360px;
  bottom: 8px;
  z-index: 5;
}

:deep(.ol-zoom),
:deep(.ol-rotate),
:deep(.cesium-viewer-bottom) {
  display: none;
}
</style>
