import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import { getColorAlpha } from "@/3dMap/sdk/olUtils";
const featureChanged = (feature, option) => {
  const changeOption = Object.assign(
    {
      fillColor: "#DEDEDE",
      fillAlpha: 0.5,
      outlineColor: "#DEDEDE",
      outlineAlpha: 1
    },
    option
  );
  const color = changeOption.color || changeOption.fillColor;
  const colorWithAlpha = getColorAlpha(
    color,
    Cesium.defaultValue(changeOption.alpha, changeOption.fillAlpha)
  );
  const outlineColor = getColorAlpha(
    changeOption.outlineColor,
    changeOption.outlineAlpha
  );
  let featureData = feature.get("featureData");
  const geometry = featureData?.geometry;
  const style =
    featureData?.style instanceof Array
      ? featureData?.style[0]
      : featureData?.style;
  // if(!geometry || !style)return;
  if (geometry instanceof ol.geom.Point) {
    const image = style.getImage();
    if (image instanceof ol.style.Circle) {
      if (image.getFill()) {
        image.getFill().setColor(colorWithAlpha);
      }
      if (image.getStroke()) {
        image.getStroke().setColor(color);
      }
    }
    if (image instanceof ol.style.Icon) {
      if (image.getColor()) {
        image.setColor(colorWithAlpha);
      }
    }
  }
  if (style?.getFill()) {
    style.getFill().setColor(colorWithAlpha);
  }
  if (style?.getStroke()) {
    style.getStroke().setColor(outlineColor);
  }
  style?.getText().getFill().setColor(color);
  // 更新
  if (featureData?.style instanceof Array) {
    featureData.style[0] = style;
  } else {
    featureData.style = style;
  }
  feature.set("featureData", featureData);
  feature.changed();
};
export { featureChanged };
