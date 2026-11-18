<template>
  <div class="path-play">
    <div class="path-play__bar">
      <el-button size="small" type="primary" :disabled="rows.length < 2" @click="togglePlay">
        {{ status === "play" ? "暂停" : "播放" }}
      </el-button>
      <el-button size="small" @click="stop">停止</el-button>
      <el-button size="small" @click="addByCurrentView">新增</el-button>
      <el-button size="small" :disabled="!rows.length" @click="clearRows">清空</el-button>
    </div>
    <div ref="tableBox" class="path-play__table">
      <el-table
        :data="rows"
        size="small"
        :height="tableHeight"
        empty-text="暂无路径点"
        highlight-current-row
        @row-click="locateRow"
      >
        <el-table-column label="经度" min-width="108">
          <template #default="{ row }">
            <div class="path-play__field" @click.stop>
              <el-input-number v-model="row.lon" size="small" :min="-180" :max="180" :step="0.000001" :precision="6" :controls="false" @change="commitRow(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="纬度" min-width="108">
          <template #default="{ row }">
            <div class="path-play__field" @click.stop>
              <el-input-number v-model="row.lat" size="small" :min="-90" :max="90" :step="0.000001" :precision="6" :controls="false" @change="commitRow(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="高度" min-width="88">
          <template #default="{ row }">
            <div class="path-play__field" @click.stop>
              <el-input-number v-model="row.height" size="small" :step="100" :precision="1" :controls="false" @change="commitRow(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="航向角" min-width="88">
          <template #default="{ row }">
            <div class="path-play__field" @click.stop>
              <el-input-number v-model="row.heading" size="small" :min="-360" :max="360" :step="1" :precision="1" :controls="false" @change="commitRow(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="旋转角" min-width="88">
          <template #default="{ row }">
            <div class="path-play__field" @click.stop>
              <el-input-number v-model="row.pitch" size="small" :min="-90" :max="90" :step="1" :precision="1" :controls="false" @change="commitRow(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="翻滚角" min-width="88">
          <template #default="{ row }">
            <div class="path-play__field" @click.stop>
              <el-input-number v-model="row.roll" size="small" :min="-180" :max="180" :step="1" :precision="1" :controls="false" @change="commitRow(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="速度" min-width="80">
          <template #default="{ row }">
            <div class="path-play__field" @click.stop>
              <el-input-number v-model="row.speed" size="small" :min="1" :step="10" :precision="0" :controls="false" @change="commitRow(row)" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="64" fixed="right">
          <template #default="{ $index }">
            <div class="path-play__ops" @click.stop>
              <el-button link type="danger" @click="removeRow($index)">删</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useAnimationPath } from "./hook";

const { rows, status, togglePlay, stop, locateRow, addByCurrentView, commitRow, removeRow, clearRows } = useAnimationPath();
const tableBox = ref<HTMLElement | null>(null);
const tableHeight = ref(180);
let tableObserver: ResizeObserver | null = null;

onMounted(() => {
  const box = tableBox.value;
  if (!box) return;
  // 按钮固定在顶部后，表格高度跟剩余区域走，滚动发生在表格内部
  const update = () => {
    tableHeight.value = box.clientHeight;
  };
  update();
  tableObserver = new ResizeObserver(update);
  tableObserver.observe(box);
});

onBeforeUnmount(() => tableObserver?.disconnect());
</script>

<style scoped lang="scss">
.path-play {
  /* 面板顶栏 36、内边距与外边距合计约 84，剩下的高度留给本组件 */
  height: calc(100vh - 84px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.path-play__bar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.path-play__table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.path-play__field {
  width: 100%;
}

.path-play__ops {
  display: flex;
  align-items: center;
}

.path-play :deep(.el-input-number) {
  width: 100%;
}

.path-play :deep(.el-input__wrapper) {
  padding-left: 6px;
  padding-right: 6px;
}

.path-play :deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: transparent;
  --el-table-text-color: var(--color-font);
  --el-table-header-text-color: var(--color-font);
  --el-table-border-color: var(--color-border-4);
  --el-table-row-hover-bg-color: color-mix(in srgb, var(--color-state-blue) 18%, transparent);
  --el-table-current-row-bg-color: color-mix(in srgb, var(--color-state-blue) 24%, transparent);
  background: transparent;
  color: var(--color-font);
}

.path-play :deep(.el-table th.el-table__cell),
.path-play :deep(.el-table tr) {
  background: transparent;
}

.path-play :deep(td.el-table-fixed-column--right),
.path-play :deep(th.el-table-fixed-column--right) {
  background: var(--color-bg-panel);
}

.path-play :deep(.el-table .cell) {
  padding: 0 4px;
}

.path-play :deep(.el-table__row) {
  cursor: pointer;
}

.path-play :deep(.el-table__empty-text),
.path-play :deep(.el-table__body-wrapper) {
  color: var(--color-font);
}
</style>
