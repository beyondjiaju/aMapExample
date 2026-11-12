/**
 * 获取 EPSG:4326 地图当前可视区域高度（米）
 * @param {ol.Map} map
 * @returns {number} 高度（米）
 */
const getHeight = map => {
  const r = map.getView().getResolution();
  const h = map.getSize()[1];
  return r * h * 111319;
};
/**高度转zoom */
const heightToZoom = height => {
  const A = 40487.57;
  const B = 0.00007096758;
  const C = 91610.74;
  const D = -40467.74;
  return Math.round(D + (A - D) / (1 + Math.pow(height / C, B)));
};
export { getHeight, heightToZoom };
