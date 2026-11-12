import * as Cesium from "@/3dMap/sdk/cesium";
const materialType = "PolylineImage";
/**polyline自定义图片材质
 * @param {Object} options
 * @param {Object} options.color Cesium.Color
 * @param {String} options.image 自定义图片路径
 * @param {Number} options.imageWidth 设置图片大小
 * @param {Number} options.duration 设置图片运动速度 default：0 静止 以毫秒为单位
 */
function PolylineImageMaterialProperty(options = {}) {
  this._definitionChanged = new Cesium.Event();
  this._color = undefined;
  this.color = Cesium.defaultValue(options.color, Cesium.Color.YELLOW);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!options.image) {
    if (options.text) {
      const padding = options.imageWidth;
      const fontSize = 40;
      const recPadding = 10;
      canvas.width = options.text.length * fontSize + recPadding * 2 + padding;
      canvas.height = fontSize + recPadding * 2;
      ctx.moveTo(0, canvas.height / 2);
      const recWidth = canvas.width - padding;
      const recHeight = canvas.height;
      ctx.lineTo(canvas.width / 2 - recWidth / 2, canvas.height / 2);
      ctx.lineTo(
        canvas.width / 2 - recWidth / 2,
        canvas.height / 2 - recHeight / 2
      );
      ctx.lineTo(
        canvas.width / 2 + recWidth / 2,
        canvas.height / 2 - recHeight / 2
      );
      ctx.lineTo(
        canvas.width / 2 + recWidth / 2,
        canvas.height / 2 + recHeight / 2
      );
      ctx.lineTo(
        canvas.width / 2 - recWidth / 2,
        canvas.height / 2 + recHeight / 2
      );
      ctx.lineTo(canvas.width / 2 - recWidth / 2, canvas.height / 2);
      ctx.moveTo(canvas.width / 2 + recWidth / 2, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "white";
      ctx.stroke();
      ctx.font = `${fontSize}px Microsoft YaHei`;
      ctx.fillStyle = "white";
      // let textWidth = ctx.measureText(options.text).width;
      // ctx.fillText(options.text, padding / 2 + (recWidth - textWidth) / 2, fontSize + recPadding / 2);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        options.text,
        canvas.width / 2,
        canvas.height / 2 + recPadding / 2
      );
      this._image = canvas;
    } else {
      canvas.width = 100;
      canvas.height = 100;
      const padding = 20;
      ctx.moveTo(20, canvas.height / 2 - padding * 2);
      ctx.lineTo(canvas.width - padding, canvas.height / 2);
      ctx.lineTo(20, canvas.height / 2 + padding * 2);
      ctx.lineWidth = 15;
      ctx.strokeStyle = "white";
      ctx.stroke();
      this._image = canvas;
    }
  }
  this._image = Cesium.defaultValue(options.image, canvas);
  this.imageWidth = Cesium.defaultValue(options.imageWidth, 30);
  this.duration = Cesium.defaultValue(options.duration, 0);
  this._time = new Date().getTime();
}
PolylineImageMaterialProperty.prototype.getType = function (time) {
  return materialType;
};
PolylineImageMaterialProperty.prototype.getValue = function (
  time,
  result = {}
) {
  result.color = Cesium.Property.getValueOrClonedDefault(
    this._color,
    time,
    Cesium.Color.WHITE,
    result.color
  );
  result.image = this.image;
  result.imageWidth = this.imageWidth;
  result.time =
    this.duration == 0
      ? 0
      : ((new Date().getTime() - this._time) % this.duration) / this.duration;
  return result;
};
PolylineImageMaterialProperty.prototype.equals = function (other) {
  return (
    this === other ||
    (other instanceof PolylineImageMaterialProperty &&
      Cesium.Property.equals(this._color, other._color))
  );
};
Object.defineProperties(PolylineImageMaterialProperty.prototype, {
  isConstant: {
    get: function get() {
      return false;
    }
  },
  definitionChanged: {
    get: function get() {
      return this._definitionChanged;
    }
  },
  color: Cesium.createPropertyDescriptor("color"),
  image: Cesium.createPropertyDescriptor("image"),
  imageWidth: Cesium.createPropertyDescriptor("imageWidth"),
  duration: Cesium.createPropertyDescriptor("duration")
});
const shader = `
    in float v_polylineAngle;
    mat2 rotate(float rad){
        float c = cos(rad);
        float s = sin(rad);
        return mat2(
            c, s, 
            -s, c
        );
    }
    czm_material czm_getMaterial(czm_materialInput materialInput){
        czm_material material = czm_getDefaultMaterial(materialInput);
        vec2 st = materialInput.st;
        vec2 pos = rotate(v_polylineAngle) * gl_FragCoord.xy;
        float s = pos.x / (imageWidth * czm_pixelRatio);
        float t = st.t;
        s = s - time;
        vec4 colorImage = texture(image, vec2(fract(s), t));
        material.alpha = colorImage.a * color.a;
        material.diffuse = color.rgb;
        return material;
    }
`;
Cesium.Material._materialCache.addMaterial(materialType, {
  fabric: {
    type: materialType,
    uniforms: {
      color: new Cesium.Color(1, 0, 0, 1),
      image: "",
      imageWidth: 30,
      duration: 0,
      time: 0
    },
    source: shader
  },
  translucent: function translucent() {
    return true;
  }
});
export { PolylineImageMaterialProperty };
