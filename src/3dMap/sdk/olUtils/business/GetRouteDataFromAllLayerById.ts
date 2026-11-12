import * as ol from "@/3dMap/sdk/ol";

/**
 * 获取航线匹配用 id（航段按整条航线 id 匹配）
 * @param { Object } properties feature 属性
 * @returns { String|Number|undefined }
 */
const getAirlineUseId = properties => {
  if (!properties) return undefined;
  if (properties.airDataUseType === "line_use_entire") {
    return properties.lineEntireId;
  }
  return properties.id;
};

/**
 * 在 map 下全部矢量图层中按航线 useId 查询 route 图形
 * （对齐 treeLayers.getRouteDataById，但范围为全局图层数据）
 * @param { Object } map openlayers Map
 * @param { String|Number } id 航线/空域使用 id
 * @returns { Array<{ feature: any, layer: any }> } 匹配的 feature 与所在图层
 */
const getRouteDataFromAllLayerById = (map, id) => {
  if (!map || id === undefined || id === null) return [];
  const routeData = [];
  const matchId = String(id);
  map.getAllLayers().forEach(layer => {
    if (!(layer instanceof ol.VectorLayer)) return;
    const source = layer.getSource();
    if (!source?.getFeatures) return;
    source.getFeatures().forEach(feature => {
      const properties = feature.get("properties");
      if (String(getAirlineUseId(properties)) === matchId) {
        routeData.push({ feature, layer });
      }
    });
  });
  return routeData;
};
export { getRouteDataFromAllLayerById };
