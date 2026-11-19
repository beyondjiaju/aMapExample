<template>
  <div class="animation-path">
    <PathToolbar
      :ready="ready"
      :playing="playing"
      :can-clear="rows.length > 0"
      :can-play="playing || rows.length >= 2"
      @add="addPoint"
      @clear="clearPoints"
      @toggle="togglePlay"
      @stop="stopPlay"
    />
    <PathPointTable
      :rows="rows"
      :current-index="currentIndex"
      @select="currentIndex = $event"
      @change="updatePoint"
      @remove="removePoint"
    />
  </div>
</template>

<script setup lang="ts">
import PathPointTable from "./components/PathPointTable.vue";
import PathToolbar from "./components/PathToolbar.vue";
import { useAnimationPath } from "./hook";

const {
  rows,
  currentIndex,
  playing,
  ready,
  addPoint,
  removePoint,
  clearPoints,
  togglePlay,
  stopPlay,
  updatePoint
} = useAnimationPath();
</script>

<style scoped lang="scss">
.animation-path {
  display: flex;
  flex-direction: column;
  /* 扣掉地图面板标题和内边距，按钮留在表格上方，高度交给表格内部滚动 */
  height: calc(100vh - 96px);
  min-height: 0;
  overflow: hidden;
}
</style>
