<template>
  <!-- 地图在隐藏宿主里初始化，页面通过 mapView 挂载 -->
  <div id="treeMapContainer" class="tree-map-host">
    <ThreeMap />
  </div>
  <!-- 地图初始化完成后再展示路由界面，MapView 由使用地图的页面自己引入 -->
  <router-view v-if="mapReady" />
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import ThreeMap from "@/3dMap/components/mapView/creatMap/index.vue";
import { emitter as mapEmitter } from "@/utils/mitt/mapMitt";

const mapReady = ref(false);
// 收到地图初始化结束再挂载路由，避免页面抢在底图之前出来
const offMapInit = mapEmitter.on("domEvents:mapViewerInit", () => {
  mapReady.value = true;
});

onBeforeUnmount(() => {
  offMapInit?.();
});
</script>

<style scoped>
.tree-map-host {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}
</style>
