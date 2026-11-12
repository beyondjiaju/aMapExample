import * as ol from "@/3dMap/sdk/ol";
const getFeatureFromAllLayerById = (map, id) => {
  if (!map || id === undefined || id === null) return undefined;
  const featureId = String(id);
  let feature;
  map.getAllLayers().forEach(layer => {
    if (layer instanceof ol.VectorLayer) {
      if (layer.getSource().getFeatureById(featureId)) {
        feature = layer.getSource().getFeatureById(featureId);
      }
    }
  });
  return feature;
};
export { getFeatureFromAllLayerById };
