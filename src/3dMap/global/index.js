import mapData from "@/3dMap/store/map";

/** 地图全局状态，路径与原项目一致，供未改动的 SDK 引用 */
export let viewer = null;
export let olMap = null;
export let cameraHandler = {};
export let config = {
  homeData: {}
};

export const setViewer = data => {
  viewer = data;
};
export const setOlMap = data => {
  olMap = data;
};
export const setCameraHandler = (data, mapMode = "cesium") => {
  cameraHandler[mapMode] = data;
};
export const getCameraHandler = () => {
  return cameraHandler[mapData().mapMode];
};
export const setMapConfig = (data = {}) => {
  for (const key in data) {
    config[key] = data[key];
  }
};
export const resetMapGlobals = () => {
  viewer = null;
  olMap = null;
  cameraHandler = {};
  config = { homeData: {} };
};
