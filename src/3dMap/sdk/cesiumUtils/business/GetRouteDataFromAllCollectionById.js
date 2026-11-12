/**
 * 获取航线匹配用 id（航段按整条航线 id 匹配）
 * @param { Object } properties 实体属性
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
 * 在 viewer 下全部实体集合中按航线 useId 查询 route 图形
 * 覆盖 viewer.entities 与 viewer.dataSources 中各集合
 * （对齐 treeLayers.getRouteDataById，但范围为全局图层数据）
 * @param { Object } viewer Cesium.Viewer
 * @param { String|Number } id 航线/空域使用 id
 * @returns { Array<{ entity: any, layer: any }> } 匹配的 entity 与所在集合
 */
const getRouteDataFromAllCollectionById = (viewer, id) => {
  if (!viewer || id === undefined || id === null) return [];
  const routeData = [];
  const matchId = String(id);
  /**从实体集合中收集匹配 route */
  const collectFromEntities = (entities, layer) => {
    entities.values.forEach(entity => {
      if (!entity.properties) return;
      const properties = entity.properties.getValue(viewer.clock.currentTime);
      if (String(getAirlineUseId(properties)) === matchId) {
        routeData.push({ entity, layer });
      }
    });
  };
  // viewer 默认实体集合
  collectFromEntities(viewer.entities, viewer.entities);
  // 各 dataSource 实体集合
  for (let i = 0; i < viewer.dataSources.length; i++) {
    const layer = viewer.dataSources.get(i);
    collectFromEntities(layer.entities, layer);
  }
  return routeData;
};
export { getRouteDataFromAllCollectionById };
