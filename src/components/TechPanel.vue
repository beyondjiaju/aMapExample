<template>
  <section class="tech-panel">
    <header v-if="title" class="tech-panel__head">
      <span class="tech-panel__mark" />
      <span>{{ title }}</span>
    </header>
    <div class="tech-panel__body">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title?: string;
}>();
</script>

<style scoped lang="scss">
.tech-panel {
  color: var(--color-font);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-4);
  border-radius: 6px;
  box-shadow: var(--color-shadow);
  backdrop-filter: blur(8px);
}

.tech-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  color: var(--color-font);
  border-bottom: 1px solid var(--color-border-4);
  letter-spacing: 0.04em;
}

.tech-panel__mark {
  width: 3px;
  height: 14px;
  background: var(--color-state-blue);
  box-shadow: 0 0 8px var(--color-state-blue);
}

.tech-panel__body {
  padding: 12px;
}
</style>
