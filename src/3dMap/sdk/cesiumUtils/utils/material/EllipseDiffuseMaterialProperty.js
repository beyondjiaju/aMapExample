import * as Cesium from "@/3dMap/sdk/cesium";
class EllipseDiffuseMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this.color = options.color || Cesium.Color.WHITE;
    this.duration = options.duration || 1000;
  }
  get isConstant() {
    return false;
  }
  get definitionChanged() {
    return this._definitionChanged;
  }
  getType() {
    return EllipseDiffuseMaterialProperty.materialType;
  }
  getValue(time, result = {}) {
    result.color = Cesium.Property.getValueOrDefault(
      this.color,
      time,
      Cesium.Color.WHITE,
      result.color
    );
    result.duration = this.duration;
    return result;
  }
  equals(other) {
    return (
      this === other ||
      (other instanceof EllipseDiffuseMaterialProperty &&
        other.color === this.color)
    );
  }
  static materialType = "EllipseDiffuse";
}
Object.defineProperties(EllipseDiffuseMaterialProperty.prototype, {
  color: Cesium.createPropertyDescriptor("color")
});
const shader = `
    uniform vec4 color;
    vec3 circlePing(float r, float innerTail, float frontierBorder, float timeResetSeconds, float radarPingSpeed, float fadeDistance){
        float t = fract(czm_frameNumber * 50.0 / duration);
        float time = mod(t, timeResetSeconds) * radarPingSpeed;
        float circle;
        circle += smoothstep(time - innerTail, time, r) * smoothstep(time + frontierBorder, time, r);
        circle *= smoothstep(fadeDistance, 0.0, r);
        return vec3(circle);
    }
    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st * 2.0 - 1.0;
        vec2 center = vec2(0.0);
        vec3 flagColor;
        float r = length(st - center) / 4.0;
        flagColor += circlePing(r, 0.25, 0.025, 4.0, 0.3, 1.0) * color.rgb;
        material.alpha = length(flagColor);
        material.diffuse = flagColor.rgb;
        return material;
    }
`;
Cesium.Material._materialCache.addMaterial(
  EllipseDiffuseMaterialProperty.materialType,
  {
    fabric: {
      type: EllipseDiffuseMaterialProperty.materialType,
      uniforms: {
        color: Cesium.Color.WHITE,
        duration: 1000
      },
      source: shader
    },
    translucent: true
  }
);
export { EllipseDiffuseMaterialProperty };
