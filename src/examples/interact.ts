import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import * as olSdk from "@/3dMap/sdk/olUtils";
import { disposeHandle, type SdkExample } from "./types";
import {
  POLYGON,
  POLYLINE,
  cesiumPolygon,
  report,
  styledFeature
} from "./sample";

const drawMethods = [
  "start",
  "upDataAttribute",
  "stop",
  "clear",
  "destroy",
  "drawPoint",
  "drawPolyline",
  "drawPolygon",
  "drawRectangle",
  "drawCircle",
  "drawSector",
  "drawRectangleCircle"
];

function drawActions(kinds: string[]) {
  return [
    ...kinds.map(type => ({
      name: `start(${type})`,
      run(handle: any) {
        handle.api.start(type);
      }
    })),
    {
      name: "stop",
      run(handle: any) {
        handle.api.stop();
      }
    },
    {
      name: "clear",
      run(handle: any) {
        handle.api.clear();
      }
    },
    {
      name: "upDataAttribute",
      run(handle: any, ctx: any) {
        handle.api.upDataAttribute("color", "#36cfc9");
        ctx.log("upDataAttribute(color, #36cfc9)");
      }
    }
  ];
}

export const interactExamples: SdkExample[] = [
  {
    id: "draw-handler",
    group: "绘制测量",
    name: "DrawHandler",
    from: "cesiumUtils / olUtils",
    summary: "绘制点、线、面、矩形、圆、扇形。进入页面先回显一块测试多边形，再按按钮开始交互绘制。",
    engine: "both",
    methods: drawMethods,
    mount(ctx) {
      if (ctx.mode === "3d") {
        const api = new cesiumSdk.DrawHandler(ctx.viewer, { color: Cesium.Color.CYAN.withAlpha(0.45) });
        api.add({
          name: "polygon",
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(POLYGON.flat()),
            material: Cesium.Color.CYAN.withAlpha(0.35)
          }
        });
        return { api, dispose: () => api.destroy() };
      }
      const api = new olSdk.DrawHandler(ctx.olMap, { color: "#36cfc9", alpha: 0.35 });
      api.layer.getSource().addFeature(
        styledFeature(new ol.geom.Polygon([POLYGON.concat([POLYGON[0]])]), "draw-demo", "测试面")
      );
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: drawActions(["point", "polyline", "polygon", "rectangle", "circle", "sector"])
  },
  {
    id: "draw-handler-edit",
    group: "绘制测量",
    name: "DrawHandlerEdit",
    from: "cesiumUtils / olUtils",
    summary: "图形节点编辑。初始化时放入一条测试折线，拖动节点即可修改。注销时 clear 并移除编辑图层。",
    engine: "both",
    methods: ["start", "addPoints", "addLines", "addGeometry", "clear", "lockCamera", "unlockCamera"],
    mount(ctx) {
      const option = {
        type: "polyline",
        coordinates: POLYLINE.map(point => [point[0], point[1], 0]),
        maxHeight: 0
      };
      if (ctx.mode === "3d") {
        const api = new cesiumSdk.DrawHandlerEdit(ctx.viewer, { color: "#36cfc9", alpha: 0.7 });
        api.start(option);
        return {
          api,
          dispose() {
            api.clear();
            ctx.viewer.dataSources.remove(api.points, true);
            ctx.viewer.dataSources.remove(api.lines, true);
            api.handler?.destroy?.();
          }
        };
      }
      const api = new olSdk.DrawHandlerEdit(ctx.olMap, { color: "#36cfc9", alpha: 0.7 });
      api.start(option);
      return {
        api,
        dispose() {
          api.clear();
          ctx.olMap.removeLayer(api.points);
          ctx.olMap.removeLayer(api.lines);
          ctx.olMap.removeLayer(api.geometry);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "clear",
        run(handle) {
          handle.api.clear();
        }
      },
      {
        name: "重新 start",
        run(handle) {
          handle.api.start({
            type: "polyline",
            coordinates: POLYLINE.map(point => [point[0], point[1], 0]),
            maxHeight: 0
          });
        }
      }
    ]
  },
  {
    id: "measure-handler",
    group: "绘制测量",
    name: "MeasureHandler",
    from: "cesiumUtils / olUtils",
    summary: "坐标、距离、面积测量。二维与三维使用各自的 MeasureHandler，切换时销毁当前测量结果。",
    engine: "both",
    methods: ["start", "coordinate", "distance", "area", "stop", "clear", "destroy"],
    mount(ctx) {
      const api =
        ctx.mode === "3d"
          ? new cesiumSdk.MeasureHandler(ctx.viewer, { color: "#36cfc9" })
          : new olSdk.MeasureHandler(ctx.olMap, { color: "#36cfc9" });
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: [
      { name: "coordinate", run: handle => handle.api.coordinate?.() || handle.api.start("coordinate") },
      { name: "distance", run: handle => handle.api.distance?.() || handle.api.start("distance") },
      { name: "area", run: handle => handle.api.area?.() || handle.api.start("area") },
      { name: "stop", run: handle => handle.api.stop() },
      { name: "clear", run: handle => handle.api.clear() }
    ]
  },
  {
    id: "rectangle-pick",
    group: "绘制测量",
    name: "RectanglePick",
    from: "cesiumUtils / olUtils",
    summary: "拉框拾取。先回显测试面，再开启框选。filterFromCoordinates 用测试坐标演示相交判断。",
    engine: "both",
    methods: ["start", "filterFromCoordinates", "filter", "stop", "destroy"],
    mount(ctx) {
      if (ctx.mode === "3d") {
        const entity = cesiumPolygon(ctx.viewer);
        const api = new cesiumSdk.RectanglePick(ctx.viewer);
        api.enable = true;
        return {
          api,
          dispose() {
            api.destroy();
            ctx.viewer.entities.remove(entity);
          }
        };
      }
      const layer = new ol.VectorLayer({ source: new ol.VectorSource() });
      layer.getSource().addFeature(styledFeature(new ol.geom.Polygon([POLYGON.concat([POLYGON[0]])])));
      ctx.olMap.addLayer(layer);
      const api = new olSdk.RectanglePick(ctx.olMap);
      api.enable = true;
      return {
        api,
        dispose() {
          api.destroy();
          ctx.olMap.removeLayer(layer);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "filterFromCoordinates",
        run(handle, ctx) {
          const result = handle.api.filterFromCoordinates([
            [116.3, 39.85],
            [116.5, 39.85],
            [116.5, 39.96],
            [116.3, 39.96]
          ]);
          report(ctx, "filterFromCoordinates", result);
        }
      },
      { name: "stop", run: handle => handle.api.stop() },
      {
        name: "start",
        run(handle) {
          handle.api.enable = true;
          handle.api.start();
        }
      }
    ]
  }
];
