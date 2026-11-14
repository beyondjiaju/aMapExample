import { ref } from "vue";
import * as Cesium from "@/3dMap/sdk/cesium";
import {
  navigation,
  map3DCoordinates,
  CameraHanlder as CameraHanlderCesium
} from "@/3dMap/sdk/cesiumUtils";
import {
  setCameraHandler,
  setMapConfig,
  config,
  viewer,
  olMap
} from "@/3dMap/global";
import {
  map2DCoordinates,
  CameraHanlder as CameraHanlderOl
} from "@/3dMap/sdk/olUtils";
import { createMaps, resizeMaps } from "./createMaps";

export default () => {
  const viewerIsLoad = ref(false);
  const olIsLoad = ref(false);

  /** 实例创建后补齐指北针、坐标和相机句柄。没有限制配置时不收紧操作范围 */
  const bindMapHandlers = () => {
    if (viewer) {
      navigation(viewer);
      map3DCoordinates({
        viewer,
        type: 1,
        id: "map3DCoordinates"
      });
      const cesiumCamera = new CameraHanlderCesium(viewer);
      setCameraHandler(cesiumCamera, "cesium");
      const pitchLimit = config.cameraSet?.pitchLimit;
      const heightLimit = config.cameraSet?.heightLimit;
      if (pitchLimit) cesiumCamera.setPitchLimit(pitchLimit);
      if (heightLimit) cesiumCamera.setHeightLimit(heightLimit);
    }
    if (olMap) {
      map2DCoordinates({
        map: olMap,
        type: 1,
        id: "map2DCoordinates"
      });
      const olCamera = new CameraHanlderOl(olMap);
      setCameraHandler(olCamera, "ol");
      const heightLimit = config.cameraSet?.heightLimit;
      if (heightLimit) olCamera.setHeightLimit(heightLimit);
    }
  };

  /** 创建二三维地图。底图与初始定位仍由 createMaps 负责 */
  const createMap = async () => {
    await createMaps();
    bindMapHandlers();
    // 地图可能已经从隐藏宿主挪到页面，创建完成后补一次尺寸
    resizeMaps();
    viewerIsLoad.value = !!viewer;
    olIsLoad.value = !!olMap;
  };

  /** 读取 mapConfig 的相机限制、初始定位和图形显示，再创建地图 */
  const getMapConfig = () => {
    return Cesium.Resource.fetchJson({ url: "./mapConfig.json" }).then(mapConfig => {
      setMapConfig({
        cameraSet: mapConfig?.cameraSet,
        homeData: mapConfig?.homeData,
        geometryShowSet: mapConfig?.geometryShowSet
      });
      return createMap();
    });
  };

  return {
    viewerIsLoad,
    olIsLoad,
    getMapConfig
  };
};
