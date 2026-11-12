import * as Cesium from "@/3dMap/sdk/cesium";
import toTop from "./images/toTop.png";
import toRight from "./images/toRight.png";
/**电子围栏 wall 材质
 * @param {Object} options
 * @param {Object} options.color 颜色 default: yellow
 * @param {Object} options.image 自定义图片
 * @param {Object} options.duration 速度(毫秒) default:1000
 * @param {Object} options.count 图片数量
 * @param {Object} options.isAxisY 上下/左右模式
 * @param {Object} options.isFront 方向 default:true 向上/逆时针
 */
function WallDynamicMaterialProperty(options) {
  this._definitionChanged = new Cesium.Event();
  this._color = undefined;
  this.color = Cesium.defaultValue(options.color, Cesium.Color.YELLOW);
  this.duration = Cesium.defaultValue(options.duration, 1000);
  this.count = Cesium.defaultValue(options.count, 1);
  this.isAxisY = Cesium.defaultValue(options.isAxisY, true);
  this.isFront = Cesium.defaultValue(options.isFront, true);
  const defaultImage = this.isAxisY ? toTop : toRight;
  this.image = Cesium.defaultValue(options.image, defaultImage);
  this._time = new Date().getTime();
}

Object.defineProperties(WallDynamicMaterialProperty.prototype, {
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
  color: Cesium.createPropertyDescriptor("color")
});

const MaterialType = "wallType" + parseInt(Math.random() * 1000);
WallDynamicMaterialProperty.prototype.getType = function (time) {
  return MaterialType;
};

WallDynamicMaterialProperty.prototype.getValue = function (time, result) {
  if (!Cesium.defined(result)) {
    result = {};
  }
  result.color = Cesium.Property.getValueOrClonedDefault(
    this._color,
    time,
    Cesium.Color.WHITE,
    result.color
  );
  result.image = this.image;
  result.count = this.count;
  result.isAxisY = this.isAxisY;
  result.isFront = this.isFront;
  if (this.duration) {
    result.time =
      ((new Date().getTime() - this._time) % this.duration) / this.duration;
  }
  return result;
};
WallDynamicMaterialProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof WallDynamicMaterialProperty &&
      Cesium.Property.equals(this._color, other._color))
  );
};
const shader = `czm_material czm_getMaterial(czm_materialInput materialInput){
    czm_material material = czm_getDefaultMaterial(materialInput);
    vec2 st = materialInput.st;
    vec4 colorImage;
    if(isAxisY){
        colorImage = isFront ? texture(image, vec2(fract(st.s), fract(float(count) * st.t - time))) : texture(image, vec2(fract(st.s), fract(float(count) * st.t + time)));
    }else{
        colorImage = isFront ? texture(image, vec2(fract(float(count) * st.s - time), fract(st.t))) : texture(image, vec2(fract(float(count) * st.s + time), fract(st.t)));
    }
    vec4 fragColor;
    fragColor.rgb = color.rgb / 1.0;
    fragColor = czm_gammaCorrect(fragColor);
    material.diffuse = color.rgb;
    material.alpha = colorImage.a * color.a;
    material.emission = fragColor.rgb;
    return material;
}`;
Cesium.Material._materialCache.addMaterial(MaterialType, {
  fabric: {
    type: MaterialType,
    uniforms: {
      color: new Cesium.Color(1.0, 0.0, 0.0, 0.5),
      image: Cesium.Material.DefaultImageId,
      time: -20,
      count: 1,
      isAxisY: true,
      isFront: true
    },
    source: shader
  },
  translucent: function (material) {
    return true;
  }
});
export { WallDynamicMaterialProperty };
