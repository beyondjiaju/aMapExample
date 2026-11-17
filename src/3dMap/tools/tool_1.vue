<template>
  <!-- 地图通用工具条，默认放二三维切换 -->
  <div class="map-tool-bar">
    <SwitchMode />
    <OverView />
    <NavigationCustom />
  </div>
</template>

<script setup lang="ts">
import SwitchMode from "@/3dMap/tools/switchMode/index.vue";
import OverView from "@/3dMap/tools/overView/index.vue";
import NavigationCustom from "@/3dMap/tools/navigationCustom/index.vue";
</script>

<style scoped lang="scss">
.map-tool-bar {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
</style>
