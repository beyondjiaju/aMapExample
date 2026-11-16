<template>
  <el-form class="example-op" label-position="left" @submit.prevent>
    <el-form-item label="显示">
      <el-checkbox v-model="visible" @change="applyVisible"></el-checkbox>
    </el-form-item>
    <el-form-item label="拖拽">
      <el-checkbox v-model="drag" @change="applyDrag"></el-checkbox>
    </el-form-item>
    <el-form-item label="聚合">
      <el-checkbox v-model="collision" @change="applyCollision"></el-checkbox>
    </el-form-item>
    <el-form-item label="拖拽连接线">
      <el-color-picker v-model="lineColor" @change="applyDragLine" />
      <el-input-number
        v-model="lineWidth"
        class="example-op__width"
        :min="0.5"
        :step="0.5"
        controls-position="right"
        @change="applyDragLine"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { useHtmlTag } from "./hook";

const { visible, drag, collision, lineColor, lineWidth, applyVisible, applyDrag, applyCollision, applyDragLine } =
  useHtmlTag();
</script>

<style scoped lang="scss">
@use "../style/form.scss";

.example-op {
  min-height: 0;
  overflow: auto;
}

.example-op :deep(.el-form-item) {
  margin-bottom: 12px;
}

.example-op :deep(.el-form-item__label),
.example-op :deep(.el-checkbox__label) {
  color: var(--color-font);
}

.example-op :deep(.el-form-item__content) {
  gap: 8px;
}

.example-op__width {
  width: 120px;
}
</style>

<!-- 标牌挂在地图容器上，不在本组件节点内，样式不能用 scoped -->
<style lang="scss">
.demo-tag {
  padding: 4px 8px;
  color: var(--color-font);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-state-blue);
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}
</style>
