<template>
  <button class="tech-btn" :class="{ 'is-active': active }" type="button">
    <slot />
    <!-- 传入 dropDown 时在文字后显示向下小三角，激活后翻成向上 -->
    <i v-if="dropDown" class="tech-btn__caret" />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean;
  dropDown?: boolean;
}>();
</script>

<style scoped lang="scss">
/* 地图包内自带按钮，不引用宿主组件 */
.tech-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  padding: 0 10px;
  color: var(--color-font);
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-4);
  border-radius: 4px;
  cursor: pointer;
  transition: 0.15s ease;
}

.tech-btn:hover,
.tech-btn.is-active {
  border-color: var(--color-border);
  box-shadow: inset 0 0 1px var(--color-border);
  color: var(--color-font-select);
  background: var(--color-main);
}

.tech-btn__caret {
  width: 0;
  height: 0;
  border-right: 4px solid transparent;
  border-left: 4px solid transparent;
  border-top: 5px solid currentColor;
  transition: transform 0.15s ease;
}

.tech-btn.is-active .tech-btn__caret {
  transform: rotate(180deg);
}
</style>
