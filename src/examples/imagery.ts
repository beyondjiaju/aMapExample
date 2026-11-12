import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import { disposeHandle, type SdkExample } from "./types";
import { report } from "./sample";
import CustomGeographicTilingScheme from "@/3dMap/sdk/cesiumUtils/utils/imageryProvider/tiling-scheme/CustomGeographicTilingScheme.js";
import CustomMercatorTilingScheme from "@/3dMap/sdk/cesiumUtils/utils/imageryProvider/tiling-scheme/CustomMercatorTilingScheme.js";

const AMAP_2D =
  "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}";
const GOOGLE_2D = "https://gac-geo.googlecnapps.cn/maps/vt?lyrs=m&x={x}&y={y}&z={z}";

function imageryExample(
  id: string,
  name: string,
  summary: string,
  create: () => any,
  olUrl?: string
): SdkExample {
  return {
    id,
    group: "影像",
    name,
    from: "cesiumUtils/utils/imageryProvider",
    summary,
    engine: olUrl ? "both" : "cesium",
    methods: olUrl ? ["构造", "url"] : ["构造"],
    mount(ctx) {
      const provider = create();
      if (ctx.mode === "3d") {
        const layer = ctx.viewer.imageryLayers.addImageryProvider(provider);
        ctx.viewer.imageryLayers.raiseToTop(layer);
        return {
          api: provider,
          dispose: () => ctx.viewer.imageryLayers.remove(layer, true)
        };
      }
      const layer = new ol.TileLayer({
        source: new ol.XYZ({ url: olUrl, projection: "EPSG:3857" })
      });
      ctx.olMap.addLayer(layer);
      return {
        api: provider,
        dispose: () => ctx.olMap.removeLayer(layer)
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "读取 url",
        run(handle, ctx) {
          report(ctx, "url", handle.api.url || handle.api._url);
        }
      }
    ]
  };
}

export const imageryExamples: SdkExample[] = [
  imageryExample(
    "amap-imagery",
    "AMapImageryProvider",
    "高德电子地图。三维用 SDK 提供者并按 WGS84 纠偏，二维用同一套瓦片地址回显。",
    () => new cesiumSdk.AMapImageryProvider({ style: "elec", crs: "WGS84" }),
    AMAP_2D
  ),
  imageryExample(
    "google-imagery",
    "GoogleImageryProvider",
    "谷歌电子地图。二维切换时使用同一瓦片模板。",
    () => new cesiumSdk.GoogleImageryProvider({ style: "elec", crs: "WGS84" }),
    GOOGLE_2D
  ),
  imageryExample(
    "tdt-imagery",
    "TdtImageryProvider",
    "天地图提供者。未配置 tk 时瓦片会失败，示例仍演示构造与注销。"
    ,
    () => new cesiumSdk.TdtImageryProvider({ style: "vec", key: "" })
  ),
  imageryExample(
    "tencent-imagery",
    "TencentImageryProvider",
    "腾讯电子地图。瓦片使用 reverseY，仅在三维提供者中回显。",
    () => new cesiumSdk.TencentImageryProvider({ style: "elec" })
  ),
  imageryExample(
    "baidu-imagery",
    "BaiduImageryProvider",
    "百度自定义地图。内部使用 BD09 切片方案，示例演示 requestImage 所属提供者的加载与移除。",
    () => new cesiumSdk.BaiduImageryProvider({ style: "vec", crs: "WGS84" })
  ),
  imageryExample(
    "geovis-imagery",
    "GeoVisImageryProvider",
    "星图地球提供者。token 为空时仅验证构造与图层挂载。",
    () => new cesiumSdk.GeoVisImageryProvider({ style: "vec", key: "" })
  ),
  {
    id: "custom-geographic-tiling",
    group: "影像",
    name: "CustomGeographicTilingScheme",
    from: "cesiumUtils/utils/imageryProvider/tiling-scheme",
    summary: "自定义地理切片方案。初始化后用 ArcGIS 影像回显，并调用切片换算方法。",
    engine: "cesium",
    methods: ["tileXYToRectangle", "positionToTileXY"],
    mount(ctx) {
      const resolutions = Array.from({ length: 22 }, (_, level) => 360 / 256 / 2 ** level);
      const scheme = new CustomGeographicTilingScheme({ resolutions });
      const layer = ctx.viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          tilingScheme: scheme
        })
      );
      return {
        api: scheme,
        dispose: () => ctx.viewer.imageryLayers.remove(layer, true)
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "tileXYToRectangle",
        run(handle, ctx) {
          report(ctx, "tileXYToRectangle(1,1,2)", handle.api.tileXYToRectangle(1, 1, 2));
        }
      },
      {
        name: "positionToTileXY",
        run(handle, ctx) {
          const position = Cesium.Cartographic.fromDegrees(116.397, 39.909);
          report(ctx, "positionToTileXY", handle.api.positionToTileXY(position, 8));
        }
      }
    ]
  },
  {
    id: "custom-mercator-tiling",
    group: "影像",
    name: "CustomMercatorTilingScheme",
    from: "cesiumUtils/utils/imageryProvider/tiling-scheme",
    summary: "自定义墨卡托切片方案。初始化后挂一张影像，并演示瓦片坐标换算。",
    engine: "cesium",
    methods: ["tileXYToNativeRectangle", "positionToTileXY"],
    mount(ctx) {
      const resolutions = Array.from(
        { length: 22 },
        (_, level) => (20037508.3427892 * 2) / 256 / 2 ** level
      );
      const scheme = new CustomMercatorTilingScheme({ resolutions });
      const layer = ctx.viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          tilingScheme: scheme
        })
      );
      return {
        api: scheme,
        dispose: () => ctx.viewer.imageryLayers.remove(layer, true)
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "tileXYToNativeRectangle",
        run(handle, ctx) {
          report(ctx, "tileXYToNativeRectangle(1,1,2)", handle.api.tileXYToNativeRectangle(1, 1, 2));
        }
      },
      {
        name: "positionToTileXY",
        run(handle, ctx) {
          const position = Cesium.Cartographic.fromDegrees(116.397, 39.909);
          report(ctx, "positionToTileXY", handle.api.positionToTileXY(position, 8));
        }
      }
    ]
  }
];
