import { nextTick } from "vue";
import * as Cesium from "@/3dMap/sdk/cesium";
import { heightToZoom } from "@/3dMap/sdk/olUtils";
import { olMap, viewer } from "@/3dMap/global";
import mapData from "@/3dMap/store/map";
import { resizeMaps } from "@/3dMap/components/mapView/creatMap/createMaps";

/**
 * 二三维切换。
 * 视野对齐方式与 hatc-xt-front-core `tools/modeScale` 一致：
 * 二维用当前范围铺满三维相机，三维用视点高换算二维 zoom。
 */
export function switchMapMode() {
  const store = mapData();
  if (!viewer || !olMap) return;
  if (store.mapModeIs2D) {
    const olView = olMap.getView();
    const extent = olView.calculateExtent(olMap.getSize());
    store.mapModeIs2D = false;
    viewer.camera.setView({
      destination: Cesium.Rectangle.fromDegrees(
        extent[0],
        extent[1],
        extent[2],
        extent[3]
      ),
      orientation: {
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    });
  } else {
    const position = viewer.camera.positionCartographic;
    const lon = Cesium.Math.toDegrees(position.longitude);
    const lat = Cesium.Math.toDegrees(position.latitude);
    const height = position.height;
    store.mapModeIs2D = true;
    olMap.getView().setCenter([lon, lat]);
    olMap.getView().setZoom(heightToZoom(height));
  }
  // 容器从隐藏变为显示后补一次尺寸，避免画布停在 0
  nextTick(() => resizeMaps());
}
