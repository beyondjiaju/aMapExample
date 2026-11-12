<template>
  <button
    class="tech-btn"
    :class="{ 'is-active': active, 'is-danger': danger, 'is-ghost': ghost }"
    type="button"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean;
  danger?: boolean;
  ghost?: boolean;
}>();
</script>

<style scoped lang="scss">
/* 按钮使用状态色，不跟大面板的系统边线走同一颜色 */
.tech-btn {
  min-height: 30px;
  padding: 0 10px;
  color: var(--color-font);
  background: color-mix(in srgb, var(--color-state-blue) 22%, transparent);
  border: 1px solid var(--color-state-blue);
  border-radius: 4px;
  cursor: pointer;
  transition: 0.15s ease;
}

.tech-btn:hover,
.tech-btn.is-active {
  color: #fff;
  border-color: var(--color-state-blue);
  box-shadow: inset 0 0 12px color-mix(in srgb, var(--color-state-blue) 45%, transparent);
}

.tech-btn.is-danger {
  border-color: var(--color-state-red);
  background: color-mix(in srgb, var(--color-state-red) 24%, transparent);
}

.tech-btn.is-ghost {
  background: transparent;
  border-color: color-mix(in srgb, var(--color-font) 70%, transparent);
}
</style>
