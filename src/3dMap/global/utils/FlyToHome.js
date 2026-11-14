import * as Cesium from "@/3dMap/sdk/cesium";
import { heightToZoom } from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";
import { viewer, olMap, config } from "./MapState";

/** 按 homeData 定位到初始视野 */
const setCamreaByHomeData = (duration = null) => {
  const cameraData = config.homeData;
  const mapMode = mapData().mapMode;
  if (!cameraData?.longitude && cameraData?.longitude !== 0) return;
  // 三维定位
  if (mapMode === "cesium") {
    const destination = Cesium.Cartesian3.fromDegrees(
      cameraData.longitude,
      cameraData.latitude,
      cameraData.height
    );
    const orientation = {
      heading: cameraData.heading,
      pitch: cameraData.pitch,
      roll: cameraData.roll
    };
    if (duration && duration > 0) {
      viewer?.camera.flyTo({ destination, orientation, duration });
    } else {
      viewer?.camera.setView({ destination, orientation });
    }
    return;
  }
  // 二维定位
  if (mapMode === "ol") {
    const view = olMap?.getView();
    if (!view) return;
    const zoomLevel = heightToZoom(cameraData.height);
    const center = [cameraData.longitude, cameraData.latitude];
    const rotation = -cameraData.heading;
    if (duration && duration > 0) {
      view.animate({
        center,
        rotation,
        zoom: zoomLevel,
        duration: duration * 1000
      });
    } else {
      view.setCenter(center);
      view.setRotation(rotation);
      view.setZoom(zoomLevel);
    }
  }
};

/** 定位到初始位置，duration 单位为秒 */
export const flyToHome = (duration = null) => {
  setCamreaByHomeData(duration);
};
