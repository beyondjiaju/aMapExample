<template>
  <div class="example-op" />
</template>

<script setup lang="ts">
import { useHtmlTagCollection } from "./hook";

// 面板按钮下一步再配，加载时直接回显两个测试标签
useHtmlTagCollection();
</script>

<style scoped lang="scss">
.example-op {
  flex: 1;
  min-height: 0;
}
</style>
