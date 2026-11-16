<template>
  <div class="shell">
    <aside class="catalog">
      <div class="catalog__brand">
        <strong>地图 SDK 示例</strong>
        <label ref="themeSwitchEl" class="theme-switch">
          <select
            class="theme-switch__select"
            :value="theme"
            aria-label="主题颜色"
            @mousedown.prevent="themeOpen = !themeOpen"
            @change="onThemeChange"
            @keydown.esc="themeOpen = false"
          >
            <option v-for="item in themeOptions" :key="item.id" :value="item.id">
              {{ item.label }}
            </option>
          </select>
          <ul v-show="themeOpen" class="theme-switch__menu" role="listbox">
            <li
              v-for="item in themeOptions"
              :key="item.id"
              role="option"
              :aria-selected="theme === item.id"
              @click="pickTheme(item.id)"
            >
              <i :style="{ background: item.color }" />
              <span>{{ item.label }}</span>
            </li>
          </ul>
        </label>
      </div>
      <input v-model="keyword" class="catalog__search" placeholder="搜索对象" />
      <div class="catalog__scroll">
        <section v-for="group in visibleGroups" :key="group.name">
          <h3>{{ group.name }}</h3>
          <button
            v-for="item in group.items"
            :key="item.id"
            type="button"
            :class="{ active: item.id === currentId }"
            @click="openExample(item.id)"
          >
            {{ item.name }}
          </button>
        </section>
      </div>
    </aside>

    <!-- 目录在左，地图占右侧 -->
    <div class="shell-map">
      <MapView>
        <template #content>
          <!-- 方法面板挂在地图内，贴在地图左侧 -->
          <TechPanel class="method-panel" :title="current?.name || '方法'">
            <component :is="currentComponent" v-if="currentComponent" />
          </TechPanel>
        </template>
      </MapView>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import MapView from "@/3dMap/components/mapView/index.vue";
import TechPanel from "@/components/TechPanel.vue";
import { exampleGroups, findExample } from "@/examples";

const route = useRoute();
const router = useRouter();
const keyword = ref("");
const theme = ref(document.documentElement.dataset.theme || "blue");
const themeOptions = [
  { id: "blue", label: "蓝色", color: "#1677ff" },
  { id: "cyan", label: "青碧", color: "#13a8a8" },
  { id: "white", label: "白色", color: "#ffffff" },
  { id: "black", label: "黑色", color: "#111111" }
] as const;
const themeOpen = ref(false);
const themeSwitchEl = ref<HTMLElement | null>(null);

const currentId = computed(() => String(route.params.id || ""));
const current = computed(() => findExample(currentId.value));
/** 当前要放进方法面板的示例组件 */
const currentComponent = computed(() => current.value?.component ?? null);

const visibleGroups = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return exampleGroups()
    .map(group => ({
      name: group.name,
      items: group.items.filter(item => {
        if (!text) return true;
        return `${item.name} ${item.id}`.toLowerCase().includes(text);
      })
    }))
    .filter(group => group.items.length);
});

function openExample(id: string) {
  router.push(`/example/${id}`);
}

function setTheme(name: "blue" | "cyan" | "white" | "black") {
  theme.value = name;
  document.documentElement.dataset.theme = name;
  localStorage.setItem("amap-example-theme", name);
}

function onThemeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value;
  if (value === "blue" || value === "cyan" || value === "white" || value === "black") setTheme(value);
}

function pickTheme(id: (typeof themeOptions)[number]["id"]) {
  setTheme(id);
  themeOpen.value = false;
}

function closeThemeMenu(event: PointerEvent) {
  const root = themeSwitchEl.value;
  if (root && !root.contains(event.target as Node)) themeOpen.value = false;
}

onMounted(() => document.addEventListener("pointerdown", closeThemeMenu));

const saved = localStorage.getItem("amap-example-theme");
if (saved === "blue" || saved === "cyan" || saved === "white" || saved === "black") setTheme(saved);

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", closeThemeMenu);
});
</script>

<style scoped lang="scss">
.shell {
  position: absolute;
  inset: 0;
  display: flex;
  pointer-events: none;
}

.shell-map,
.catalog,
.method-panel {
  pointer-events: auto;
}

.catalog {
  flex: none;
  width: 280px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg);
  border-right: 1px solid var(--color-border);
}

.shell-map {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.catalog__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 12px 8px;
  color: var(--color-font-title);
}

.catalog__brand strong {
  flex: none;
  font-size: 14px;
  white-space: nowrap;
}

.theme-switch {
  position: relative;
  display: inline-flex;
  min-width: 0;
}

.theme-switch__select {
  width: 72px;
  height: 26px;
  padding: 0 4px;
  color: var(--color-font);
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid color-mix(in srgb, var(--color-font) 55%, transparent);
  border-radius: 4px;
  font-size: 12px;
}

.theme-switch__menu {
  position: absolute;
  z-index: 8;
  top: calc(100% + 4px);
  left: 0;
  min-width: 100%;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  box-shadow: var(--color-shadow);
}

.theme-switch__menu li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 3px;
  font-size: 12px;
  white-space: nowrap;
  cursor: pointer;
}

.theme-switch__menu i {
  width: 12px;
  height: 12px;
  flex: none;
  border: 1px solid rgba(0, 0, 0, 0.18);
  border-radius: 2px;
  box-sizing: border-box;
}

.theme-switch__menu li[aria-selected="true"],
.theme-switch__menu li:hover {
  background: color-mix(in srgb, var(--color-state-blue) 18%, transparent);
}

.catalog__search {
  margin: 0 12px 8px;
  height: 32px;
  padding: 0 8px;
  color: var(--color-font);
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid color-mix(in srgb, var(--color-font) 55%, transparent);
  border-radius: 4px;
}

.catalog__scroll {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 8px 16px;
}

.catalog h3 {
  margin: 12px 6px 6px;
  color: var(--color-font-title);
  font-size: 12px;
  font-weight: 600;
}

.catalog button {
  display: block;
  width: 100%;
  margin: 2px 0;
  padding: 6px 8px;
  color: var(--color-font);
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}

.catalog button.active,
.catalog button:hover {
  background: color-mix(in srgb, var(--color-state-blue) 18%, transparent);
  border-color: var(--color-state-blue);
}

.method-panel {
  max-height: calc(100% - 24px);
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 99;
  width: 348px;
  display: flex;
  flex-direction: column;
}

.method-panel :deep(.tech-panel__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100% - 36px);
  overflow-y: auto;
}
</style>
