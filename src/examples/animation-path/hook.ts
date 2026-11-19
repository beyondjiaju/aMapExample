import { onBeforeUnmount, ref, watch } from "vue";
import { mapRuntime } from "@/3dMap/components/mapView/creatMap/createMaps";
import { AnimationPath } from "@/3dMap/sdk/cesiumUtils/utils/AnimationPath";

/** 表格一行对应一个关键点，坐标与姿态都用度数 */
export interface PathPointRow {
  lon: number;
  lat: number;
  height: number;
  heading: number;
  pitch: number;
  roll: number;
  duration: number;
}

/** 展示时收一下浮点，避免相机姿态把输入框撑满 */
function round(value: number, digits: number) {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toRow(item: {
  position: number[];
  orientation: { heading: number; pitch: number; roll: number };
  duration: number;
}): PathPointRow {
  return {
    lon: round(item.position[0], 6),
    lat: round(item.position[1], 6),
    height: round(item.position[2], 2),
    heading: round(item.orientation.heading, 2),
    pitch: round(item.orientation.pitch, 2),
    roll: round(item.orientation.roll, 2),
    duration: item.duration
  };
}

/** 路径播放示例：增删清空与播放都走 AnimationPath，表格只持有外部度数格式 */
export function useAnimationPath() {
  const rows = ref<PathPointRow[]>([]);
  const currentIndex = ref<number | null>(null);
  const playing = ref(false);
  const ready = ref(false);
  let api: AnimationPath | null = null;

  function syncRows() {
    rows.value = api ? api.getAllKeyPoints().map(toRow) : [];
  }

  function mount() {
    if (!mapRuntime.ready || !mapRuntime.viewer || api) return;
    api = new AnimationPath(mapRuntime.viewer);
    ready.value = true;
    syncRows();
  }

  /** 把当前相机视角记成一个新节点 */
  function addPoint() {
    if (!api) return;
    api.addKeyPointByCurrentView();
    syncRows();
    currentIndex.value = rows.value.length - 1;
  }

  /** 按行尾删除按钮去掉对应节点 */
  function removePoint(index: number) {
    if (!api || index < 0 || index >= rows.value.length) return;
    api.removeKeyPointByIndex(index);
    currentIndex.value = null;
    playing.value = false;
    syncRows();
  }

  function clearPoints() {
    if (!api) return;
    api.clearKeyPoints();
    currentIndex.value = null;
    playing.value = false;
    rows.value = [];
  }

  /** 播放与暂停共用一个按钮，停止后从头开始 */
  function togglePlay() {
    if (!api) return;
    if (playing.value) {
      api.pause();
      playing.value = false;
      return;
    }
    if (rows.value.length < 2) return;
    api.play(() => {
      // 路径自然播完后，按钮从「暂停」回到「播放」
      playing.value = false;
    });
    playing.value = true;
  }

  function stopPlay() {
    api?.stop();
    playing.value = false;
  }

  /** 编辑结束后整理当前行，按 addKeyPoint 的返回格式替换该节点 */
  function updatePoint(index: number) {
    const row = rows.value[index];
    if (!api || !row) return;
    const position = [Number(row.lon), Number(row.lat), Number(row.height)];
    const orientation = {
      heading: Number(row.heading),
      pitch: Number(row.pitch),
      roll: Number(row.roll)
    };
    const duration = Number(row.duration);
    const values = [...position, orientation.heading, orientation.pitch, orientation.roll, duration];
    if (values.some(value => !Number.isFinite(value))) return;
    api.setKeyPointByIndex(index, { position, orientation, duration });
    // setKeyPointByIndex 内部会停止播放
    playing.value = false;
  }

  watch(
    () => mapRuntime.ready,
    () => mount(),
    { immediate: true }
  );

  onBeforeUnmount(() => {
    api?.destroy();
    api = null;
    ready.value = false;
  });

  return {
    rows,
    currentIndex,
    playing,
    ready,
    addPoint,
    removePoint,
    clearPoints,
    togglePlay,
    stopPlay,
    updatePoint
  };
}
