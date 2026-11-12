import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import * as olSdk from "@/3dMap/sdk/olUtils";
import { destroyCesium, recreateCesium } from "@/map/createMaps";
import { viewer as mapViewer } from "@/3dMap/global";
import { disposeHandle, type SdkExample } from "./types";
import {
  POLYGON,
  POLYLINE,
  cesiumPolygon,
  report,
  styledFeature,
  trapCalls
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
    id: "create-viewer",
    group: "地图基础",
    name: "createViewer",
    from: "cesiumUtils/utils/CreateViewer",
    summary: "页面启动时已用 createViewer 创建三维球。本页可注销并按同样参数重建。",
    engine: "cesium",
    methods: ["createViewer"],
    async mount() {
      if (!mapViewer || mapViewer.isDestroyed?.()) {
        await recreateCesium();
      }
      return {
        api: mapViewer,
        dispose() {
          destroyCesium();
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "重建 Viewer",
        async run(_handle, ctx) {
          await recreateCesium();
          ctx.log("已重新调用 createViewer");
        }
      }
    ]
  },
  {
    id: "navigation",
    group: "地图基础",
    name: "navigation",
    from: "cesiumUtils/utils/Navigation",
    summary: "罗盘与比例尺。初始化后出现在三维球上，注销时调用导航控件 destroy。",
    engine: "cesium",
    methods: ["navigation"],
    mount(ctx) {
      const api = cesiumSdk.navigation(ctx.viewer, {
        enableCompass: true,
        enableZoomControls: true,
        enableDistanceLegend: true
      });
      return {
        api,
        dispose() {
          api?.destroy?.();
        }
      };
    },
    unmount: disposeHandle,
    actions: []
  },
  {
    id: "map-coordinates",
    group: "地图基础",
    name: "map3DCoordinates / map2DCoordinates",
    from: "cesiumUtils / olUtils",
    summary: "鼠标坐标条。二维、三维各用对应实现，切换时注销当前监听再按新模式初始化。",
    engine: "both",
    methods: ["map3DCoordinates", "map2DCoordinates"],
    mount(ctx) {
      if (ctx.mode === "3d") {
        const trapped = trapCalls(ctx.viewer.scene.postRender, "addEventListener", () =>
          cesiumSdk.map3DCoordinates({
            viewer: ctx.viewer,
            type: 1,
            id: "map3DCoordinates"
          })
        );
        return {
          api: trapped.result,
          dispose() {
            trapped.caught.forEach(fn => ctx.viewer.scene.postRender.removeEventListener(fn));
            const dom = document.getElementById("map3DCoordinates");
            if (dom) dom.innerHTML = "";
          }
        };
      }
      const api = olSdk.map2DCoordinates({
        map: ctx.olMap,
        type: 1,
        id: "map2DCoordinates"
      });
      return {
        api,
        dispose() {
          const dom = document.getElementById("map2DCoordinates");
          if (dom) dom.innerHTML = "";
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "切换度分秒",
        run(handle, ctx) {
          handle.api.type = handle.api.type === 1 ? 0 : 1;
          ctx.log(`type = ${handle.api.type}`);
        }
      }
    ]
  },
  {
    id: "camera-handler",
    group: "地图基础",
    name: "CameraHanlder",
    from: "cesiumUtils / olUtils",
    summary: "相机高度限制与缩放。三维额外提供俯仰限制，二维用 zoom 实现同样的放大缩小。",
    engine: "both",
    methods: ["setPitchLimit", "setHeightLimit", "zoomIn", "zoomOut"],
    mount(ctx) {
      if (ctx.mode === "3d") {
        const api = new cesiumSdk.CameraHanlder(ctx.viewer);
        api.setHeightLimit({ min: 200, max: 8000000 });
        api.setPitchLimit({ min: 5, max: 89 });
        return { api, dispose() {} };
      }
      const api = new olSdk.CameraHanlder(ctx.olMap);
      api.setHeightLimit({ min: 200, max: 8000000 });
      return { api, dispose() {} };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "zoomIn",
        run(handle) {
          handle.api.zoomIn();
        }
      },
      {
        name: "zoomOut",
        run(handle) {
          handle.api.zoomOut();
        }
      },
      {
        name: "setHeightLimit",
        run(handle, ctx) {
          handle.api.setHeightLimit({ min: 500, max: 2000000 });
          ctx.log("高度限制 500 ~ 2000000");
        }
      }
    ]
  },
  {
    id: "keydown-camera",
    group: "地图基础",
    name: "keyDownControlCamera",
    from: "cesiumUtils/utils/KeyDownControlCamera",
    summary: "方向键平移相机。初始化后可用上下左右移动，注销时摘掉键盘监听。",
    engine: "cesium",
    methods: ["addEventListener"],
    mount(ctx) {
      const caught: any[] = [];
      const origin = document.addEventListener;
      document.addEventListener = function (type: string, fn: any, opt?: any) {
        if (type === "keydown") caught.push(fn);
        return origin.call(document, type, fn, opt);
      } as any;
      let api: any;
      try {
        api = cesiumSdk.keyDownControlCamera(ctx.viewer);
      } finally {
        document.addEventListener = origin;
      }
      return {
        api,
        dispose() {
          caught.forEach(fn => document.removeEventListener("keydown", fn));
        }
      };
    },
    unmount: disposeHandle,
    actions: []
  },
  {
    id: "overview-map",
    group: "地图基础",
    name: "OverViewMap",
    from: "cesiumUtils/utils/overViewMap",
    summary: "鹰眼图。初始化后挂在三维容器角落，可切换显示并在离开时 destroy。",
    engine: "cesium",
    methods: ["addListener", "setVisible", "removeListener", "destroy"],
    mount(ctx) {
      const api = new cesiumSdk.OverViewMap({
        viewer: ctx.viewer,
        width: 220,
        height: 140,
        left: 300,
        bottom: 16,
        right: "none",
        top: "none"
      });
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "setVisible(false)",
        run(handle) {
          handle.api.setVisible(false);
        }
      },
      {
        name: "setVisible(true)",
        run(handle) {
          handle.api.setVisible(true);
        }
      }
    ]
  },
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
