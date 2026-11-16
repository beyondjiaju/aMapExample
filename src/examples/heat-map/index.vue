<template>
  <el-form class="example-op" label-position="left" @submit.prevent>
    <el-form-item label="显示">
      <el-checkbox v-model="visible" @change="reloadHeat"></el-checkbox>
    </el-form-item>
    <el-form-item label="半径">
      <el-input-number
        v-model="radius"
        class="example-op__radius"
        :min="1"
        :step="10"
        controls-position="right"
        @change="reloadHeat"
      />
    </el-form-item>
    <el-form-item label="最大透明度">
      <el-slider v-model="maxOpacity" :min="0" :max="1" :step="0.01" @change="reloadHeat" />
    </el-form-item>
    <el-form-item label="最小透明度">
      <el-slider v-model="minOpacity" :min="0" :max="1" :step="0.01" @change="reloadHeat" />
    </el-form-item>
    <el-form-item v-for="(stop, index) in colorValues" :key="index" :label="`图例-${stop}`">
      <el-color-picker v-model="colors[index]" :clearable="false" @change="reloadHeat" />
    </el-form-item>
    <el-form-item label="鼠标事件">
      <el-checkbox v-model="mouseEnabled" @change="applyMouse">开启</el-checkbox>
    </el-form-item>
    <el-form-item label="事件类型">
      <el-radio-group v-model="mouseType" @change="applyMouse">
        <el-radio value="move">move</el-radio>
        <el-radio value="click">click</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item label="鼠标热力">
      <span class="example-op__value">{{ mouseValue === null ? "--" : mouseValue }}</span>
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { useHeatMap } from "./hook";

const {
  visible,
  radius,
  maxOpacity,
  minOpacity,
  colors,
  colorValues,
  mouseEnabled,
  mouseType,
  mouseValue,
  reloadHeat,
  applyMouse
} = useHeatMap();
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
  min-width: 0;
}

.example-op :deep(.el-slider) {
  flex: 1;
  min-width: 0;
}

.example-op__radius {
  width: 140px;
}

.example-op :deep(.el-radio) {
  margin-right: 12px;
}

.example-op :deep(.el-radio__label),
.example-op__value {
  color: var(--color-font);
}
</style>
