import { mapEmitter } from "@/3dMap/interface";

/** 通知 sdkUtils 里已监听 mapMode 的对象，用历史数据同步到当前地图 */
export function emitSdkUtilsMapModeChange() {
  // 统一驱动 sdkUtils 按当前地图模式同步
  mapEmitter.emit("mapEvents:mapModeChangeSetSdkUtilsByCurrentMode");
}
