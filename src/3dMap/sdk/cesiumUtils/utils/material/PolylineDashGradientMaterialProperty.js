import * as Cesium from "@/3dMap/sdk/cesium";
const defaultColor = Cesium.Color.WHITE;
const defaultGapColor = Cesium.Color.TRANSPARENT;
const defaultDashLength = 16.0;
const defaultDashPattern = 255.0;
/**polyline渐变虚线
 * @param {Object} options
 * @param {Object} options.color Cesium.Color
 * @param {Object} options.gapColor Cesium.Color
 * @param {Number} options.dashLength 虚线长度
 * @param {Number} options.dashPattern
 */
function PolylineDashGradientMaterialProperty(options) {
  options = Cesium.defaultValue(options, Cesium.defaultValue.EMPTY_OBJECT);
  this._definitionChanged = new Cesium.Event();
  this._color = undefined;
  this._colorSubscription = undefined;
  this._gapColor = undefined;
  this._gapColorSubscription = undefined;
  this._dashLength = undefined;
  this._dashLengthSubscription = undefined;
  this._dashPattern = undefined;
  this._dashPatternSubscription = undefined;
  this.color = options.color;
  this.gapColor = options.gapColor;
  this.dashLength = options.dashLength;
  this.dashPattern = options.dashPattern;
}
Object.defineProperties(PolylineDashGradientMaterialProperty.prototype, {
  isConstant: {
    get: function () {
      return (
        Cesium.Property.isConstant(this._color) &&
        Cesium.Property.isConstant(this._gapColor) &&
        Cesium.Property.isConstant(this._dashLength) &&
        Cesium.Property.isConstant(this._dashPattern)
      );
    }
  },
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    }
  },
  color: Cesium.createPropertyDescriptor("color"),
  gapColor: Cesium.createPropertyDescriptor("gapColor"),
  dashLength: Cesium.createPropertyDescriptor("dashLength"),
  dashPattern: Cesium.createPropertyDescriptor("dashPattern")
});
PolylineDashGradientMaterialProperty.prototype.getType = function (time) {
  return "GradientPolylineDash";
};
PolylineDashGradientMaterialProperty.prototype.getValue = function (
  time,
  result
) {
  if (!Cesium.defined(result)) {
    result = {};
  }
  result.color = Cesium.Property.getValueOrClonedDefault(
    this._color,
    time,
    defaultColor,
    result.color
  );
  result.gapColor = Cesium.Property.getValueOrClonedDefault(
    this._gapColor,
    time,
    defaultGapColor,
    result.gapColor
  );
  result.dashLength = Cesium.Property.getValueOrDefault(
    this._dashLength,
    time,
    defaultDashLength,
    result.dashLength
  );
  result.dashPattern = Cesium.Property.getValueOrDefault(
    this._dashPattern,
    time,
    defaultDashPattern,
    result.dashPattern
  );
  return result;
};
PolylineDashGradientMaterialProperty.prototype.equals = function (other) {
  return (
    this === other || //
    (other instanceof PolylineDashGradientMaterialProperty &&
      Cesium.Property.equals(this._color, other._color) &&
      Cesium.Property.equals(this._gapColor, other._gapColor) &&
      Cesium.Property.equals(this._dashLength, other._dashLength) &&
      Cesium.Property.equals(this._dashPattern, other._dashPattern))
  );
};
const shader = `
  uniform vec4 color;
  uniform vec4 gapColor;
  uniform float dashLength;
  uniform float dashPattern;
  in float v_polylineAngle;
  const float maskLength = 16.0;
  mat2 rotate(float rad) {
      float c = cos(rad);
      float s = sin(rad);
      return mat2(
        c, s,
        -s, c
      );
  }
  czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 pos = rotate(v_polylineAngle) * gl_FragCoord.xy;
    float dashPosition = fract(pos.x / (dashLength * czm_pixelRatio));
    float maskIndex = floor(dashPosition * maskLength);
    float maskTest = floor(dashPattern / pow(2.0, maskIndex));
    vec4 fragColor = (mod(maskTest, 2.0) < 1.0) ? gapColor : color;
    if (fragColor.a < 0.005) {   // matches 0/255 and 1/255
      discard;
    }
    fragColor = czm_gammaCorrect(fragColor);
    material.emission = fragColor.rgb;
    vec2 st = materialInput.st;
    material.alpha = fragColor.a * (1.0 - st.s);
    return material;
  }    
`;
Cesium.Material._materialCache.addMaterial("GradientPolylineDash", {
  fabric: {
    type: "GradientPolylineDash",
    uniforms: {
      color: defaultColor,
      gapColor: defaultGapColor,
      dashLength: defaultDashLength,
      dashPattern: defaultDashPattern
    },
    source: shader
  },
  translucent: function translucent() {
    return true;
  }
});

export { PolylineDashGradientMaterialProperty };
