<template>
  <svg
    viewBox="0 0 1024 1024"
    xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    :style="{ color }"
  >
    <path
      d="M106.65 601.564a89.4 89.4 0 1 0 178.8 0 89.4 89.4 0 1 0-178.8 0zM561.884 690.483a89.4 89.4 0 1 0 178.8 0 89.4 89.4 0 1 0-178.8 0zM738.545 333.517a89.4 89.4 0 1 0 178.8 0 89.4 89.4 0 1 0-178.8 0z"
      fill="currentColor"
    />
    <path
      d="M802.207 337.096l43.704 21.872-168.448 336.538-43.71-21.878zM221.112 579.328l409.319 80.82-10.163 51.455-409.319-80.809z"
      fill="currentColor"
    />
  </svg>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 展示颜色，默认系统文字色 */
    color?: string;
    /** 图标宽度 */
    width?: number | string;
    /** 图标高度 */
    height?: number | string;
  }>(),
  {
    color: "var(--color-font)",
    width: 15,
    height: 15
  }
);
</script>
