import * as Cesium from "@/3dMap/sdk/cesium";
class EllipseFilckerMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this.color = options.color || Cesium.Color.WHITE;
    this.duration = options.duration || 1000;
    this.initAlpha = this.color.getValue().alpha;
    this.alpha = this.color.getValue().alpha;
    this.flag = true;
  }
  get isConstant() {
    return false;
  }
  get definitionChanged() {
    return this._definitionChanged;
  }
  getType() {
    return EllipseFilckerMaterialProperty.materialType;
  }
  getValue(time, result = {}) {
    result.color = Cesium.Property.getValueOrDefault(
      this.color,
      time,
      Cesium.Color.WHITE,
      result.color
    );
    if (this.flag) {
      this.alpha -= 50 / this.duration;
      if (this.alpha <= 0) {
        this.flag = false;
      }
    } else {
      this.alpha += 50 / this.duration;
      if (this.alpha >= 1) {
        this.flag = true;
      }
    }
    result.alpha = this.alpha;
    return result;
  }
  equals(other) {
    return (
      this === other ||
      (other instanceof EllipseFilckerMaterialProperty &&
        other.color === this.color)
    );
  }
  static materialType = "EllipseFilcker";
}
Object.defineProperties(EllipseFilckerMaterialProperty.prototype, {
  color: Cesium.createPropertyDescriptor("color")
});
const shader = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        material.alpha = alpha * color.a;
        material.diffuse = color.rgb;
        return material;
    }
`;
Cesium.Material._materialCache.addMaterial(
  EllipseFilckerMaterialProperty.materialType,
  {
    fabric: {
      type: EllipseFilckerMaterialProperty.materialType,
      uniforms: {
        color: Cesium.Color.WHITE,
        duration: 1000,
        alpha: 1
      },
      source: shader
    },
    translucent: true
  }
);
export { EllipseFilckerMaterialProperty };
