import { reactive } from "vue";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import { createViewer, AMapImageryProvider } from "@/3dMap/sdk/cesiumUtils";
import { setOlMap, setViewer, viewer, olMap } from "@/3dMap/global";
import { defaults as defaultInteractions } from "ol/interaction";

/** 示例页读取的运行时地图，创建完成后置 ready */
export const mapRuntime = reactive({
  ready: false,
  viewer: null as any,
  olMap: null as any
});

const HOME = { lon: 116.397, lat: 39.909, height: 28000 };

/** 三维底图走 SDK 的高德电子图，并按 WGS84 纠偏 */
function addCesiumBase(target: any) {
  target.imageryLayers.addImageryProvider(
    new AMapImageryProvider({ style: "elec", crs: "WGS84" })
  );
}

function flyCesiumHome(target: any) {
  target.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(HOME.lon, HOME.lat, HOME.height),
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-90),
      roll: 0
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
  return result;
}

/** 创建二维地图，投影与原项目一致为 EPSG:4326 */
export function mountOl() {
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
      center: [HOME.lon, HOME.lat],
      zoom: 12,
      projection: ol.WGS84
    }),
    interactions: defaultInteractions({
      doubleClickZoom: false
    })
  });
  map.addControl(new ol.ScaleLine({ units: "metric" }));
  map.addControl(new ol.MousePosition());
  setOlMap(map);
  mapRuntime.olMap = map;
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
