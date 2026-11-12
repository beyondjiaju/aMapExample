import * as Cesium from "@/3dMap/sdk/cesium";
/**polyline自定义图片材质
 * @param {Object} options
 * @param {Object} options.color Cesium.Color
 */
class GradientMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this.color = options.color || Cesium.Color.WHITE;
  }
  get isConstant() {
    return false;
  }
  get definitionChanged() {
    return this._definitionChanged;
  }
  getType() {
    return GradientMaterialProperty.materialType;
  }
  getValue(time, result = {}) {
    result.color = Cesium.Property.getValueOrDefault(
      this.color,
      time,
      Cesium.Color.WHITE,
      result.color
    );
    return result;
  }
  equals(other) {
    return (
      this === other ||
      (other instanceof GradientMaterialProperty && other.color === this.color)
    );
  }
  static materialType = "PolygonGradient";
}
Object.defineProperties(GradientMaterialProperty.prototype, {
  color: Cesium.createPropertyDescriptor("color")
});
const shader = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        float dis = distance(st, vec2(0.5));
        material.alpha = dis * color.a;
        material.diffuse = color.rgb;
        return material;        
    }
`;
Cesium.Material._materialCache.addMaterial(
  GradientMaterialProperty.materialType,
  {
    fabric: {
      type: GradientMaterialProperty.materialType,
      uniforms: {
        color: Cesium.Color.WHITE
      },
      source: shader
    },
    translucent: true
  }
);
export { GradientMaterialProperty };
