import { onBeforeUnmount, onMounted, ref } from "vue";
import { mapEmitter } from "@/3dMap/interface";
import { AnimationPath } from "@/3dMap/sdkUtils";

/** 表格里的一个路径点。角度为度，高度和速度为米 */
export interface PathPoint {
  lon: number;
  lat: number;
  heading: number;
  pitch: number;
  roll: number;
  speed: number;
  /** 相机高度，米。新增时取当前视角 */
  height: number;
}

/** 高度无效时的兜底，避免相机贴到地面 */
const FLIGHT_HEIGHT = 8000;

function toRad(degree: number) {
  return (Number(degree) * Math.PI) / 180;
}

function toDeg(radian: number) {
  return (Number(radian) * 180) / Math.PI;
}

/** 表格高度优先，无效时用兜底高度 */
function pointHeight(row: PathPoint) {
  const height = Number(row.height);
  return Number.isFinite(height) ? height : FLIGHT_HEIGHT;
}

/** 两点间的地面距离，用来把速度换算成到下一点的秒数 */
function distanceMeters(from: PathPoint, to: PathPoint) {
  const rad = Math.PI / 180;
  const dLat = (to.lat - from.lat) * rad;
  const dLon = (to.lon - from.lon) * rad;
  const lat1 = from.lat * rad;
  const lat2 = to.lat * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * 6378137 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** 速度是这一行到下一行的米/秒。距离过近或速度无效时退回 5 秒 */
function toDuration(from: PathPoint, to: PathPoint) {
  const meters = distanceMeters(from, to);
  const speed = Number(from.speed);
  if (!(meters > 1) || !(speed > 0)) return 5;
  return meters / speed;
}

export function useAnimationPath() {
  const rows = ref<PathPoint[]>([]);
  const status = ref<"stop" | "play" | "pause">("stop");
  const api = new AnimationPath();
  let remain = 0;
  let endsAt = 0;
  let timer = 0;

  function clearTimer() {
    if (!timer) return;
    window.clearTimeout(timer);
    timer = 0;
  }

  /** 播放时长到了就把按钮从暂停切回播放。暂停时会先清掉这个计时 */
  function arm(ms: number) {
    clearTimer();
    endsAt = performance.now() + ms;
    timer = window.setTimeout(() => {
      timer = 0;
      remain = 0;
      status.value = "stop";
    }, ms);
  }

  function totalMs() {
    let seconds = 0;
    for (let index = 0; index < rows.value.length - 1; index += 1) {
      seconds += toDuration(rows.value[index], rows.value[index + 1]);
    }
    return seconds * 1000;
  }

  /** 用表格重写播放节点。旋转角写入俯仰，翻滚角写入 roll */
  function sync() {
    api.clearKeyPoints();
    rows.value.forEach((row, index) => {
      const next = rows.value[index + 1];
      api.addKeyPoint(
        { lon: row.lon, lat: row.lat, height: pointHeight(row) },
        {
          heading: toRad(row.heading),
          pitch: toRad(row.pitch),
          roll: toRad(row.roll)
        },
        next ? toDuration(row, next) : 5
      );
    });
  }

  function resetPlay() {
    clearTimer();
    remain = 0;
    status.value = "stop";
    sync();
  }

  function togglePlay() {
    if (rows.value.length < 2) return;
    if (status.value === "play") {
      api.pause();
      remain = Math.max(0, endsAt - performance.now());
      clearTimer();
      status.value = "pause";
      return;
    }
    // 停住或上一次已经播完时，按表格重新生成节点再从头播放
    if (status.value === "stop" || remain <= 0) {
      sync();
      remain = totalMs();
    }
    api.play();
    status.value = "play";
    arm(remain);
  }

  function stop() {
    api.stop();
    clearTimer();
    remain = 0;
    status.value = "stop";
  }

  /** 点击行时停掉播放，再按该行的位置和角度定位 */
  function locateRow(row: PathPoint) {
    if (!rows.value.includes(row)) return;
    stop();
    api.locate({
      lon: row.lon,
      lat: row.lat,
      height: pointHeight(row),
      heading: toRad(row.heading),
      pitch: toRad(row.pitch),
      roll: toRad(row.roll)
    });
  }

  /** 新增直接取当前地图视角，作为路径节点追加到表格和播放对象 */
  function addByCurrentView() {
    if (status.value !== "stop") stop();
    const lastSpeed = rows.value[rows.value.length - 1]?.speed;
    const record = api.addKeyPointByCurrentView();
    if (!record) return;
    rows.value.push({
      lon: record.lon,
      lat: record.lat,
      heading: toDeg(record.heading),
      pitch: toDeg(record.pitch),
      roll: toDeg(record.roll),
      // 视角里没有速度，沿用上一节点，没有上一节点时用默认速度
      speed: Number(lastSpeed) > 0 ? Number(lastSpeed) : 2,
      height: Number.isFinite(Number(record.height)) ? Number(record.height) : FLIGHT_HEIGHT
    });
  }

  /** 单元格改完后停掉播放，并按表格里的新数值重写节点 */
  function commitRow(row: PathPoint) {
    const lon = Number(row.lon);
    const lat = Number(row.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    row.lon = lon;
    row.lat = lat;
    row.heading = Number.isFinite(Number(row.heading)) ? Number(row.heading) : 0;
    row.pitch = Number.isFinite(Number(row.pitch)) ? Number(row.pitch) : 0;
    row.roll = Number.isFinite(Number(row.roll)) ? Number(row.roll) : 0;
    row.speed = Number(row.speed) > 0 ? Number(row.speed) : 1;
    row.height = Number.isFinite(Number(row.height)) ? Number(row.height) : FLIGHT_HEIGHT;
    resetPlay();
  }

  function removeRow(index: number) {
    rows.value.splice(index, 1);
    resetPlay();
  }

  function clearRows() {
    rows.value = [];
    resetPlay();
  }

  // 切换二三维时播放对象会重建并停止，按钮跟着回到停止
  const offMode = mapEmitter.on("mapEvents:mapModeChangeSetSdkUtilsByCurrentMode", () => {
    clearTimer();
    remain = 0;
    status.value = "stop";
  });

  onMounted(() => sync());

  onBeforeUnmount(() => {
    clearTimer();
    offMode?.();
    api.destroy();
  });

  return {
    rows,
    status,
    togglePlay,
    stop,
    locateRow,
    addByCurrentView,
    commitRow,
    removeRow,
    clearRows
  };
}
