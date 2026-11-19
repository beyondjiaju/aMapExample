<template>
  <div ref="wrapRef" class="path-point-table">
    <el-table
      ref="tableRef"
      :data="rows"
      :height="tableHeight"
      highlight-current-row
      empty-text="暂无节点，调整视角后点添加"
      @current-change="onCurrentChange"
    >
      <el-table-column type="index" label="#" width="48" align="center" />
      <el-table-column label="经度" min-width="124">
        <template #default="{ row, $index }">
          <el-input-number
            v-model="row.lon"
            :step="0.000001"
            :controls="false"
            @change="emit('change', $index)"
          />
        </template>
      </el-table-column>
      <el-table-column label="纬度" min-width="124">
        <template #default="{ row, $index }">
          <el-input-number
            v-model="row.lat"
            :step="0.000001"
            :controls="false"
            @change="emit('change', $index)"
          />
        </template>
      </el-table-column>
      <el-table-column label="高度" min-width="108">
        <template #default="{ row, $index }">
          <el-input-number v-model="row.height" :step="10" :controls="false" @change="emit('change', $index)" />
        </template>
      </el-table-column>
      <el-table-column label="航向" min-width="96">
        <template #default="{ row, $index }">
          <el-input-number v-model="row.heading" :step="1" :controls="false" @change="emit('change', $index)" />
        </template>
      </el-table-column>
      <el-table-column label="俯仰" min-width="96">
        <template #default="{ row, $index }">
          <el-input-number v-model="row.pitch" :step="1" :controls="false" @change="emit('change', $index)" />
        </template>
      </el-table-column>
      <el-table-column label="横滚" min-width="96">
        <template #default="{ row, $index }">
          <el-input-number v-model="row.roll" :step="1" :controls="false" @change="emit('change', $index)" />
        </template>
      </el-table-column>
      <el-table-column label="duration" min-width="100">
        <template #default="{ row, $index }">
          <el-input-number
            v-model="row.duration"
            :min="0"
            :step="1"
            :controls="false"
            @change="emit('change', $index)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="72" align="center" fixed="right">
        <template #default="{ $index }">
          <el-button type="danger" link @click="emit('remove', $index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { PathPointRow } from "../hook";

const props = defineProps<{
  rows: PathPointRow[];
  currentIndex: number | null;
}>();

const emit = defineEmits<{
  select: [index: number | null];
  change: [index: number];
  remove: [index: number];
}>();

const wrapRef = ref<HTMLElement | null>(null);
const tableRef = ref();
const tableHeight = ref(280);
let observer: ResizeObserver | null = null;

/** 表格高度跟容器走，行多时只在表格内部滚动 */
function syncTableHeight() {
  const height = wrapRef.value?.clientHeight ?? 0;
  if (height > 0) tableHeight.value = height;
}

onMounted(() => {
  syncTableHeight();
  observer = new ResizeObserver(() => syncTableHeight());
  if (wrapRef.value) observer.observe(wrapRef.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
});

watch(
  () => [props.rows, props.currentIndex] as const,
  () => {
    const index = props.currentIndex;
    const row = index === null ? undefined : props.rows[index];
    tableRef.value?.setCurrentRow(row);
  }
);

function onCurrentChange(row?: PathPointRow) {
  const index = row ? props.rows.indexOf(row) : null;
  if (index !== props.currentIndex) emit("select", index);
}
</script>

<style scoped lang="scss">
.path-point-table {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.path-point-table :deep(.el-table) {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: color-mix(in srgb, var(--color-font) 8%, transparent);
  --el-table-header-text-color: var(--color-font);
  --el-table-text-color: var(--color-font);
  --el-table-border-color: var(--color-border-4);
  --el-table-row-hover-bg-color: color-mix(in srgb, var(--color-state-blue) 16%, transparent);
  --el-table-current-row-bg-color: color-mix(in srgb, var(--color-state-blue) 24%, transparent);
  color: var(--color-font);
  background: transparent;
}

.path-point-table :deep(.el-table__inner-wrapper::before) {
  background-color: var(--color-border-4);
}

/* 右侧固定列盖住横向滚出的单元格，用面板底色垫实，避免删除按钮和数据叠在一起 */
.path-point-table :deep(th.el-table-fixed-column--right) {
  background:
    linear-gradient(color-mix(in srgb, var(--color-font) 8%, transparent), color-mix(in srgb, var(--color-font) 8%, transparent)),
    linear-gradient(var(--color-bg-panel), var(--color-bg-panel)),
    var(--color-bg);
}

.path-point-table :deep(td.el-table-fixed-column--right) {
  background:
    linear-gradient(var(--color-bg-panel), var(--color-bg-panel)),
    var(--color-bg);
}

.path-point-table :deep(.el-table__body tr.hover-row td.el-table-fixed-column--right),
.path-point-table :deep(.el-table__body tr:hover td.el-table-fixed-column--right) {
  background:
    linear-gradient(color-mix(in srgb, var(--color-state-blue) 16%, transparent), color-mix(in srgb, var(--color-state-blue) 16%, transparent)),
    linear-gradient(var(--color-bg-panel), var(--color-bg-panel)),
    var(--color-bg);
}

.path-point-table :deep(.el-table__body tr.current-row td.el-table-fixed-column--right) {
  background:
    linear-gradient(color-mix(in srgb, var(--color-state-blue) 24%, transparent), color-mix(in srgb, var(--color-state-blue) 24%, transparent)),
    linear-gradient(var(--color-bg-panel), var(--color-bg-panel)),
    var(--color-bg);
}

.path-point-table :deep(.el-input-number) {
  width: 100%;
}

.path-point-table :deep(.el-input__wrapper) {
  background: transparent;
  box-shadow: 0 0 0 1px var(--color-border-4) inset;
}

.path-point-table :deep(.el-input__inner) {
  color: var(--color-font);
}
</style>
