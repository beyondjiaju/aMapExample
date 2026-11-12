<template>
  <div class="shell">
    <aside class="catalog">
      <div class="catalog__brand">
        <strong>地图 SDK 示例</strong>
        <span>蓝色</span>
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

    <header class="topbar">
      <div>
        <strong>{{ current?.name || "示例" }}</strong>
        <em>{{ engineText }}</em>
      </div>
      <div class="topbar__actions">
        <TechButton ghost :active="theme === 'blue'" @click="setTheme('blue')">蓝色</TechButton>
        <TechButton ghost :active="theme === 'cyan'" @click="setTheme('cyan')">青碧</TechButton>
        <ModeSwitch />
      </div>
    </header>

    <TechPanel class="method-panel" :title="current?.name || '方法'">
      <p class="desc">{{ current?.summary }}</p>
      <p class="from">{{ current?.from }}</p>
      <div class="method-tags">
        <span v-for="method in current?.methods || []" :key="method">{{ method }}</span>
      </div>
      <div class="method-actions">
        <TechButton @click="mountCurrent(true)">初始化</TechButton>
        <TechButton danger @click="unmountCurrent">注销</TechButton>
        <TechButton
          v-for="action in current?.actions || []"
          :key="action.name"
          ghost
          @click="runAction(action)"
        >
          {{ action.name }}
        </TechButton>
      </div>
      <pre class="log">{{ logs.join("\n") }}</pre>
    </TechPanel>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import ModeSwitch from "@/components/ModeSwitch.vue";
import TechButton from "@/components/TechButton.vue";
import TechPanel from "@/components/TechPanel.vue";
import mapData from "@/3dMap/store/map";
import { olMap, viewer } from "@/3dMap/global";
import { mapRuntime, recreateCesium } from "@/map/createMaps";
import { exampleGroups, findExample } from "@/examples";
import type { ExampleAction, ExampleContext, ExampleHandle, SdkExample } from "@/examples/types";

const route = useRoute();
const router = useRouter();
const mapStore = mapData();
const keyword = ref("");
const logs = ref<string[]>([]);
const theme = ref(document.documentElement.dataset.theme || "blue");

let handle: ExampleHandle | null = null;
let mountedId = "";
let mountedMode: "2d" | "3d" | "" = "";
let token = 0;

const currentId = computed(() => String(route.params.id || ""));
const current = computed(() => findExample(currentId.value));
const mode = computed<"2d" | "3d">(() => (mapStore.mapModeIs2D ? "2d" : "3d"));
const engineText = computed(() => {
  const engine = current.value?.engine;
  if (engine === "cesium") return "仅三维实现，切换二维时注销实例";
  if (engine === "ol") return "仅二维实现，切换三维时注销实例";
  if (engine === "both") return "二维 / 三维各自实现，切换时重建";
  return "与地图模式无关，切换后按当前模式回显";
});

const visibleGroups = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return exampleGroups()
    .map(group => ({
      name: group.name,
      items: group.items.filter(item => {
        if (!text) return true;
        return `${item.name} ${item.id} ${item.summary}`.toLowerCase().includes(text);
      })
    }))
    .filter(group => group.items.length);
});

function pushLog(message: string) {
  logs.value = [...logs.value.slice(-12), message];
}

function makeContext(targetMode: "2d" | "3d"): ExampleContext {
  return {
    mode: targetMode,
    viewer,
    olMap,
    log: pushLog
  };
}

function supports(example: SdkExample, targetMode: "2d" | "3d") {
  if (example.engine === "cesium") return targetMode === "3d";
  if (example.engine === "ol") return targetMode === "2d";
  return true;
}

async function unmountCurrent() {
  const example = findExample(mountedId);
  if (!example || !handle) {
    handle = null;
    mountedId = "";
    mountedMode = "";
    return;
  }
  try {
    example.unmount(handle, makeContext(mountedMode || mode.value));
    pushLog(`已注销 ${example.name}`);
  } catch (error) {
    pushLog(`注销失败: ${(error as Error).message}`);
  }
  handle = null;
  mountedId = "";
  mountedMode = "";
}

