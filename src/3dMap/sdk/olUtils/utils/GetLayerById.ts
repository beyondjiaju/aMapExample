const getLayerById = (map, id) => {
  const currentLayer = map.getAllLayers().find(item => {
    return item.get("id") == id;
  });
  return currentLayer;
};
export { getLayerById };
