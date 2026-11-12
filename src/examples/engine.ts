import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import { disposeHandle, type SdkExample } from "./types";
import { CENTER, POLYGON, report } from "./sample";

const cesiumNames = [
  "Viewer",
  "Primitive",
  "Scene",
  "clone",
  "Clock",
  "Camera",
  "createGuid",
  "ImageryLayer",
  "Cartesian3",
  "Cartesian2",
  "Color",
  "Math",
  "Entity",
  "CustomDataSource",
  "Cartographic",
  "Rectangle",
  "SceneMode",
  "GeoJsonDataSource",
  "ScreenSpaceEventHandler",
  "ScreenSpaceEventType"
];

const olNames = [
  "WGS84",
  "WebMercator",
  "style",
  "geom",
  "Map",
  "View",
  "Feature",
  "Collection",
  "Extent",
  "TileLayer",
  "VectorLayer",
  "XYZ",
  "VectorSource",
  "ScaleLine",
  "MousePosition",
  "GeoJSON",
  "toLonLat",
  "fromLonLat",
  "transform",
  "transformExtent"
];

export const engineExamples: SdkExample[] = [
  {
    id: "cesium-barrel",
    group: "引擎导出",
    name: "Cesium 重导出",
    from: "sdk/cesium",
    summary: `sdk/cesium 统一转出 Cesium 对象，供其他 SDK 文件使用。本页列出常用导出，并用 Cartesian3、Color、Math 回显测试点。完整导出还包括 Imagery、Geometry、Material 等，见源码 sdk/cesium/index.js。常用项：${cesiumNames.join("、")}`,
    engine: "cesium",
    methods: ["Cartesian3.fromDegrees", "Color.fromCssColorString", "Math.toRadians", "createGuid"],
    mount(ctx) {
      const entity = ctx.viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1], 0),
        point: {
          pixelSize: 14,
          color: Cesium.Color.fromCssColorString("#36cfc9")
        },
        label: {
          text: Cesium.createGuid().slice(0, 8),
          pixelOffset: new Cesium.Cartesian2(0, -18),
          fillColor: Cesium.Color.WHITE
        }
      });
      return { api: Cesium, dispose: () => ctx.viewer.entities.remove(entity) };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "Math.toRadians",
        run(handle, ctx) {
          report(ctx, "toRadians(-90)", handle.api.Math.toRadians(-90));
        }
      },
      {
        name: "SceneMode",
        run(handle, ctx) {
          report(ctx, "SCENE3D", handle.api.SceneMode.SCENE3D);
        }
      }
    ]
  },
  {
    id: "ol-barrel",
    group: "引擎导出",
    name: "OpenLayers 重导出",
    from: "sdk/ol",
    summary: `sdk/ol 转出地图、视图、图层和投影。本页用 Feature 与 geom 回显测试面。导出项：${olNames.join("、")}`,
    engine: "ol",
    methods: ["Map", "View", "Feature", "geom", "style", "WGS84", "transformExtent"],
    mount(ctx) {
      const geometry = new ol.geom.Polygon([POLYGON.concat([POLYGON[0]])]);
      const feature = new ol.Feature(geometry);
      feature.setStyle(
        new ol.style.Style({
          fill: new ol.style.Fill({ color: "rgba(22,119,255,0.35)" }),
          stroke: new ol.style.Stroke({ color: "#69c0ff", width: 2 })
        })
      );
      const layer = new ol.VectorLayer({ source: new ol.VectorSource({ features: [feature] }) });
      ctx.olMap.addLayer(layer);
      return { api: ol, dispose: () => ctx.olMap.removeLayer(layer) };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "WGS84",
        run(handle, ctx) {
          report(ctx, "WGS84", handle.api.WGS84);
        }
      },
      {
        name: "transformExtent",
        run(handle, ctx) {
          report(
            ctx,
            "4326->3857",
            handle.api.transformExtent([116.36, 39.88, 116.46, 39.94], handle.api.WGS84, handle.api.WebMercator)
          );
        }
      }
    ]
  }
];
