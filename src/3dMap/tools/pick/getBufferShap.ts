import * as turf from "@turf/turf";
export default (shap, buffer) => {
  if (!shap || buffer <= 0) return null;
  let ret = {
    type: "polygon",
    coordinates: null
  };
  if (shap.type == "polyline") {
    const lineString = turf.lineString(shap.coordinates);
    const buffered = turf.buffer(lineString, buffer * 0.001, {
      units: "kilometers"
    });
    ret.coordinates = buffered.geometry.coordinates[0];
  }
  return ret;
};
