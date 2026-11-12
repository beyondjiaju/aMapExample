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
  color: var(--tech-text);
  background: var(--tech-panel);
  border: 1px solid var(--tech-line);
  border-radius: 6px;
  box-shadow: var(--tech-shadow);
  backdrop-filter: blur(8px);
}

.tech-panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 12px;
  color: #fff;
  border-bottom: 1px solid var(--tech-line);
  letter-spacing: 0.04em;
}

.tech-panel__mark {
  width: 3px;
  height: 14px;
  background: var(--tech-accent);
  box-shadow: 0 0 8px var(--tech-accent);
}

.tech-panel__body {
  padding: 12px;
}
</style>
