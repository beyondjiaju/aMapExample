import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import * as olSdk from "@/3dMap/sdk/olUtils";
import * as pub from "@/3dMap/sdk/publicUtils";
import { disposeHandle, type SdkExample } from "./types";
import {
  CENTER,
  POLYGON,
  cesiumPolygon,
  report,
  styledFeature
} from "./sample";

function polygonFeature(id = "demo-feature") {
  return styledFeature(new ol.geom.Polygon([POLYGON.concat([POLYGON[0]])]), id, "测试面");
}

export const queryExamples: SdkExample[] = [
  {
    id: "shape-coordinates",
    group: "坐标工具",
    name: "shapeCoordinates",
    from: "cesiumUtils/utils/coordinate",
    summary: "圆、扇形等坐标计算。初始化用 getCirclePositions 回显一个圆，其余方法把结果写入日志。",
    engine: "common",
    methods: [
      "getPositionByRadiusAngle",
      "getCirclePositions",
      "getSectorPositions",
      "getBufferPositions",
      "getRectangleCirclePositions"
    ],
    mount(ctx) {
      const positions = cesiumSdk.shapeCoordinates.getCirclePositions(CENTER, 1800, "degrees");
      if (ctx.mode === "3d") {
        const entity = ctx.viewer.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArray(positions.flat()),
            width: 2,
            material: Cesium.Color.fromCssColorString("#36cfc9")
          }
        });
        return { api: cesiumSdk.shapeCoordinates, dispose: () => ctx.viewer.entities.remove(entity) };
      }
      const feature = styledFeature(new ol.geom.LineString(positions), "shape-circle", "");
      const layer = new ol.VectorLayer({ source: new ol.VectorSource({ features: [feature] }) });
      ctx.olMap.addLayer(layer);
      return { api: cesiumSdk.shapeCoordinates, dispose: () => ctx.olMap.removeLayer(layer) };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "getPositionByRadiusAngle",
        run(handle, ctx) {
          report(ctx, "45°", handle.api.getPositionByRadiusAngle(CENTER, 1800, 45, "degrees"));
        }
      },
      {
        name: "getSectorPositions",
        run(handle, ctx) {
          const first = CENTER;
          const second = handle.api.getPositionByRadiusAngle(CENTER, 1800, 20, "degrees");
          const end = handle.api.getPositionByRadiusAngle(CENTER, 1800, 120, "degrees");
          report(ctx, "getSectorPositions", handle.api.getSectorPositions(first, second, end));
        }
      },
      {
        name: "getBufferPositions",
        run(handle, ctx) {
          report(
            ctx,
            "getBufferPositions",
            handle.api.getBufferPositions(10, 80, Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1]) && {
              type: "Feature",
              geometry: { type: "Point", coordinates: CENTER }
            }, 1.2, { units: "kilometers" })
          );
        }
      }
    ]
  },
  {
    id: "coordinate-conversion",
    group: "坐标工具",
    name: "coordinateConversionTool",
    from: "cesiumUtils/utils/coordinate",
    summary: "度与度分秒互转。初始化把测试点转成度分秒并写在日志里。",
    engine: "common",
    methods: ["degreesToDegrees60", "degrees60ToDegrees", "longitudeNormalize", "verify"],
    mount(ctx) {
      const text = cesiumSdk.coordinateConversionTool.degreesToDegrees60(CENTER[0], CENTER[1], true);
      ctx.log(`测试点 ${describeSafe(text)}`);
      return { api: cesiumSdk.coordinateConversionTool, dispose() {} };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "degreesToDegrees60",
        run(handle, ctx) {
          report(ctx, "degreesToDegrees60", handle.api.degreesToDegrees60(116.397, 39.909, true));
        }
      },
      {
        name: "degrees60ToDegrees",
        run(handle, ctx) {
          report(ctx, "degrees60ToDegrees", handle.api.degrees60ToDegrees("E116°23′49.2″ N39°54′32.4″"));
        }
      },
      {
        name: "longitudeNormalize",
        run(handle, ctx) {
          report(ctx, "longitudeNormalize(190)", handle.api.longitudeNormalize(190));
        }
      },
      {
        name: "verify",
        run(handle, ctx) {
          report(ctx, "verify", handle.api.verify("E116°23′49″ N39°54′32″"));
        }
      }
    ]
  },
  {
    id: "locate-to-coordinates",
    group: "坐标工具",
    name: "locateToCoordinates",
    from: "publicUtils",
    summary: "按当前地图模式定位。单点直接飞到测试点，多点按包围范围定位。切换 2D/3D 后再次调用会落到对应引擎。",
    engine: "common",
    methods: ["locateToCoordinates"],
    mount(ctx) {
      markCenter(ctx);
      pub.locateToCoordinates(POLYGON, { padding: [80, 80, 80, 80], duration: 0.6 });
      return { api: pub.locateToCoordinates, dispose: () => clearMark(ctx) };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "定位单点",
        run(_handle, ctx) {
          pub.locateToCoordinates(CENTER, { duration: 0.8, padding: [80, 80, 80, 80] });
          ctx.log("已定位到测试中心点");
        }
      },
      {
        name: "定位范围",
        run(_handle, ctx) {
          pub.locateToCoordinates(POLYGON, { duration: 0.8, padding: [80, 80, 80, 80] });
          ctx.log("已按测试面范围定位");
        }
      }
    ]
  },
  {
    id: "get-center",
    group: "坐标工具",
    name: "getCenterByCoordinates",
    from: "publicUtils",
    summary: "计算坐标集合中心。两点取中点，三点以上取面内中心，并在地图上回显。",
    engine: "common",
    methods: ["getCenterByCoordinates"],
    mount(ctx) {
      const center = pub.getCenterByCoordinates(POLYGON);
      const bag = showPoint(ctx, center as [number, number], "中心");
      ctx.log(`中心点 ${center}`);
      return { api: pub.getCenterByCoordinates, dispose: () => bag() };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "两点中点",
        run(handle, ctx) {
          report(ctx, "两点", handle.api([POLYGON[0], POLYGON[2]]));
        }
      },
      {
        name: "面内中心",
        run(handle, ctx) {
          report(ctx, "多边形", handle.api(POLYGON));
        }
      }
    ]
  },
  {
    id: "height-tool",
    group: "坐标工具",
    name: "getHeight / heightToZoom",
    from: "olUtils/utils/HeightTool",
    summary: "视点高度与 zoom 换算。二维下读取当前地图高度，两种模式都可以把样本高度转成 zoom。",
    engine: "common",
    methods: ["getHeight", "heightToZoom"],
    mount(ctx) {
      const zoom = olSdk.heightToZoom(28000);
      ctx.log(`28000 米约等于 zoom ${zoom}`);
      if (ctx.mode === "2d") ctx.log(`当前地图高度 ${olSdk.getHeight(ctx.olMap).toFixed(1)} 米`);
      return { api: { getHeight: olSdk.getHeight, heightToZoom: olSdk.heightToZoom }, dispose() {} };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "getHeight",
        run(handle, ctx) {
          if (ctx.mode !== "2d") {
            ctx.log("getHeight 需要二维地图，请先切到 2D");
            return;
          }
          report(ctx, "getHeight", handle.api.getHeight(ctx.olMap));
        }
      },
      {
        name: "heightToZoom",
        run(handle, ctx) {
          report(ctx, "heightToZoom(8000)", handle.api.heightToZoom(8000));
        }
      }
    ]
  },
  {
    id: "zoom-tool",
    group: "坐标工具",
    name: "getFitExtentAutoZoom",
    from: "olUtils/utils/ZoomTool",
    summary: "按测试范围计算二维合适的缩放上下限，并 fit 到该范围。",
    engine: "ol",
    methods: ["getFitExtentAutoZoom"],
    mount(ctx) {
      const extent = [116.36, 39.88, 116.46, 39.94];
      const limit = olSdk.getFitExtentAutoZoom(ctx.olMap, extent);
      ctx.olMap.getView().fit(extent, { padding: [80, 80, 80, 80], duration: 400, maxZoom: limit.maxZoom });
      ctx.log(`maxZoom=${limit.maxZoom} minZoom=${limit.minZoom}`);
      return { api: olSdk.getFitExtentAutoZoom, dispose() {} };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "重新计算",
        run(handle, ctx) {
          report(ctx, "getFitExtentAutoZoom", handle.api(ctx.olMap, [116.2, 39.7, 116.6, 40.1]));
        }
      }
    ]
  },
  {
    id: "color-tool",
    group: "坐标工具",
    name: "getColorAlpha",
    from: "olUtils/utils/CorlorTool",
    summary: "给十六进制颜色补透明度。初始化用转换后的颜色回显一个面。",
    engine: "common",
    methods: ["getColorAlpha"],
    mount(ctx) {
      const color = olSdk.getColorAlpha("#1677ff", 0.45);
      ctx.log(color);
      if (ctx.mode === "3d") {
        const entity = ctx.viewer.entities.add({
          polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(POLYGON.flat()),
            material: Cesium.Color.fromCssColorString("#1677ff").withAlpha(0.45)
          }
        });
        return { api: olSdk.getColorAlpha, dispose: () => ctx.viewer.entities.remove(entity) };
      }
      const feature = styledFeature(new ol.geom.Polygon([POLYGON.concat([POLYGON[0]])]));
      feature.getStyle().getFill().setColor(color);
      const layer = new ol.VectorLayer({ source: new ol.VectorSource({ features: [feature] }) });
      ctx.olMap.addLayer(layer);
      return { api: olSdk.getColorAlpha, dispose: () => ctx.olMap.removeLayer(layer) };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "getColorAlpha",
        run(handle, ctx) {
          report(ctx, "#36cfc9 / 0.3", handle.api("#36cfc9", 0.3));
        }
      }
    ]
  },
  {
    id: "height-light-entity",
    group: "查询高亮",
    name: "HeightLightEntity",
    from: "cesiumUtils/business/heightLightEntity",
    summary: "按实体高亮。先放入测试面，再 add / addById 改成高亮色，可移除。",
    engine: "cesium",
    methods: ["addById", "add", "removeById", "remove", "removeAll", "getAll", "destroy"],
    mount(ctx) {
      const entity = cesiumPolygon(ctx.viewer, POLYGON, "hl-entity");
      const api = new cesiumSdk.HeightLightEntity(ctx.viewer);
      api.add(entity, { color: "#ff4d4f", alpha: 0.65 });
      return {
        api,
        dispose() {
          api.destroy();
          ctx.viewer.entities.remove(entity);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      { name: "removeAll", run: handle => handle.api.removeAll() },
      { name: "addById", run: handle => handle.api.addById("hl-entity", { color: "#faad14", alpha: 0.7 }) },
      { name: "getAll", run: (handle, ctx) => report(ctx, "getAll", handle.api.getAll()) }
    ]
  },
  {
    id: "height-light-feature",
    group: "查询高亮",
    name: "HeightLightFeature",
    from: "olUtils/business",
    summary: "按要素高亮。测试面带 featureData 样式，addById 后颜色改为高亮色。",
    engine: "ol",
    methods: ["addById", "add", "removeById", "removeAll", "getAll", "destroy"],
    mount(ctx) {
      const feature = polygonFeature("hl-feature");
      const layer = new ol.VectorLayer({ source: new ol.VectorSource({ features: [feature] }) });
      ctx.olMap.addLayer(layer);
      const api = new olSdk.HeightLightFeature(ctx.olMap);
      api.addById("hl-feature", { color: "#ff4d4f", alpha: 0.65 });
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
      { name: "removeAll", run: handle => handle.api.removeAll() },
      { name: "addById", run: handle => handle.api.addById("hl-feature", { color: "#faad14", alpha: 0.7 }) },
      { name: "getAll", run: (handle, ctx) => report(ctx, "getAll", handle.api.getAll()) }
    ]
  },
  {
    id: "height-light-layer",
    group: "查询高亮",
    name: "HeightLightLayer",
    from: "olUtils/business",
    summary: "按图层 id 高亮图层内全部要素。",
    engine: "ol",
    methods: ["addById", "add", "removeById", "removeAll", "getAll", "destroy"],
    mount(ctx) {
      const layer = new ol.VectorLayer({ source: new ol.VectorSource({ features: [polygonFeature()] }) });
      layer.set("id", "hl-layer");
      layer.set("properties", { fillAlpha: 0.35, outlineAlpha: 1, fillColor: "#1677ff" });
      ctx.olMap.addLayer(layer);
      const api = new olSdk.HeightLightLayer(ctx.olMap);
      api.addById("hl-layer", { color: "#ff4d4f", alpha: 0.6 });
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
      { name: "removeById", run: handle => handle.api.removeById("hl-layer") },
      { name: "addById", run: handle => handle.api.addById("hl-layer", { color: "#36cfc9", alpha: 0.55 }) }
    ]
  },
  {
    id: "get-entity-by-id",
    group: "查询高亮",
    name: "getEntityFromAllCollectionById",
    from: "cesiumUtils/business",
    summary: "在全部实体集合里按 id 查找。初始化放入 viewer.entities 与一个 DataSource 各一个测试实体。",
    engine: "cesium",
    methods: ["getEntityFromAllCollectionById"],
    mount(ctx) {
      const entity = cesiumPolygon(ctx.viewer, POLYGON, "find-entity");
      const source = new Cesium.CustomDataSource("find-source");
      source.entities.add({
        id: "find-source-entity",
        position: Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1]),
        point: { pixelSize: 12, color: Cesium.Color.YELLOW }
      });
      ctx.viewer.dataSources.add(source);
      return {
        api: cesiumSdk.getEntityFromAllCollectionById,
        dispose() {
          ctx.viewer.entities.remove(entity);
          ctx.viewer.dataSources.remove(source, true);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "查 viewer 实体",
        run(handle, ctx) {
          report(ctx, "find-entity", handle.api(ctx.viewer, "find-entity"));
        }
      },
      {
        name: "查 DataSource",
        run(handle, ctx) {
          report(ctx, "find-source-entity", handle.api(ctx.viewer, "find-source-entity"));
        }
      }
    ]
  },
  {
    id: "get-route-cesium",
    group: "查询高亮",
    name: "getRouteDataFromAllCollectionById",
    from: "cesiumUtils/business",
    summary: "按航线 useId 收集实体。测试实体 properties.id 为 route-1。",
    engine: "cesium",
    methods: ["getRouteDataFromAllCollectionById"],
    mount(ctx) {
      const entity = ctx.viewer.entities.add({
        id: "route-seg",
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([116.36, 39.9, 116.48, 39.93]),
          width: 4,
          material: Cesium.Color.fromCssColorString("#36cfc9")
        },
        properties: { id: "route-1" }
      });
      return {
        api: cesiumSdk.getRouteDataFromAllCollectionById,
        dispose: () => ctx.viewer.entities.remove(entity)
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "查询 route-1",
        run(handle, ctx) {
          report(ctx, "route-1", handle.api(ctx.viewer, "route-1"));
        }
      }
    ]
  },
  {
    id: "get-feature-by-id",
    group: "查询高亮",
    name: "getFeatureFromAllLayerById",
    from: "olUtils/business",
    summary: "在全部矢量图层中按 id 找要素。",
    engine: "ol",
    methods: ["getFeatureFromAllLayerById"],
    mount(ctx) {
      const layer = new ol.VectorLayer({
        source: new ol.VectorSource({ features: [polygonFeature("find-feature")] })
      });
      ctx.olMap.addLayer(layer);
      return {
        api: olSdk.getFeatureFromAllLayerById,
        dispose: () => ctx.olMap.removeLayer(layer)
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "查询 find-feature",
        run(handle, ctx) {
          report(ctx, "find-feature", handle.api(ctx.olMap, "find-feature"));
        }
      }
    ]
  },
  {
    id: "get-route-ol",
    group: "查询高亮",
    name: "getRouteDataFromAllLayerById",
    from: "olUtils/business",
    summary: "按航线 useId 收集二维要素。",
    engine: "ol",
    methods: ["getRouteDataFromAllLayerById"],
    mount(ctx) {
      const feature = styledFeature(new ol.geom.LineString(POLYGON.slice(0, 3)), "route-seg", "航段");
      feature.set("properties", { id: "route-1" });
      const layer = new ol.VectorLayer({ source: new ol.VectorSource({ features: [feature] }) });
      ctx.olMap.addLayer(layer);
      return {
        api: olSdk.getRouteDataFromAllLayerById,
        dispose: () => ctx.olMap.removeLayer(layer)
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "查询 route-1",
        run(handle, ctx) {
          report(ctx, "route-1", handle.api(ctx.olMap, "route-1"));
        }
      }
    ]
  },
  {
    id: "feature-changed",
    group: "查询高亮",
    name: "featureChanged",
    from: "olUtils/utils/FeatureChanged",
    summary: "改要素填充色与边线色。初始化是蓝色测试面，按钮把它改成青色。",
    engine: "ol",
    methods: ["featureChanged"],
    mount(ctx) {
      const feature = polygonFeature();
      const layer = new ol.VectorLayer({ source: new ol.VectorSource({ features: [feature] }) });
      ctx.olMap.addLayer(layer);
      return {
        api: { featureChanged: olSdk.featureChanged, feature },
        dispose: () => ctx.olMap.removeLayer(layer)
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "改成青色",
        run(handle) {
          handle.api.featureChanged(handle.api.feature, {
            color: "#36cfc9",
            alpha: 0.55,
            outlineColor: "#87e8de",
            outlineAlpha: 1
          });
        }
      }
    ]
  },
  {
    id: "contains-layer",
    group: "查询高亮",
    name: "containsLayer",
    from: "olUtils/utils/ContainsLayer",
    summary: "判断图层是否还在地图上。初始化添加测试图层，移除后再次判断。",
    engine: "ol",
    methods: ["containsLayer"],
    mount(ctx) {
      const layer = new ol.VectorLayer({
        source: new ol.VectorSource({ features: [polygonFeature("contains-feature")] })
      });
      ctx.olMap.addLayer(layer);
      return {
        api: { containsLayer: olSdk.containsLayer, layer },
        dispose() {
          if (olSdk.containsLayer(ctx.olMap, layer)) ctx.olMap.removeLayer(layer);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "containsLayer",
        run(handle, ctx) {
          report(ctx, "containsLayer", handle.api.containsLayer(ctx.olMap, handle.api.layer));
        }
      },
      {
        name: "移除后再判断",
        run(handle, ctx) {
          ctx.olMap.removeLayer(handle.api.layer);
          report(ctx, "containsLayer", handle.api.containsLayer(ctx.olMap, handle.api.layer));
        }
      }
    ]
  },
  {
    id: "get-layer-by-id",
    group: "查询高亮",
    name: "getLayerById",
    from: "olUtils/utils/GetLayerById",
    summary: "按图层 id 取值。测试图层 id 为 layer-demo。",
    engine: "ol",
    methods: ["getLayerById"],
    mount(ctx) {
      const layer = new ol.VectorLayer({
        source: new ol.VectorSource({ features: [polygonFeature()] })
      });
      layer.set("id", "layer-demo");
      ctx.olMap.addLayer(layer);
      return {
        api: olSdk.getLayerById,
        dispose: () => ctx.olMap.removeLayer(layer)
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "getLayerById",
        run(handle, ctx) {
          report(ctx, "layer-demo", handle.api(ctx.olMap, "layer-demo"));
        }
      }
    ]
  }
];

