<template>
  <svg
    viewBox="0 0 1088 1024"
    xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    :style="{ color }"
  >
    <path
      d="M201.856 225.92a32 32 0 0 1 32-32h581.248a32 32 0 0 1 32 32v581.248a32 32 0 0 1-32 32H233.856a32 32 0 0 1-32-32V225.856z m64 32v517.248h517.248V257.856H265.856z"
      fill="currentColor"
    />
    <path
      d="M135.104 225.92a96 96 0 1 1 192 0 96 96 0 0 1-192 0zM709.312 225.92a96 96 0 1 1 192 0 96 96 0 0 1-192 0zM709.312 798.08a96 96 0 1 1 192 0 96 96 0 0 1-192 0zM135.104 798.08a96 96 0 1 1 192 0 96 96 0 0 1-192 0zM388.736 652.288a32 32 0 0 1 0-45.248l226.24-226.304a32 32 0 1 1 45.248 45.248l-226.24 226.304a32 32 0 0 1-45.248 0z"
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
