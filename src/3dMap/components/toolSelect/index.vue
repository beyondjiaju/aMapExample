<template>
  <div class="tool-select" :style="cssText" @click.stop>
    <i class="decoration left-top" />
    <i class="decoration right-top" />
    <i class="decoration left-bottom" />
    <i class="decoration right-bottom" />
    <slot name="content" />
  </div>
</template>
<script setup lang="ts">
import { ref, onBeforeMount } from "vue";
const cssText = ref("");
const props = defineProps({
  // top bottom
  // left right
  position: {
    type: Array,
    default: () => {
      return ["bottom", "right"];
    }
  }
});
onBeforeMount(() => {
  const position = props.position;
  if (position.length == 0) return;
  if (position[0] == "bottom") {
    cssText.value += `top: 30px;`;
  }
  if (position[0] == "top") {
    cssText.value += `bottom: 30px;`;
  }
  cssText.value += `${position[1]}: 0px;`;
});
</script>
<style lang="scss" scoped>
.tool-select {
  background: rgba(0, 0, 0, 0.2) url(./image/bg.png);
  background-size: 100% 100%;
  padding: 5px 8px;
  position: absolute;
  z-index: 10;
  .decoration {
    position: absolute;
    display: block;
    width: 12px;
    height: 12px;
    background: url(./image/decoration.png);
    background-size: 100% 100%;
  }
  .decoration.left-top {
    top: -1px;
    left: -1px;
  }
  .decoration.right-top {
    top: -1px;
    right: -1px;
    transform: rotate(90deg);
  }
  .decoration.left-bottom {
    bottom: -1px;
    left: -1px;
    transform: rotate(-90deg);
  }
  .decoration.right-bottom {
    bottom: -1px;
    right: -1px;
    transform: rotate(180deg);
  }
}
:deep(.select-list) {
  height: 30px;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 5px;
  border-radius: 5px;
  padding: 0 10px;
}
:deep(.select-list.active) {
  box-shadow: 0 0 15px var(--color-main-1) inset;
}
:deep(.select-list.disabled) {
  cursor: not-allowed;
}
</style>
