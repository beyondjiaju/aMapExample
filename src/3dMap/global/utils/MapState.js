import mapData from "@/3dMap/store/map";

/** 地图全局状态，供 SDK 与示例页读取 */
export let viewer = null;
export let olMap = null;
export let cameraHandler = {};
export let config = {
  homeData: {}
};

/** 设置三维 viewer */
export const setViewer = data => {
  viewer = data;
};

/** 设置二维地图 */
export const setOlMap = data => {
  olMap = data;
};

/** 按地图模式记录相机操作句柄 */
export const setCameraHandler = (data, mapMode = "cesium") => {
  cameraHandler[mapMode] = data;
};

/** 取当前模式对应的相机操作句柄 */
export const getCameraHandler = () => {
  return cameraHandler[mapData().mapMode];
};

/**
 * 合并地图配置。
 * 优先级：单位本地配置 > 服务端配置 > 静态配置。
 * 只传一个对象时与原 setMapConfig 行为一致。
 */
export const setMapConfig = (data = {}, httpSaveData = {}, unitSaveData = {}) => {
  for (const key in data) {
    config[key] = unitSaveData[key] || httpSaveData[key] || data[key];
  }
};

/** 更新初始定位，供 flyToHome 读取 */
export const setHomeData = option => {
  for (const key in option) {
    config.homeData[key] = option[key];
  }
};

/** 清空与 viewer、olMap 相关的全局记录 */
export const resetMapGlobals = () => {
  viewer = null;
  olMap = null;
  cameraHandler = {};
  config = {
    homeData: {}
  };
};
