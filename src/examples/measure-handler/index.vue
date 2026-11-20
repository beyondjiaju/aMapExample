<template>
  <div class="measure-example">
    <el-form class="example-op" label-position="left" @submit.prevent>
      <el-form-item label="颜色">
        <el-color-picker v-model="color" @change="changeColor" />
      </el-form-item>
      <el-form-item label="坐标格式">
        <el-select v-model="coordinateFormat" @change="changeCoordinateFormat">
          <el-option label="经纬度" value="lonlat" />
          <el-option label="度分秒" value="dms" />
        </el-select>
      </el-form-item>
    </el-form>
    <Measure ref="measureRef" :color="color" :coordinate-format="coordinateFormat" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Measure from "@/3dMap/tools/measure/index.vue";

const measureRef = ref<{
  setColor: (color: string) => void;
  setCoordinateFormat: (format: string) => void;
}>();
const color = ref("#ffa500");
const coordinateFormat = ref("lonlat");

/** 把选中的颜色交给测量组件 */
function changeColor(value: string | null) {
  if (!value) return;
  measureRef.value?.setColor(value);
}

/** 把选中的坐标格式交给测量组件 */
function changeCoordinateFormat(value: string) {
  measureRef.value?.setCoordinateFormat(value);
}
</script>

<style scoped lang="scss">
@use "../style/form.scss";

.example-op {
  min-height: 0;
  margin-bottom: 12px;
  overflow: auto;
}

.example-op :deep(.el-form-item) {
  margin-bottom: 12px;
}

.example-op :deep(.el-select) {
  width: 140px;
}
</style>
