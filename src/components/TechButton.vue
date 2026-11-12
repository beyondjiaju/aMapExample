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
.tech-btn {
  min-height: 30px;
  padding: 0 10px;
  color: var(--tech-text);
  background: linear-gradient(180deg, rgba(22, 119, 255, 0.35), rgba(8, 40, 90, 0.2));
  border: 1px solid var(--tech-line);
  border-radius: 4px;
  cursor: pointer;
  transition: 0.15s ease;
}

.tech-btn:hover,
.tech-btn.is-active {
  color: #fff;
  border-color: var(--tech-line-strong);
  box-shadow: inset 0 0 12px rgba(64, 169, 255, 0.25);
}

.tech-btn.is-danger {
  border-color: rgba(255, 120, 117, 0.7);
  background: linear-gradient(180deg, rgba(255, 77, 79, 0.28), rgba(40, 10, 10, 0.15));
}

.tech-btn.is-ghost {
  background: transparent;
}
</style>
