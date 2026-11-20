import * as Cesium from "@/3dMap/sdk/cesium";
class PolylineAntialiasingMaterialProperty {
  constructor(opt = {}) {
    this._definitionChanged = new Cesium.Event();
    this._color = undefined;
    this.color = opt.color;
  }
  get isConstant() {
    return true;
  }
  get definitionChanged() {
    return this._definitionChanged;
  }
  getType() {
    return PolylineAntialiasingMaterialProperty.materialType;
  }
  getValue(time, result = {}) {
    result.color = this.color || Cesium.Color.WHITE;
    return result;
  }
  equals(other) {
    return (
      this === other ||
      (other instanceof PolylineAntialiasingMaterialProperty &&
        other.color === this.color)
    );
  }
  static materialType = "PolylineAntialiasing";
}
const shader = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        material.diffuse = color.rgb;
        // dist：0 为线中心，1 为线边缘。整段线性透明会让线发虚
        float dist = abs(st.t - 0.5) * 2.0;
        float fw = fwidth(dist);
        // 过渡限制在约 1 像素，且不超过线宽的 12%，主体保持实色
        float feather = clamp(fw, 0.001, 0.12);
        float alpha = 1.0 - smoothstep(1.0 - feather, 1.0, dist);
        material.alpha = alpha * color.a;
        return material;
    }
`;
Cesium.Material._materialCache.addMaterial(
  PolylineAntialiasingMaterialProperty.materialType,
  {
    fabric: {
      type: PolylineAntialiasingMaterialProperty.materialType,
      uniforms: {
        color: new Cesium.Color(1, 1, 1, 1)
      },
      source: shader
    },
    translucent: true
  }
);
export { PolylineAntialiasingMaterialProperty };
