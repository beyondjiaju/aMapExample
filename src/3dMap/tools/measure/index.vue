<template>
  <ul class="measure-list-box">
    <template v-for="list in measureData" :key="list.type">
      <el-tooltip effect="light" :content="list.label" placement="top">
        <li
          :class="{ 'active': measureType == list.type }"
          @click="measureChange(list.type)"
        >
          <!-- 使用 image 目录图片展示工具图标 -->
          <img :src="list.img" :alt="list.label" />
        </li>
      </el-tooltip>
    </template>
  </ul>
</template>
<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { Measure } from "@/3dMap/sdkUtils/measure";
import pointImg from "./image/point.png";
import lineImg from "./image/line.png";
import areaImg from "./image/area.png";
import clearImg from "./image/clear.png";
const props = withDefaults(
  defineProps<{
    /** 绘制颜色 */
    color?: string;
    /** 坐标格式，lonlat 经纬度，dms 度分秒 */
    coordinateFormat?: string;
  }>(),
  {
    color: "#ffa500",
    coordinateFormat: "lonlat"
  }
);
const measureType = ref("");
const measureData = ref<{ label: string; type: string; img: string }[]>([
  {
    label: "位置测量",
    type: "coordinate",
    img: pointImg
  },
  {
    label: "折线测量",
    type: "distance",
    img: lineImg
  },
  {
    label: "面积测量",
    type: "area",
    img: areaImg
  },
  {
    label: "清除",
    type: "clear",
    img: clearImg
  }
]);
/** 当前绘制颜色，供外部读取 */
const color = ref(props.color);
/** 当前坐标格式，供外部读取 */
const coordinateFormat = ref(props.coordinateFormat);
const measure = new Measure({
  color: color.value,
  coordinateFormat: coordinateFormat.value,
  onTypeChange: type => {
    measureType.value = type;
  }
});
const measureChange = type => {
  measure.change(type);
};
/** 更新绘制颜色 */
function setColor(value: string) {
  color.value = value;
  measure.setColor(value);
}
/** 更新坐标格式，lonlat 经纬度，dms 度分秒 */
function setCoordinateFormat(value: string) {
  coordinateFormat.value = value;
  measure.setCoordinateFormat(value);
}
watch(
  () => props.color,
  value => {
    if (value && value !== color.value) setColor(value);
  }
);
watch(
  () => props.coordinateFormat,
  value => {
    if (value && value !== coordinateFormat.value) setCoordinateFormat(value);
  }
);
defineExpose({
  color,
  coordinateFormat,
  setColor,
  setCoordinateFormat
});
onUnmounted(() => {
  measure.destroy();
});
</script>
<style lang="scss" scoped>
/* 所有项固定同一格子，激活只叠底色/描边，避免切换造成偏移 */
.measure-list-box {
  display: flex;
  align-items: center;
  background: var(--color-bg-panel);
  color: var(--color-font);
  border-radius: 4px;
  width: auto;
  li {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    cursor: default;
    margin: 5px;
    background: var(--color-bg-3);
    border-radius: 4px;
    overflow: hidden;
    img {
      width: 60%;
      transform: translateY(-100px);
      filter: drop-shadow(var(--color-font) 0 100px);
    }
  }
  li.active {
    background: var(--color-main-1);
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px var(--color-border-4);
    img{
      filter: drop-shadow(var(--color-font-select) 0 100px);
    }
  }
  li:last-child {
    margin: 0;
  }
}
</style>
