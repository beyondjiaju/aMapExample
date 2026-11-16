<template>
  <div class="example-op" />
</template>

<script setup lang="ts">
import { useHeatMap } from "./hook";

// 面板按钮下一步再配，加载时直接铺测试热力
useHeatMap();
</script>

<style scoped lang="scss">
.example-op {
  flex: 1;
  min-height: 0;
}
</style>
