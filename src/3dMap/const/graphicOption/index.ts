import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
export const labelOption = {
  text: "",
  font: "bold 30px sans-serif",
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
  scaleByDistance: new Cesium.NearFarScalar(0, 1, 3000 * 1000, 0),
  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  outlineWidth: 4,
  fillColor: Cesium.Color.WHITE,
  outlineColor: Cesium.Color.BLACK,
  disableDepthTestDistance: 900 * 1000
};
export const textOption = {
  text: "",
  font: "bold 20px sans-serif",
  fill: new ol.style.Fill({ color: "#ffffff" }),
  stroke: new ol.style.Stroke({ color: "#000000", width: 2 }),
  scale: 0.5,
  offsetX: 0,
  offsetY: 0,
  textBaseline: "middle"
};
