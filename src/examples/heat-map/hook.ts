import { onBeforeUnmount, ref, watch } from "vue";
import { flyToHome } from "@/3dMap/global";
import { mapRuntime } from "@/3dMap/components/mapView/creatMap/createMaps";
import { HeatMap2D } from "@/3dMap/sdkUtils/heatMap2D";
import { HEAT_STYLE, heatData } from "./data";

/** 进入示例即用测试数据铺一层热力，二三维切换由通用对象内部处理 */
export function useHeatMap() {
  const visible = ref(true);
  const radius = ref(HEAT_STYLE.radius);
  const maxOpacity = ref(HEAT_STYLE.maxOpacity);
  const minOpacity = ref(HEAT_STYLE.minOpacity);
  const colors = ref([...HEAT_STYLE.colors]);
  const colorValues = HEAT_STYLE.values;
  const mouseEnabled = ref(false);
  const mouseType = ref<"move" | "click">("move");
  const mouseValue = ref<number | null>(null);
  // 点位只生成一次，改样式时仍用这批数据重铺
  const points = heatData();
  let api: HeatMap2D | null = null;

  function dispose() {
    api?.destroy();
    api = null;
  }

  function mouseOptions() {
    return {
      mouseLookAt: mouseEnabled.value ? mouseType.value : null,
      mouseCallBack: onMouseValue
    };
  }

  function createApi() {
    if (!mapRuntime.ready) return null;
    return new HeatMap2D(mouseOptions());
  }

  /** 鼠标落点回传当前位置数值，区域外为 null */
  function onMouseValue(value: number | null) {
    mouseValue.value = value;
  }

  /** 用面板上的半径、透明度和颜色覆盖默认样式，展示范围仍取 HEAT_STYLE */
  function currentStyle() {
    return {
      ...HEAT_STYLE,
      radius: Number(radius.value),
      maxOpacity: Number(maxOpacity.value),
      minOpacity: Number(minOpacity.value),
      colors: [...colors.value]
    };
  }

  /** 按勾选和类型改对象上的鼠标监听，不重铺热力图 */
  function applyMouse() {
    if (!mouseEnabled.value) mouseValue.value = null;
    api?.setMouseLookAt(mouseEnabled.value ? mouseType.value : null);
  }

  /**
   * 先移除原热力图，再按当前参数添加。
   * 未勾选显示时只移除，不重新加载。
   */
  function reloadHeat() {
    if (!mapRuntime.ready) return;
    const nextRadius = Number(radius.value);
    const nextMax = Number(maxOpacity.value);
    const nextMin = Number(minOpacity.value);
    if (!Number.isFinite(nextRadius) || !Number.isFinite(nextMax) || !Number.isFinite(nextMin)) return;
    dispose();
    api = createApi();
    if (!api || !visible.value) return;
    api.add(points, currentStyle());
  }

  function mount() {
    if (!mapRuntime.ready || api) return;
    api = createApi();
    if (api && visible.value) api.add(points, currentStyle());
    // 示例数据就绪后回到配置的初始视野
    flyToHome();
  }

  watch(
    () => mapRuntime.ready,
    () => mount(),
    { immediate: true }
  );

  onBeforeUnmount(() => {
    dispose();
  });

  return {
    visible,
    radius,
    maxOpacity,
    minOpacity,
    colors,
    colorValues,
    mouseEnabled,
    mouseType,
    mouseValue,
    reloadHeat,
    applyMouse
  };
}
