const containsLayer = (map, layer) => {
  const currentLayer = map.getAllLayers().find(item => {
    return item == layer;
  });
  return currentLayer ? true : false;
};
export { containsLayer };
