import { reactive } from "vue";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import { createViewer, AMapImageryProvider } from "@/3dMap/sdk/cesiumUtils";
import { setOlMap, setViewer, viewer, olMap, config } from "@/3dMap/global";
import { heightToZoom } from "@/3dMap/sdk/olUtils";
import { defaults as defaultInteractions } from "ol/interaction";
import { defaults as defaultControls } from "ol/control";
import { applyDragRotate } from "./dragRotate";

/** 示例页读取的运行时地图，创建完成后置 ready */
export const mapRuntime = reactive({
  ready: false,
  viewer: null as any,
  olMap: null as any
});

/** 还没读到 mapConfig 时，沿用原来的示例中心 */
const FALLBACK_HOME = { lon: 116.397, lat: 39.909, height: 28000 };

/** 初始定位优先用 hook 写入的 mapConfig.homeData */
function readHome() {
  const home = config.homeData || {};
  return {
    lon: home.longitude ?? FALLBACK_HOME.lon,
    lat: home.latitude ?? FALLBACK_HOME.lat,
    height: home.height ?? FALLBACK_HOME.height,
    heading: home.heading ?? 0,
    pitch: home.pitch ?? Cesium.Math.toRadians(-90),
    roll: home.roll ?? 0
  };
}

/** 三维底图走 SDK 的高德电子图，并按 WGS84 纠偏 */
function addCesiumBase(target: any) {
  target.imageryLayers.addImageryProvider(
    new AMapImageryProvider({ style: "elec", crs: "WGS84" })
  );
}

function flyCesiumHome(target: any) {
  const home = readHome();
  target.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(home.lon, home.lat, home.height),
    orientation: {
      heading: home.heading,
      pitch: home.pitch,
      roll: home.roll
    }
  });
}

/** 创建三维球。imageryProvider/baseLayer 关掉默认离子底图，改由 SDK 影像提供者加载 */
export async function mountCesium() {
  const result = await createViewer("cesiumContainer", {
    imageryProvider: false,
    baseLayer: false
  });
  setViewer(result);
  mapRuntime.viewer = result;
  addCesiumBase(result);
  flyCesiumHome(result);
  // 与二维使用同一旋转按键，默认滚轮按下
  applyDragRotate();
  return result;
}

/** 创建二维地图，投影与原项目一致为 EPSG:4326 */
export function mountOl() {
  const home = readHome();
  const map = new ol.Map({
    target: "olContainer",
    layers: [
      new ol.TileLayer({
        source: new ol.XYZ({
          url: "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
          projection: "EPSG:3857"
        })
      })
    ],
    view: new ol.View({
      center: [home.lon, home.lat],
      zoom: heightToZoom(home.height),
      projection: ol.WGS84,
      // 二维开启旋转，初始角与配置朝向一致
      enableRotation: true,
      rotation: home.heading
    }),
    // 不使用 OpenLayers 自带复位按钮，指北针沿用现有组件
    controls: defaultControls({
      rotate: false
    }),
    interactions: defaultInteractions({
      doubleClickZoom: false,
      // 旋转改由 dragRotate 按统一按键处理，不再使用 Alt+Shift
      altShiftDragRotate: false,
      pinchRotate: true
    })
  });
  map.addControl(new ol.ScaleLine({ units: "metric" }));
  map.addControl(new ol.MousePosition());
  setOlMap(map);
  mapRuntime.olMap = map;
  // 与三维使用同一旋转按键，默认滚轮按下
  applyDragRotate();
  return map;
}

export async function createMaps() {
  await mountCesium();
  mountOl();
  mapRuntime.ready = true;
}

/** 示例页「createViewer」注销后重建三维球，并写回全局引用 */
export async function recreateCesium() {
  if (viewer && !viewer.isDestroyed?.()) {
    viewer.destroy();
  }
  setViewer(null);
  mapRuntime.viewer = null;
  await mountCesium();
  viewer.resize?.();
}

export function destroyCesium() {
  if (viewer && !viewer.isDestroyed?.()) {
    viewer.destroy();
  }
  setViewer(null);
  mapRuntime.viewer = null;
}

export function resizeMaps() {
  viewer?.resize?.();
  olMap?.updateSize?.();
}