function describeSafe(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function showPoint(ctx: { mode: string; viewer: any; olMap: any }, point: [number, number], text: string) {
  if (!point) return () => undefined;
  if (ctx.mode === "3d") {
    const entity = ctx.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(point[0], point[1]),
      point: { pixelSize: 10, color: Cesium.Color.YELLOW },
      label: { text, pixelOffset: new Cesium.Cartesian2(0, -16), fillColor: Cesium.Color.WHITE }
    });
    return () => ctx.viewer.entities.remove(entity);
  }
  const feature = styledFeature(new ol.geom.Point(point), "center-point", text);
  const layer = new ol.VectorLayer({ source: new ol.VectorSource({ features: [feature] }) });
  ctx.olMap.addLayer(layer);
  return () => ctx.olMap.removeLayer(layer);
}

const marks = new WeakMap<object, () => void>();

function markCenter(ctx: { mode: string; viewer: any; olMap: any }) {
  clearMark(ctx);
  marks.set(ctx.mode === "3d" ? ctx.viewer : ctx.olMap, showPoint(ctx, CENTER, "定位点"));
}

function clearMark(ctx: { mode: string; viewer: any; olMap: any }) {
  const key = ctx.mode === "3d" ? ctx.viewer : ctx.olMap;
  marks.get(key)?.();
  marks.delete(key);
}
