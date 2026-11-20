<template>
  <el-form class="example-op" label-position="left" @submit.prevent>
    <el-form-item label="填充色">
      <el-color-picker v-model="color" @change="onFillColorChange" />
    </el-form-item>
    <el-form-item label="边线色">
      <el-color-picker v-model="outlineColor" @change="onOutlineColorChange" />
    </el-form-item>
    <el-form-item label="填充透明度">
      <el-input-number
        v-model="alpha"
        :min="0"
        :max="1"
        :step="0.1"
        :precision="1"
        @change="emitChange"
      />
    </el-form-item>
    <el-form-item label="边线透明度">
      <el-input-number
        v-model="outlineAlpha"
        :min="0"
        :max="1"
        :step="0.1"
        :precision="1"
        @change="emitChange"
      />
    </el-form-item>
    <el-form-item label="边线宽度">
      <el-input-number
        v-model="outlineWidth"
        :min="1"
        :max="20"
        :step="1"
        :precision="0"
        @change="onOutlineWidthChange"
      />
    </el-form-item>
    <el-form-item label="样式">
      <el-select v-model="style" @change="emitChange">
        <el-option label="填充" value="fill" />
        <el-option label="边线" value="outline" />
      </el-select>
    </el-form-item>
    <el-form-item label="结束方式">
      <el-select v-model="endType" @change="emitChange">
        <el-option label="双击" value="dblclick" />
        <el-option label="右键" value="contextmenu" />
      </el-select>
    </el-form-item>
    <el-form-item label="实时坐标">
      <el-checkbox v-model="moveCoordinate" @change="emitChange" />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { defaultDrawOptions } from "../options";

const emit = defineEmits<{
  change: [options: Record<string, unknown>];
}>();

const color = ref(defaultDrawOptions.color);
const outlineColor = ref(defaultDrawOptions.outlineColor);
const alpha = ref(defaultDrawOptions.alpha);
const outlineAlpha = ref(defaultDrawOptions.outlineAlpha);
const outlineWidth = ref(defaultDrawOptions.outlineWidth);
const style = ref(defaultDrawOptions.style);
const endType = ref(defaultDrawOptions.endType);
const moveCoordinate = ref(defaultDrawOptions.moveCoordinate);

/** 汇总当前表单，交给外部更新绘制样式 */
function emitChange() {
  emit("change", {
    color: color.value,
    outlineColor: outlineColor.value,
    alpha: alpha.value,
    outlineAlpha: outlineAlpha.value,
    outlineWidth: outlineWidth.value,
    // 二维线面描边读 width，三维边线读 outlineWidth，两边一起更新
    width: outlineWidth.value,
    style: style.value,
    endType: endType.value,
    moveCoordinate: moveCoordinate.value
  });
}

/** 填充色被清空时回到默认色 */
function onFillColorChange(value: string | null) {
  if (!value) color.value = defaultDrawOptions.color;
  emitChange();
}

/** 边线色被清空时回到默认色 */
function onOutlineColorChange(value: string | null) {
  if (!value) outlineColor.value = defaultDrawOptions.outlineColor;
  emitChange();
}

/** 边线宽度被清空时回到默认宽度 */
function onOutlineWidthChange(value: number | null) {
  if (value == null) outlineWidth.value = defaultDrawOptions.outlineWidth;
  emitChange();
}
</script>

<style scoped lang="scss">
@use "../../style/form.scss";

.example-op {
  min-height: 0;
  margin-bottom: 12px;
  overflow: auto;
}

.example-op :deep(.el-form-item) {
  margin-bottom: 12px;
}

.example-op :deep(.el-select),
.example-op :deep(.el-input-number) {
  width: 140px;
}
</style>
