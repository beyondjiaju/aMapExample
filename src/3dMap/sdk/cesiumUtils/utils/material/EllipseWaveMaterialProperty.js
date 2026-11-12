import * as Cesium from "@/3dMap/sdk/cesium";
class EllipseWaveMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this.color = Cesium.defaultValue(options.color, Cesium.Color.WHITE);
    this.duration = Cesium.defaultValue(options.duration, 1000);
    this.count = Cesium.defaultValue(options.count, 2);
    if (this.count <= 0) {
      this.count = 1;
    }
    this.gradient = Cesium.defaultValue(options.gradient, 0.1);
    this.gradientLength =
      options.gradientLength > 0 ? 1 / options.gradientLength : 10;
    if (this.gradient > 1) {
      this.gradient = 1;
    }
    this.time = new Date().getTime();
  }
  get isConstant() {
    return false;
  }
  get definitionChanged() {
    return this._definitionChanged;
  }
  getType() {
    return EllipseWaveMaterialProperty.materialType;
  }
  getValue(time, result = {}) {
    if (!Cesium.defined(result)) {
      result = {};
    }
    result.color = Cesium.Property.getValueOrClonedDefault(
      this.color,
      time,
      Cesium.Color.WHITE,
      result.color
    );
    result.time =
      ((new Date().getTime() - this.time) % this.duration) / this.duration;
    result.count = this.count;
    result.gradient = 1 + this.gradientLength * (1 - this.gradient);
    return result;
  }
  equals(other) {
    const reData =
      this === other ||
      (other instanceof EllipseWaveMaterialProperty &&
        Cesium.Property.equals(this.color, other.color) &&
        Cesium.Property.equals(this.duration, other.duration) &&
        Cesium.Property.equals(this.count, other.count) &&
        Cesium.Property.equals(this.gradient, other.gradient));
    return reData;
  }
  static materialType = "EllipseWave";
}
Object.defineProperties(EllipseWaveMaterialProperty.prototype, {
  isConstant: {
    get: function () {
      return false;
    }
  },
  definitionChanged: {
    get: function () {
      return this._definitionChanged;
    }
  },
  color: Cesium.createPropertyDescriptor("color"),
  gradient: Cesium.createPropertyDescriptor("gradient"),
  duration: Cesium.createPropertyDescriptor("duration"),
  count: Cesium.createPropertyDescriptor("count")
});
const shader = `
  czm_material czm_getMaterial(czm_materialInput materialInput) {
    czm_material material = czm_getDefaultMaterial(materialInput);
    material.diffuse = 1.5 * color.rgb;
    vec2 st = materialInput.st;
    vec3 str = materialInput.str;
    float dis = distance(st, vec2(0.5, 0.5));
    float per = fract(time / 2.0);
    if (abs(str.z) > 0.001) {
      discard;
    }
    if (dis > 0.5) {
      discard;
    } else {
      float perDis = 0.5 / count;
      float disNum;
      float bl = .0;
      for (int i = 0; i <= 9; i++) {
        if (float(i) <= count) {
          disNum = perDis *float(i) - dis + per / count;
          if (disNum > 0.0) {
            if (disNum < perDis) {
              bl = 1.0 - disNum / perDis;
            } else if(disNum - perDis < perDis) {
              bl = 1.0 - abs(1.0 - disNum / perDis);
            }
            material.alpha = pow(bl, gradient);
          }
        }
      }
    }
    return material;
  }
`;
Cesium.Material._materialCache.addMaterial(
  EllipseWaveMaterialProperty.materialType,
  {
    fabric: {
      type: EllipseWaveMaterialProperty.materialType,
      uniforms: {
        time: 0,
        color: Cesium.Color.WHITE,
        duration: 1000,
        count: 2,
        gradient: 0.1,
        gradientLength: 0.1
      },
      source: shader
    },
    translucent: true
  }
);
export { EllipseWaveMaterialProperty };
