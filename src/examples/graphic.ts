import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import * as olSdk from "@/3dMap/sdk/olUtils";
import { disposeHandle, type SdkExample } from "./types";
import {
  CENTER,
  POLYLINE,
  cesiumPolygon,
  heatData,
  report,
  trackPositions,
  windJson
} from "./sample";

const volumeData = () =>
  POLYLINE.map(point => ({
    point,
    leftWidth: 280,
    rightWidth: 280,
    minHeight: 0,
    maxHeight: 240,
    fillColor: "#1677ff",
    fillAlpha: 0.4,
    properties: { id: "route-demo", airDataUseType: "route" }
  }));

export const graphicExamples: SdkExample[] = [
  {
    id: "html-tag",
    group: "标注热力",
    name: "HtmlTag",
    from: "cesiumUtils / olUtils",
    summary: "单个 HTML 标签。初始化即在测试坐标回显，可改内容并注销。",
    engine: "both",
    methods: ["addListener", "setHtml", "destroy"],
    mount(ctx) {
      const html = `<div class="demo-tag">SDK HtmlTag</div>`;
      const api =
        ctx.mode === "3d"
          ? new cesiumSdk.HtmlTag(ctx.viewer, {
              position: Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1]),
              html,
              id: "tag-demo",
              noEvent: false,
              isDrag: true
            })
          : new olSdk.HtmlTag(ctx.olMap, {
              position: CENTER,
              html,
              id: "tag-demo",
              noEvent: false,
              isDrag: true
            });
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "setHtml",
        run(handle) {
          handle.api.setHtml(`<div class="demo-tag">已更新 ${new Date().toLocaleTimeString()}</div>`);
        }
      }
    ]
  },
  {
    id: "html-tag-collection",
    group: "标注热力",
    name: "HtmlTagCollection",
    from: "cesiumUtils / olUtils",
    summary: "标签集合。初始化放入两个测试标签，可整体显隐、按 id 删除、开启碰撞检测。",
    engine: "both",
    methods: ["add", "setVisible", "setVisibleById", "getById", "removeById", "removeAll", "setCollision", "isCrash", "destroy"],
    mount(ctx) {
      const Tag = ctx.mode === "3d" ? cesiumSdk.HtmlTag : olSdk.HtmlTag;
      const collection =
        ctx.mode === "3d"
          ? new cesiumSdk.HtmlTagCollection(ctx.viewer)
          : new olSdk.HtmlTagCollection(ctx.olMap);
      [0, 1].forEach(index => {
        const position =
          ctx.mode === "3d"
            ? Cesium.Cartesian3.fromDegrees(CENTER[0] + index * 0.02, CENTER[1])
            : [CENTER[0] + index * 0.02, CENTER[1]];
        const tag = new Tag(ctx.mode === "3d" ? ctx.viewer : ctx.olMap, {
          position,
          html: `<div class="demo-tag">标签 ${index + 1}</div>`,
          id: `tag-${index + 1}`
        });
        collection.add(tag);
      });
      return {
        api: collection,
        dispose() {
          collection.destroy();
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      { name: "setVisible(false)", run: handle => handle.api.setVisible(false) },
      { name: "setVisible(true)", run: handle => handle.api.setVisible(true) },
      { name: "setVisibleById", run: handle => handle.api.setVisibleById("tag-1", false) },
      {
        name: "getById",
        run(handle, ctx) {
          report(ctx, "getById(tag-2)", handle.api.getById("tag-2"));
        }
      },
      { name: "removeById", run: handle => handle.api.removeById("tag-2") },
      { name: "setCollision", run: handle => handle.api.setCollision(true) },
      { name: "getAll", run: (handle, ctx) => report(ctx, "getAll", handle.api.getAll()) }
    ]
  },
  {
    id: "heat-map",
    group: "标注热力",
    name: "HeatMap2D",
    from: "cesiumUtils / olUtils",
    summary: "二维热力。进入后用网格测试数据 add 回显，可 removeAll 后再加一份。",
    engine: "both",
    methods: ["add", "remove", "removeAll", "destroy"],
    mount(ctx) {
      const api =
        ctx.mode === "3d" ? new cesiumSdk.HeatMap2D(ctx.viewer) : new olSdk.HeatMap2D(ctx.olMap);
      api.add(heatData(), {
        radius: 26,
        maxOpacity: 0.85,
        minOpacity: 0.1,
        values: [0, 50, 100],
        colors: ["#1677ff", "#36cfc9", "#ff7875"]
      });
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: [
      { name: "removeAll", run: handle => handle.api.removeAll() },
      {
        name: "add",
        run(handle) {
          handle.api.add(heatData(), {
            radius: 20,
            values: [0, 100],
            colors: ["#0958d9", "#ffd666"]
          });
        }
      }
    ]
  },
  {
    id: "hollow-cylinder",
    group: "图形动画",
    name: "HollowCylinder",
    from: "cesiumUtils / olUtils",
    summary: "空心扇体。用测试中心、起止角和内外半径回显，注销时移除对应数据源或图层。",
    engine: "both",
    methods: ["getBufferPositions"],
    mount(ctx) {
      const option = {
        center: CENTER,
        beginAngle: 20,
        endAngle: 160,
        innerRadius: 2000,
        outRadius: 6000,
        minHeight: 0,
        maxHeight: 500,
        fill: true,
        fillColor: "#1677ff",
        fillAlpha: 0.35,
        outline: true,
        outlineColor: "#69c0ff"
      };
      if (ctx.mode === "3d") {
        const api = new cesiumSdk.HollowCylinder(ctx.viewer, option);
        return {
          api,
          dispose() {
            ctx.viewer.dataSources.remove(api.hollowCylinderSource, true);
          }
        };
      }
      const api = new olSdk.HollowCylinder(ctx.olMap, option);
      return {
        api,
        dispose() {
          ctx.olMap.removeLayer(api.hollowCylinderLayer);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "getBufferPositions",
        run(handle, ctx) {
          report(
            ctx,
            "getBufferPositions",
            handle.api.getBufferPositions(20, 80, { type: "Point", coordinates: CENTER }, 2, {
              units: "kilometers",
              steps: 32
            })
          );
        }
      }
    ]
  },
  {
    id: "radar-scan",
    group: "图形动画",
    name: "RadarScan",
    from: "cesiumUtils/utils/RadarScan",
    summary: "雷达扫描体。初始化添加一座测试雷达，可再添加、清空和注销。",
    engine: "cesium",
    methods: ["add", "calcPoints", "remove", "removeAll", "destroy"],
    mount(ctx) {
      const api = new cesiumSdk.RadarScan(ctx.viewer);
      const entity = api.add({
        id: "radar-demo",
        position: Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1]),
        radius: 2500,
        style: "up",
        color: Cesium.Color.fromCssColorString("#1677ff").withAlpha(0.25),
        scanColor: Cesium.Color.fromCssColorString("#36cfc9").withAlpha(0.45)
      });
      return {
        api,
        entity,
        dispose: () => api.destroy()
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "add",
        run(handle) {
          handle.api.add({
            position: Cesium.Cartesian3.fromDegrees(CENTER[0] + 0.04, CENTER[1]),
            radius: 1800,
            style: "down"
          });
        }
      },
      { name: "remove", run: handle => handle.api.remove(handle.entity) },
      { name: "removeAll", run: handle => handle.api.removeAll() }
    ]
  },
  {
    id: "run-entity",
    group: "图形动画",
    name: "RunEntity",
    from: "cesiumUtils/RunEntity、olUtils/RunFeature",
    summary: "沿测试轨迹运动。三维使用 RunEntity，二维使用同名 RunEntity。注销时 removeAll。",
    engine: "both",
    methods: ["loadRunEntity", "loadRunFeature", "positionsSpline", "getHeadingPitch", "removeAll", "destroy"],
    mount(ctx) {
      const positions = trackPositions();
      if (ctx.mode === "3d") {
        const api = new cesiumSdk.RunEntity(ctx.viewer);
        api.loadRunEntity({
          id: "run-demo",
          positions,
          loop: true,
          spline: false,
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString("#36cfc9")
          }
        });
        return { api, dispose: () => api.destroy() };
      }
      const feature = new ol.Feature(new ol.geom.Point(positions[0].slice(0, 2)));
      feature.setStyle(
        new ol.style.Style({
          image: new ol.style.Circle({
            radius: 7,
            fill: new ol.style.Fill({ color: "#36cfc9" })
          })
        })
      );
      const api = new olSdk.RunEntity(ctx.olMap);
      // 单点加载，避免二维实现里 interval 无法在 destroy 时清掉
      api.loadRunFeature({
        id: "run-demo",
        feature,
        positions: [positions[0]],
        spline: false,
        loop: false
      });
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "positionsSpline",
        run(handle, ctx) {
          report(ctx, "positionsSpline", handle.api.positionsSpline(trackPositions(), 1, 0.3));
        }
      },
      {
        name: "getHeadingPitch",
        run(handle, ctx) {
          const a = Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1], 100);
          const b = Cesium.Cartesian3.fromDegrees(CENTER[0] + 0.01, CENTER[1] + 0.01, 120);
          report(ctx, "getHeadingPitch", handle.api.getHeadingPitch(a, b));
        }
      },
      { name: "removeAll", run: handle => handle.api.removeAll() }
    ]
  },
  {
    id: "animation-path",
    group: "图形动画",
    name: "AnimationPath",
    from: "cesiumUtils/utils/AnimationPath",
    summary: "相机关键帧。初始化写入两个测试视点，可播放、暂停、停止和清空。",
    engine: "cesium",
    methods: ["addKeyPoint", "addKeyPointByCurrentView", "setKeyPointByIndex", "removeKeyPointByIndex", "clearKeyPoints", "getAllKeyPoints", "play", "pause", "stop", "destroy"],
    mount(ctx) {
      const api = new cesiumSdk.AnimationPath(ctx.viewer);
      api.addKeyPoint(
        Cesium.Cartesian3.fromDegrees(CENTER[0], CENTER[1], 8000),
        new Cesium.HeadingPitchRoll(0, Cesium.Math.toRadians(-35), 0),
        4
      );
      api.addKeyPoint(
        Cesium.Cartesian3.fromDegrees(CENTER[0] + 0.08, CENTER[1] + 0.03, 5000),
        new Cesium.HeadingPitchRoll(0.4, Cesium.Math.toRadians(-25), 0),
        4
      );
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: [
      { name: "play", run: handle => handle.api.play() },
      { name: "pause", run: handle => handle.api.pause() },
      { name: "stop", run: handle => handle.api.stop() },
      { name: "addKeyPointByCurrentView", run: handle => handle.api.addKeyPointByCurrentView(3) },
      {
        name: "getAllKeyPoints",
        run: (handle, ctx) => report(ctx, "getAllKeyPoints", handle.api.getAllKeyPoints())
      },
      { name: "clearKeyPoints", run: handle => handle.api.clearKeyPoints() }
    ]
  },
  {
    id: "polyline-volume",
    group: "图形动画",
    name: "PolylineVolumeFromPolygon",
    from: "cesiumUtils/business、olUtils/business",
    summary: "按中心线左右宽度生成带状体。初始化加载三段测试航段。",
    engine: "both",
    methods: ["add", "getById", "setVisible", "removeById", "removeAll", "destroy"],
    async mount(ctx) {
      if (ctx.mode === "3d") {
        const api = new cesiumSdk.PolylineVolumeFromPolygon(ctx.viewer);
        await api.add({ data: volumeData() });
        return { api, dispose: () => api.destroy() };
      }
      const api = new olSdk.PolylineVolumeFromPolygon(ctx.olMap);
      const layer = await api.add({ data: volumeData() });
      return {
        api,
        dispose() {
          if (layer) ctx.olMap.removeLayer(layer);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      { name: "setVisible(false)", run: handle => handle.api.setVisible?.(false) },
      {
        name: "getById",
        run(handle, ctx) {
          report(ctx, "getById", handle.api.getById?.("route-demo"));
        }
      },
      { name: "removeAll", run: handle => handle.api.removeAll?.() }
    ]
  },
  {
    id: "windy",
    group: "图形动画",
    name: "Windy",
    from: "cesiumUtils/utils/meteorological",
    summary: "风场粒子。使用一块测试 U/V 网格，play 开始动画，destroy 停止并移除。",
    engine: "cesium",
    methods: ["init", "play", "stop", "animate", "removeLines", "destroy"],
    mount(ctx) {
      const api = new cesiumSdk.Windy(windJson(), ctx.viewer);
      api.play(120);
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: [
      { name: "play", run: handle => handle.api.play(120) },
      { name: "stop", run: handle => handle.api.stop() }
    ]
  },
  {
    id: "graticules",
    group: "网格",
    name: "Graticules",
    from: "cesiumUtils/utils/grid",
    summary: "经纬网。按 30 分间隔回显，离开页面时 destroy。",
    engine: "cesium",
    methods: ["destroy"],
    mount(ctx) {
      const api = new cesiumSdk.Graticules(ctx.viewer, {
        width: 1,
        color: "#69c0ff",
        interval: 30,
        show: true
      });
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: []
  },
  {
    id: "graticules-code",
    group: "网格",
    name: "GraticulesCode",
    from: "cesiumUtils/utils/grid",
    summary: "鼠标位置的经纬网格编码。初始化后移动鼠标即可在角落看到编码，setUnit 切换 15 分。",
    engine: "cesium",
    methods: ["setUnit", "destroy"],
    mount(ctx) {
      const api = new cesiumSdk.GraticulesCode(ctx.viewer, 30);
      return { api, dispose: () => api.destroy() };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "setUnit(15)",
        run(handle) {
          handle.api.setUnit(15);
        }
      }
    ]
  },
  {
    id: "camera-grid",
    group: "网格",
    name: "CameraGrid",
    from: "cesiumUtils/utils/grid/cameraGrid",
    summary: "随相机高度变化的经纬网格。start 开始绘制，注销时 stop 并移除线与注记。",
    engine: "cesium",
    methods: ["start", "stop", "setLevelKey"],
    mount(ctx) {
      const api = new cesiumSdk.CameraGrid(ctx.viewer);
      api.setLevelKey("30分");
      api.start();
      return {
        api,
        dispose() {
          api.stop();
          ctx.viewer.scene.primitives.remove(api.gridLines);
          ctx.viewer.dataSources.remove(api.gridLabels, true);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      { name: "setLevelKey(15分)", run: handle => handle.api.setLevelKey("15分") },
      { name: "stop", run: handle => handle.api.stop() },
      { name: "start", run: handle => handle.api.start() }
    ]
  },
  {
    id: "canvas-to-image",
    group: "图形动画",
    name: "CanvasToImage",
    from: "cesiumUtils / olUtils",
    summary: "把当前地图导出成图片。toDataURL 把结果长度写入日志，saveAsImage 触发下载。",
    engine: "both",
    methods: ["toDataURL", "saveAsImage", "download", "destroy"],
    mount(ctx) {
      if (ctx.mode === "3d") {
        const entity = cesiumPolygon(ctx.viewer, undefined, "shot-demo");
        const api = new cesiumSdk.CanvasToImage(ctx.viewer);
        return {
          api,
          dispose() {
            api.destroy?.();
            ctx.viewer.entities.remove(entity);
          }
        };
      }
      const layer = new ol.VectorLayer({
        source: new ol.VectorSource({
          features: [
            new ol.Feature(new ol.geom.Point(CENTER))
          ]
        }),
        style: new ol.style.Style({
          image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: "#1677ff" })
          })
        })
      });
      ctx.olMap.addLayer(layer);
      const api = new olSdk.CanvasToImage(ctx.olMap);
      return {
        api,
        dispose() {
          api.destroy?.();
          ctx.olMap.removeLayer(layer);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "toDataURL",
        run(handle, ctx) {
          const url = handle.api.toDataURL();
          ctx.log(`toDataURL 长度 ${String(url).length}`);
        }
      },
      {
        name: "saveAsImage",
        run(handle) {
          handle.api.saveAsImage({ type: "png", fileName: "sdk-map" });
        }
      }
    ]
  },
  {
    id: "geojson-datasource",
    group: "图形动画",
    name: "geoJsonDataSourceFromUrl",
    from: "cesiumUtils/utils/GeoJsonDataSourceFromUrl",
    summary: "把测试 GeoJSON 转成实体集合并回显。注销时从 dataSources 移除。",
    engine: "cesium",
    methods: ["geoJsonDataSourceFromUrl"],
    async mount(ctx) {
      const response = await fetch("/sample.geojson");
      const json = await response.json();
      const dataSource = await cesiumSdk.geoJsonDataSourceFromUrl(json, {
        name: "sample",
        polyline: {
          width: 2,
          material: Cesium.Color.fromCssColorString("#69c0ff")
        },
        polygon: {
          material: Cesium.Color.fromCssColorString("#1677ff").withAlpha(0.35)
        }
      });
      ctx.viewer.dataSources.add(dataSource);
      return {
        api: dataSource,
        dispose() {
          ctx.viewer.dataSources.remove(dataSource, true);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "实体数量",
        run(handle, ctx) {
          report(ctx, "entities.length", handle.api.entities.values.length);
        }
      }
    ]
  }
];
