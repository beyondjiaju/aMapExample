import * as Cesium from "@/3dMap/sdk/cesium";
import * as cesiumSdk from "@/3dMap/sdk/cesiumUtils";
import { disposeHandle, type SdkExample } from "./types";
import { CENTER, describe, report } from "./sample";

const BLUE = "#1677ff";

function colorOf() {
  return Cesium.Color.fromCssColorString(BLUE).withAlpha(0.85);
}

function showMaterial(
  viewer: any,
  material: any,
  kind: "ellipse" | "polyline" | "polygon" | "wall"
) {
  const [lon, lat] = CENTER;
  if (kind === "ellipse") {
    return viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      ellipse: {
        semiMajorAxis: 1800,
        semiMinorAxis: 1800,
        material
      }
    });
  }
  if (kind === "polyline") {
    return viewer.entities.add({
      polyline: {
        positions: Cesium.Cartesian3.fromDegreesArray([
          lon - 0.03,
          lat,
          lon + 0.03,
          lat + 0.01
        ]),
        width: 10,
        material
      }
    });
  }
  if (kind === "polygon") {
    return viewer.entities.add({
      polygon: {
        hierarchy: Cesium.Cartesian3.fromDegreesArray([
          lon - 0.02,
          lat - 0.015,
          lon + 0.02,
          lat - 0.015,
          lon + 0.02,
          lat + 0.015,
          lon - 0.02,
          lat + 0.015
        ]),
        material
      }
    });
  }
  return viewer.entities.add({
    wall: {
      positions: Cesium.Cartesian3.fromDegreesArray([
        lon - 0.02,
        lat - 0.01,
        lon + 0.02,
        lat - 0.01,
        lon + 0.02,
        lat + 0.01,
        lon - 0.02,
        lat + 0.01,
        lon - 0.02,
        lat - 0.01
      ]),
      minimumHeights: [0, 0, 0, 0, 0],
      maximumHeights: [800, 800, 800, 800, 800],
      material
    }
  });
}

function materialExample(
  id: string,
  name: string,
  summary: string,
  kind: "ellipse" | "polyline" | "polygon" | "wall",
  create: () => any
): SdkExample {
  return {
    id,
    group: "材质",
    name,
    from: "cesiumUtils/utils/material",
    summary,
    engine: "cesium",
    methods: ["getType", "getValue", "equals"],
    mount(ctx) {
      const material = create();
      const entity = showMaterial(ctx.viewer, material, kind);
      return {
        api: material,
        dispose() {
          ctx.viewer.entities.remove(entity);
        }
      };
    },
    unmount: disposeHandle,
    actions: [
      {
        name: "getType",
        run(handle, ctx) {
          report(ctx, "getType", handle.api.getType(ctx.viewer.clock.currentTime));
        }
      },
      {
        name: "getValue",
        run(handle, ctx) {
          const value = handle.api.getValue(ctx.viewer.clock.currentTime, {});
          ctx.log(`getValue => color=${describe(value?.color)} duration=${describe(value?.duration)}`);
        }
      },
      {
        name: "equals",
        run(handle, ctx) {
          report(ctx, "equals(self)", handle.api.equals(handle.api));
        }
      }
    ]
  };
}

export const materialExamples: SdkExample[] = [
  materialExample(
    "ellipse-diffuse",
    "EllipseDiffuseMaterialProperty",
    "椭圆扩散材质。初始化后在地图上回显一块扩散圆，可调用 getType / getValue / equals。",
    "ellipse",
    () => new cesiumSdk.EllipseDiffuseMaterialProperty({ color: colorOf(), duration: 2000 })
  ),
  materialExample(
    "ellipse-flicker",
    "EllipseFilckerMaterialProperty",
    "椭圆闪烁材质，按持续时间在透明度间往复。",
    "ellipse",
    () => new cesiumSdk.EllipseFilckerMaterialProperty({ color: colorOf(), duration: 800 })
  ),
  materialExample(
    "ellipse-scan",
    "EllipseScanMaterialProperty",
    "椭圆扫描材质，可看到扫描环与十字线。",
    "ellipse",
    () =>
      new cesiumSdk.EllipseScanMaterialProperty({
        color: colorOf(),
        duration: 2000,
        circleCount: 2,
        crosshair: true
      })
  ),
  materialExample(
    "ellipse-wave",
    "EllipseWaveMaterialProperty",
    "椭圆波纹材质，count 控制波纹数量。",
    "ellipse",
    () =>
      new cesiumSdk.EllipseWaveMaterialProperty({
        color: colorOf(),
        duration: 2000,
        count: 3,
        gradient: 0.2
      })
  ),
  materialExample(
    "gradient-material",
    "GradientMaterialProperty",
    "面渐变材质，回显在多边形上。",
    "polygon",
    () => new cesiumSdk.GradientMaterialProperty({ color: colorOf() })
  ),
  materialExample(
    "polyline-antialias",
    "PolylineAntialiasingMaterialProperty",
    "抗锯齿折线材质，线宽方向做透明度衰减。",
    "polyline",
    () => new cesiumSdk.PolylineAntialiasingMaterialProperty({ color: colorOf() })
  ),
  materialExample(
    "polyline-dash-gradient",
    "PolylineDashGradientMaterialProperty",
    "渐变虚线材质。",
    "polyline",
    () =>
      new cesiumSdk.PolylineDashGradientMaterialProperty({
        color: colorOf(),
        gapColor: Cesium.Color.TRANSPARENT,
        dashLength: 16
      })
  ),
  materialExample(
    "polyline-image",
    "PolylineImageMaterialProperty",
    "折线文字贴图材质，未传图片时用 text 生成贴图。",
    "polyline",
    () =>
      new cesiumSdk.PolylineImageMaterialProperty({
        color: Cesium.Color.YELLOW,
        text: "SDK",
        imageWidth: 24,
        duration: 2000
      })
  ),
  materialExample(
    "wall-dynamic",
    "WallDynamicMaterialProperty",
    "电子围栏动态墙。默认向上流动，注销时移除墙体。",
    "wall",
    () =>
      new cesiumSdk.WallDynamicMaterialProperty({
        color: colorOf(),
        duration: 1500,
        count: 2,
        isAxisY: true,
        isFront: true
      })
  )
];
