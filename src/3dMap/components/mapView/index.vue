<template>
  <div class="map-view" ref="cesiumContainerTarget">
    <div class="map-content-box" ref="cesiumContainerAddContent">
      <slot name="content" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import { insetMapToDom, removeMapByDom } from "./operateMapDom";
import { mapEmitter } from "@/3dMap/interface";

const cesiumContainerTarget = ref();
const cesiumContainerAddContent = ref();

onMounted(() => {
  // 引用本组件时，把已初始化的地图挂到当前节点
  insetMapToDom(cesiumContainerTarget, cesiumContainerAddContent);
  setTimeout(() => {
    mapEmitter.emit("domEvents:isMapViewerInit_component");
  });
});
onBeforeUnmount(() => {
  removeMapByDom(cesiumContainerTarget, cesiumContainerAddContent);
});
</script>
<style lang="scss" scoped>
.map-view {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
