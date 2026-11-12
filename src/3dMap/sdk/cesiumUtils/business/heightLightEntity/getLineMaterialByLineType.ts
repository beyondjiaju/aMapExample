import * as Cesium from "@/3dMap/sdk/cesium";
import { PolylineAntialiasingMaterialProperty } from "@/3dMap/sdk/cesiumUtils";
export default (lineType, color, properties) => {
  if (lineType === "dash") {
    return new Cesium.PolylineDashMaterialProperty({
      color,
      dashLength: properties.dashLength
    });
  }
  if (lineType === "arrow") {
    return new Cesium.PolylineArrowMaterialProperty(
      Cesium.Color.fromCssColorString(color)
    );
  }
  if (lineType === "glow") {
    return new Cesium.PolylineGlowMaterialProperty({
      color,
      glowPower: properties.glowPower
    });
  }
  if (lineType === "outline") {
    return new Cesium.PolylineOutlineMaterialProperty({
      color,
      outlineWidth: properties.lineOutlineWidth,
      outlineColor: Cesium.Color.fromCssColorString(properties.lineOutlineColor)
    });
  }
  return new PolylineAntialiasingMaterialProperty({
    color
  });
};
