import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import { viewer, olMap } from "@/3dMap/global";
import mapData from "@/3dMap/store/map";
import { getFitExtentAutoZoom } from "@/3dMap/sdk/olUtils";
/**
 * 通用二三维定位工具
 * 动态识别当前地图模式（cesium / ol）
 * 单个坐标直接定位，坐标集合取最小包围范围的矩形后定位
 */

const isCoordinate = value =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number";

/**
 * 将输入统一规整为经纬度坐标集合 [[lon, lat], ...]
 * @param {Array} coordinates 单个 [lon, lat] 或集合 [[lon, lat], ...]（可含海拔第三位）
 */
const normalizeCoordinates = coordinates => {
  if (isCoordinate(coordinates)) {
    return [coordinates];
  }
  if (Array.isArray(coordinates)) {
    return coordinates.filter(isCoordinate);
  }
  return [];
};

/**
 * 计算坐标集合的最小包围范围 { minLon, maxLon, minLat, maxLat }，无有效点返回 null
 */
const getExtentRange = list => {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  list.forEach(([lon, lat]) => {
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });
  if (!isFinite(minLon) || !isFinite(minLat)) return null;
  return { minLon, maxLon, minLat, maxLat };
};

/**cesium：单点定位（支持动画） */
const locateCesiumPoint = (
  lon,
  lat,
  option = {
    duration: 0
  }
) => {
  if (!viewer) return;
  const { duration } = option;
  const destination = Cesium.Cartesian3.fromDegrees(lon, lat);
  const orientation = {
    heading: 0,
    pitch: Cesium.Math.toRadians(-90),
    roll: 0
  };
  // duration不为0时使用flyTo动画定位
  if (duration) {
    viewer.camera.flyTo({ destination, orientation, duration });
  } else {
    viewer.camera.setView({ destination, orientation });
  }
};
/**cesium：按坐标集合的包围矩形正上视定位（支持动画） */
const locateCesiumExtent = (
  { minLon, maxLon, minLat, maxLat },
  option = {
    duration: 0
  }
) => {
  if (!viewer) return;
  const { duration } = option;
  const rect = Cesium.Rectangle.fromDegrees(minLon, minLat, maxLon, maxLat);
  const orientation = {
    heading: 0,
    pitch: Cesium.Math.toRadians(-90),
    roll: 0
  };
  // duration不为0时使用flyTo动画定位
  if (duration) {
    viewer.camera.flyTo({ destination: rect, orientation, duration });
  } else {
    viewer.camera.setView({ destination: rect, orientation });
  }
};
/**ol：二维单个坐标定位（支持动画，保持当前缩放级别） */
const locateOlPoint = (
  lon,
  lat,
  option = {
    duration: 0
  }
) => {
  if (!olMap) return;
  const { duration } = option;
  const view = olMap.getView();
  const proj = view.getProjection();
  const center = ol.transform([lon, lat], ol.WGS84, proj);
  // duration不为0时使用animate动画定位（duration单位为秒，转毫秒）
  if (duration) {
    view.animate({ center, duration: duration * 1000 });
  } else {
    view.setCenter(center);
  }
};
/**ol：二维集合坐标按包围范围适配定位（支持动画） */
const locateOlExtent = (
  { minLon, maxLon, minLat, maxLat },
  option = {
    padding: [200, 200, 200, 200],
    duration: 0
  }
) => {
  if (!olMap) return;
  const view = olMap.getView();
  const proj = view.getProjection();
  // 经纬度范围转地图当前投影范围
  const extent = ol.transformExtent(
    [minLon, minLat, maxLon, maxLat],
    ol.WGS84,
    proj
  );
  // 参考 DrawCustomFeedBackOl.zoomToExtent：动态计算缩放上限并适配
  const { maxZoom } = getFitExtentAutoZoom(olMap, [
    minLon,
    minLat,
    maxLon,
    maxLat
  ]);
  // duration单位为秒，转毫秒；为0时立即定位
  view.fit(extent, {
    duration: option.duration * 1000,
    padding: option.padding,
    maxZoom
  });
};

/**
 * 通用二三维定位
 * @param {number[] | number[][]} coordinates 单个 [lon, lat] 或集合 [[lon, lat], ...]
 * @param {Object} option 可选参数 { padding?, duration? }  duration：定位动画时长（单位秒，默认0为立即定位）
 */
const locateToCoordinates = (
  coordinates,
  option = {
    padding: [200, 200, 200, 200],
    duration: 0
  }
) => {
  const list = normalizeCoordinates(coordinates);
  if (list.length === 0) return;
  const mapMode = mapData().mapMode;
  // 单个坐标直接定位
  if (list.length === 1) {
    const [lon, lat] = list[0];
    if (mapMode === "cesium") {
      locateCesiumPoint(lon, lat, option);
    } else if (mapMode === "ol") {
      locateOlPoint(lon, lat, option);
    }
    return;
  }
  // 集合坐标：取包围范围后定位
  const range = getExtentRange(list);
  if (!range) return;
  if (mapMode === "cesium") {
    locateCesiumExtent(range, option);
  } else if (mapMode === "ol") {
    locateOlExtent(range, option);
  }
};
export { locateToCoordinates };