async function mountCurrent(manual = false) {
  const example = current.value;
  const runToken = ++token;
  await unmountCurrent();
  if (!example || runToken !== token) return;
  if (!mapRuntime.ready) {
    pushLog("地图还在初始化");
    return;
  }
  // 其他示例依赖全局三维球。createViewer 示例注销后，切走时补建一次
  if (
    mode.value === "3d" &&
    example.engine !== "ol" &&
    example.id !== "create-viewer" &&
    (!viewer || viewer.isDestroyed?.())
  ) {
    await recreateCesium();
    pushLog("三维球已重新创建");
  }
  if (!supports(example, mode.value)) {
    pushLog(`${example.name} 在当前${mode.value === "2d" ? "二维" : "三维"}下没有对应实现，实例保持注销`);
    return;
  }
  try {
    handle = await example.mount(makeContext(mode.value));
    if (runToken !== token) {
      example.unmount(handle, makeContext(mode.value));
      handle = null;
      return;
    }
    mountedId = example.id;
    mountedMode = mode.value;
    if (manual || logs.value.length === 0) pushLog(`已初始化 ${example.name}`);
    else pushLog(`已按${mode.value === "2d" ? "二维" : "三维"}重新初始化 ${example.name}`);
  } catch (error) {
    pushLog(`初始化失败: ${(error as Error).message}`);
  }
}

async function runAction(action: ExampleAction) {
  if (!handle || !current.value) {
    pushLog("请先初始化");
    return;
  }
  try {
    await action.run(handle, makeContext(mode.value));
  } catch (error) {
    pushLog(`${action.name} 失败: ${(error as Error).message}`);
  }
}

function openExample(id: string) {
  logs.value = [];
  router.push(`/example/${id}`);
}

function setTheme(name: "blue" | "cyan") {
  theme.value = name;
  document.documentElement.dataset.theme = name;
  localStorage.setItem("amap-example-theme", name);
}

const saved = localStorage.getItem("amap-example-theme");
if (saved === "blue" || saved === "cyan") setTheme(saved);

watch(
  () => [currentId.value, mapStore.mapModeIs2D, mapRuntime.ready] as const,
  () => {
    mountCurrent(false);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  token += 1;
  unmountCurrent();
});
</script>

<style scoped lang="scss">
.shell {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.catalog,
.topbar,
.method-panel {
  pointer-events: auto;
}

.catalog {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--tech-panel-solid);
  border-right: 1px solid var(--tech-line);
}

.catalog__brand {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 14px 14px 8px;
}

.catalog__brand span,
.from,
.topbar em {
  color: var(--tech-text-dim);
  font-style: normal;
  font-size: 12px;
}

.catalog__search {
  margin: 0 12px 8px;
  height: 32px;
  padding: 0 8px;
  color: var(--tech-text);
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--tech-line);
  border-radius: 4px;
}

.catalog__scroll {
  overflow: auto;
  padding: 0 8px 16px;
}

.catalog h3 {
  margin: 12px 6px 6px;
  color: var(--tech-accent);
  font-size: 12px;
  font-weight: 600;
}

.catalog button {
  display: block;
  width: 100%;
  margin: 2px 0;
  padding: 6px 8px;
  color: var(--tech-text);
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
}

.catalog button.active,
.catalog button:hover {
  background: rgba(22, 119, 255, 0.18);
  border-color: var(--tech-line);
}

.topbar {
  position: absolute;
  top: 12px;
  left: 292px;
  right: 372px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 48px;
  padding: 8px 12px;
  background: var(--tech-panel);
  border: 1px solid var(--tech-line);
  border-radius: 6px;
}

.topbar__actions {
  display: flex;
  gap: 8px;
}

.method-panel {
  position: absolute;
  top: 12px;
  right: 12px;
  bottom: 12px;
  width: 348px;
  display: flex;
  flex-direction: column;
}

.method-panel :deep(.tech-panel__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: calc(100% - 36px);
}

.desc,
.from {
  margin: 0 0 8px;
  line-height: 1.5;
  font-size: 13px;
}

.method-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 120px;
  overflow: auto;
}

.method-tags span {
  padding: 2px 6px;
  color: var(--tech-accent);
  font-size: 12px;
  border: 1px solid var(--tech-line);
  border-radius: 3px;
}

.method-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}

.log {
  flex: 1;
  min-height: 80px;
  margin: 0;
  padding: 8px;
  overflow: auto;
  color: var(--tech-text-dim);
  white-space: pre-wrap;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  font-size: 12px;
}
</style>
