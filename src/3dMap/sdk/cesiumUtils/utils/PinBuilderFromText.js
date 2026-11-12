import * as Cesium from "@/3dMap/sdk/cesium";
/**
 * @param {Object} options
 * @param {String} options.text
 * @param {Number} options.fontSize 文字大小
 * @param {String} options.type circle,rectangle,image
 * @param {String} options.image image类型生效
 * @param {String} options.color 文字颜色
 * @param {String} options.shadowColor 文字阴影颜色
 * @param {String} options.backgroundColor 背景色
 * @param {Number} options.borderWidth 边线宽度 circle,rectangle类型生效
 * @param {String} options.borderColor 边线色
 * @param {Number} options.padding
 * @returns canvas
 */
const textToCanvas = options => {
  const defaultOptions = {
    text: "",
    type: "circle",
    color: "#fff",
    shadowColor: "#000",
    fontSize: 16,
    backgroundColor: "orange",
    borderColor: "#ffa5007a",
    borderWidth: 2,
    padding: 0
  };
  options = Object.assign(defaultOptions, options);
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    // 获取字体大小
    const size = options.fontSize;
    // 根据字体长度与大小设置宽高
    let width =
      options.text.length > 1
        ? options.text.length *
          (size -
            options.text.length *
              (size * 0.1 - 0.1 * (options.text.length - 2)))
        : size * 1.5;
    let height = size;
    if (options.type == "circle") {
      height = width;
    } else if (options.type == "rectangle") {
      height = size;
    }
    width += options.borderWidth * 2;
    width += options.padding * 2;
    height += options.borderWidth * 2;
    height += options.padding * 2;
    // 避免展示不全
    const p = 20;
    width += p;
    height += p;
    const width_center = width / 2,
      height_center = height / 2;
    // 设置宽高
    canvas.width = width;
    canvas.height = height;
    if (options.type == "circle") {
      // border
      ctx.fillStyle = options.borderColor;
      ctx.arc(width_center, width_center, width_center - p / 2, 0, 360);
      ctx.fill();
      // background
      ctx.fillStyle = options.backgroundColor;
      ctx.beginPath();
      ctx.arc(
        width_center,
        width_center,
        width_center - p / 2 - options.borderWidth,
        0,
        360
      );
      ctx.fill();
    } else if (options.type == "rectangle") {
      // border
      ctx.fillStyle = options.borderColor;
      ctx.fillRect(p / 2, p / 2, width - p, height - p);
      // background
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(
        p / 2 + options.borderWidth,
        p / 2 + options.borderWidth,
        width - p - options.borderWidth * 2,
        height - p - options.borderWidth * 2
      );
    } else if (options.type == "image" && options.image) {
      const img = new Image();
      img.src = options.image;
      ctx.drawImage(img, p / 2, p / 2, width - p, height - p);
    }
    // 文字
    ctx.fillStyle = options.color;
    ctx.shadowBlur = 2;
    ctx.shadowColor = options.shadowColor;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 1;
    ctx.font = `bold ${options.fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(options.text, width_center, height_center);
    resolve(canvas);
  });
};
// export { textToCanvas }
