<template>
  <ul class="measure-list-box map-btn-style">
    <template v-for="list in measureData" :key="list.type">
      <el-tooltip effect="light" :content="list.label" placement="top">
        <li @click="measureChange(list.type)">
          <!-- 默认系统文字色，选中时用主题色高亮 -->
          <component
            :is="list.icon"
            :color="measureType == list.type ? 'var(--color-main)' : 'var(--color-font)'"
            :width="20"
            :height="20"
          />
        </li>
      </el-tooltip>
    </template>
  </ul>
</template>
<script setup lang="ts">
import { ref, onUnmounted, type Component } from "vue";
import { Measure } from "@/3dMap/sdkUtils/measure";
import PointIcon from "./imageSvg/point.vue";
import LineIcon from "./imageSvg/line.vue";
import AreaIcon from "./imageSvg/area.vue";
import ClearIcon from "./imageSvg/clear.vue";
const measureType = ref("");
const measureData = ref<{ label: string; type: string; icon: Component }[]>([
  {
    label: "位置测量",
    type: "coordinate",
    icon: PointIcon
  },
  {
    label: "折线测量",
    type: "distance",
    icon: LineIcon
  },
  {
    label: "面积测量",
    type: "area",
    icon: AreaIcon
  },
  {
    label: "清除",
    type: "clear",
    icon: ClearIcon
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
    svg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
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
