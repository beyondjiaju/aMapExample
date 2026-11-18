<template>
  <div class="tool-select" :style="cssText" @click.stop>
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
  color: var(--color-font);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-4);
  border-radius: 6px;
  box-shadow: var(--color-shadow);
  backdrop-filter: blur(8px);
  padding: 5px 8px;
  position: absolute;
  z-index: 10;
}
</style>
