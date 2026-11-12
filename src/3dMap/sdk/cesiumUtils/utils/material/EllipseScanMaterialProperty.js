import * as Cesium from "@/3dMap/sdk/cesium";
/**polyline自定义图片材质
 * @param {Object} options
 * @param {Object} options.color Cesium.Color
 * @param {Number} options.circleCount circle数量
 * @param {Boolean} options.crosshair 十字线显示状态 default:true
 * @param {Number} options.duration 速度 default:2000 以毫秒为单位
 */
class EllipseScanMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this.color = options.color || Cesium.Color.WHITE;
    this.duration = options.duration || 2000;
    this.circleCount = Cesium.defaultValue(options.circleCount, 2);
    this.crosshair = Cesium.defaultValue(options.crosshair, true);
    this._time = new Date().getTime();
    this.radians = 0;
  }
  get isConstant() {
    return false;
  }
  get definitionChanged() {
    return this._definitionChanged;
  }
  getType() {
    return EllipseScanMaterialProperty.materialType;
  }
  getValue(time, result = {}) {
    result.color = Cesium.Property.getValueOrDefault(
      this.color,
      time,
      Cesium.Color.WHITE,
      result.color
    );
    result.sectorColor = result.color;
    result.circleCount = this.circleCount;
    result.crosshair = this.crosshair;
    result.time =
      this.duration == 0
        ? 0
        : ((new Date().getTime() - this._time) % this.duration) / this.duration;
    result.radians = Cesium.Math.toRadians(result.time * 360);
    return result;
  }
  equals(other) {
    return (
      this === other ||
      (other instanceof EllipseScanMaterialProperty &&
        other.color === this.color)
    );
  }
  static materialType = "EllipseScan";
}
Object.defineProperties(EllipseScanMaterialProperty.prototype, {
  color: Cesium.createPropertyDescriptor("color")
});
const shader = `
    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        float dis = distance(st, vec2(0.5));
        // circle
        float sp = 1.0 / 2.0 / circleCount;
        float m = mod(dis, sp);
        float alpha = step(sp * (1.0 - (width / 100.0) * 10.0), m);
        alpha = clamp(alpha, 0.2, 1.0);
        material.alpha = alpha;
        material.diffuse = color.rgb;
        // 十字线
        if(crosshair && ((st.s > 0.5 - (width / 100.0) / 2.0 && st.s < 0.5 + (width / 100.0) / 2.0) ||
            (st.t > 0.5 - (width / 100.0) / 2.0 && st.t < 0.5 + (width / 100.0) / 2.0))){
                alpha = 1.0;
                material.diffuse = color.rgb;
                material.alpha = alpha;
            }
        // 光晕
        if(circleCount > 1.0){
            float ma = mod(dis + offset, 0.5);
            if(ma < 0.25){
                alpha = ma * 3.0 + alpha;
            }else{
                alpha = 3.0 * (0.5 - ma) + alpha;
            }
            material.alpha = alpha;
            material.diffuse = sectorColor.rgb;
        }else{
            if(circleCount == 0.0){
                material.alpha = 0.0;
            }else{
                material.alpha = dis * color.a;
            }
        }
        // 扇区
        vec2 xy = materialInput.st;
        float rx = xy.x - 0.5;
        float ry = xy.y - 0.5;
        float at = atan(ry, rx);
        // 半径
        float radius = sqrt(rx * rx + ry * ry);
        float current_radians = at + radians;
        xy = vec2(cos(current_radians) * radius, sin(current_radians) * radius);
        xy = vec2(xy.x + 0.5, xy.y + 0.5);
        // 扇区渐变颜色渲染
        if(xy.y - xy.x < 0.0 && xy.x > 0.5 && xy.y > 0.5){
            material.alpha = alpha + 0.5;
            material.diffuse = sectorColor.rgb;
        }
        return material;        
    }
`;
Cesium.Material._materialCache.addMaterial(
  EllipseScanMaterialProperty.materialType,
  {
    fabric: {
      type: EllipseScanMaterialProperty.materialType,
      uniforms: {
        color: Cesium.Color.WHITE,
        sectorColor: Cesium.Color.WHITE,
        duration: 2000,
        time: 0,
        width: 1,
        radians: 0,
        offset: 0.2,
        circleCount: 2,
        crosshair: true
      },
      source: shader
    },
    translucent: true
  }
);
export { EllipseScanMaterialProperty };
