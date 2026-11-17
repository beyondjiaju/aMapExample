<template>
  <ul class="measure-list-box map-btn-style">
    <template v-for="list in measureData" :key="list.type">
      <el-tooltip effect="light" :content="list.label" placement="top">
        <li @click="measureChange(list.type)">
          <img v-show="measureType != list.type" :src="list.image" alt />
          <img
            v-show="measureType == list.type"
            class="active"
            :src="list.imageActive"
            alt
          />
        </li>
      </el-tooltip>
    </template>
  </ul>
</template>
<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { Measure } from "@/3dMap/sdkUtils/measure";
// img
import pointImg from "./image/point.png";
import pointActiveImg from "./image/point-active.png";
import lineImg from "./image/line.png";
import lineActiveImg from "./image/line-active.png";
import polygonImg from "./image/polygon.png";
import polygonActiveImg from "./image/polygon-active.png";
import clearImg from "./image/clear.png";
import clearActiveImg from "./image/clear-active.png";
const measureType = ref("");
const measureData = ref([
  {
    label: "位置测量",
    type: "coordinate",
    image: pointImg,
    imageActive: pointActiveImg
  },
  {
    label: "折线测量",
    type: "distance",
    image: lineImg,
    imageActive: lineActiveImg
  },
  {
    label: "面积测量",
    type: "area",
    image: polygonImg,
    imageActive: polygonActiveImg
  },
  {
    label: "清除",
    type: "clear",
    image: clearImg,
    imageActive: clearActiveImg
  }
]);
const measure = new Measure({
  onTypeChange: type => {
    measureType.value = type;
  }
});
const measureChange = type => {
  measure.change(type);
};
onUnmounted(() => {
  measure.destroy();
});
</script>
<style lang="scss" scoped>
/* 所有项固定同一格子，激活只叠底色/描边，避免 14↔28 切换造成偏移 */
.measure-list-box {
  display: flex;
  align-items: center;
  list-style: none;
  margin: 0;
  padding: 0;
  li {
    box-sizing: border-box;
    position: relative;
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    // margin-right: 8px;
    border-radius: 4px;
    /* 与激活态同宽描边占位，切换时不会因多出 1px 边框而抖动 */
    border: 1px solid transparent;
    background: transparent;
    &.is-measure-active {
      border-color: var(--color-main);
      background: var(--color-bg-3);
    }
    img {
      width: 15px;
      height: 15px;
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      max-width: 15px;
      max-height: 15px;
      object-fit: contain;
    }
  }
  li:last-child {
    margin: 0;
    // img {
    //   width: 21px;
    //   margin-top: 2px;
    // }
  }
}
</style>
