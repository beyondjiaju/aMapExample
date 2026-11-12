/**
 * 在 viewer 下全部实体集合中按 id 查询 entity
 * 覆盖 viewer.entities 与 viewer.dataSources 中各 CustomDataSource
 * （对齐 openlayer 的 getFeatureFromAllLayerById）
 * @param { Object } viewer Cesium.Viewer
 * @param { String|Number } id 实体 id
 * @returns { Object|undefined } 匹配的 entity
 */
const getEntityFromAllCollectionById = (viewer, id) => {
  if (!viewer || id === undefined || id === null) return undefined;
  const entityId = String(id);
  // viewer 默认实体集合
  let entity = viewer.entities.getById(entityId);
  if (entity) return entity;
  // 各 dataSource 实体集合（图层树等加载方式）
  for (let i = 0; i < viewer.dataSources.length; i++) {
    const dataSource = viewer.dataSources.get(i);
    entity = dataSource.entities.getById(entityId);
    if (entity) return entity;
  }
  return undefined;
};
export { getEntityFromAllCollectionById };
