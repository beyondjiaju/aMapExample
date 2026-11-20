<template>
  <div class="draw-example">
    <DrawOptionForm @change="updateDrawOptions" />
    <!-- 示例内改为相对定位，不影响工具在其他页面的绝对定位 -->
    <DrawCustom
      ref="drawRef"
      cssText="position: relative; display: flex;"
      editCssText="position: relative;"
      :hasCancel="false"
      :options="defaultDrawOptions"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import DrawCustom from "@/3dMap/tools/drawCustom/index.vue";
import DrawOptionForm from "./components/DrawOptionForm.vue";
import { defaultDrawOptions } from "./options";

const drawRef = ref<{
  upDataOptions: (options: Record<string, unknown>) => void;
}>();

/** 表单变化后，用绘制组件的 upDataOptions 更新样式 */
function updateDrawOptions(options: Record<string, unknown>) {
  drawRef.value?.upDataOptions(options);
}
</script>
