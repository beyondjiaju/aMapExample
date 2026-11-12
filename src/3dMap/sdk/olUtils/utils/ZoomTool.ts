import * as ol from "@/3dMap/sdk/ol";
/**
 * 获取 EPSG:4326 地图当前可视区域高度（米）
 * @param {ol.Map} map
 * @returns {number} 高度（米）
 */
const getFitExtentAutoZoom = (
  map,
  wgs84Extent,
  opts = {
    maxZoom: 12,
    minZoom: 4
  }
) => {
  const view = map.getView();
  const mapSize = map.getSize();
  if (!mapSize || mapSize[0] === 0) return opts;
  // 1. 坐标转换：转为地图当前投影范围
  const proj = view.getProjection();
  const targetExtent = ol.transformExtent(wgs84Extent, ol.WGS84, proj);
  // 2. 临时计算 fit 理论所需缩放级别
  // getResolutionForExtent：根据范围+画布尺寸，得到需要的分辨率
  const targetResolution = view.getResolutionForExtent(targetExtent, mapSize);
  // 分辨率转zoom
  const targetZoom = view.getZoomForResolution(targetResolution);
  // ========== 动态智能边界控制 ==========
  // 自定义阈值：可以根据业务调整
  const MIN_ALLOW_ZOOM = 2;
  const MAX_ALLOW_ZOOM = 19; // 瓦片最大支持层级
  // 动态最终层级：不超过上限，不低于下限
  const realMaxZoom = Math.min(Math.ceil(targetZoom), MAX_ALLOW_ZOOM);
  const realMinZoom = MIN_ALLOW_ZOOM;
  return {
    maxZoom: realMaxZoom, // 动态计算出来的上限
    minZoom: realMinZoom
  };
};
export { getFitExtentAutoZoom };
