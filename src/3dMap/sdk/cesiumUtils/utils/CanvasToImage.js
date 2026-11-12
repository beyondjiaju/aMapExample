import * as Cesium from "@/3dMap/sdk/cesium";
class CanvasToImage {
  constructor(viewer) {
    this.viewer = viewer;
  }
  toDataURL() {
    this.viewer.render();
    return this.viewer.canvas.toDataURL();
  }
  /**保存图片
   * @param {Object} options
   * @param {Number} options.width 图片宽度
   * @param {Number} options.height 图片高度
   * @param {String} options.type 图片格式 jpg png
   * @param {String} options.fileName 图片名称
   * @param {Number} options.encoderOptions 图片质量 取值[0,1] 默认值0.92
   */
  saveAsImage(options) {
    const that = this;
    const defaultOptions = {
      type: "jpg",
      encoderOptions: 0.92
    };
    options = Object.assign(defaultOptions, options);
    const imageData = that.toDataURL();
    if (Cesium.defined(options.width) || Cesium.defined(options.height)) {
      // 指定宽度或者高度后对图片进行压缩处理
      let image = new Image(),
        width,
        height;
      image.onload = () => {
        if (Cesium.defined(options.width)) {
          width = options.width;
          height =
            options.height ||
            Math.round(
              (width * that.viewer.canvas.height) / that.viewer.canvas.width
            );
        } else {
          height = options.height;
          width = Math.round(
            (height * that.viewer.canvas.width) / that.viewer.canvas.height
          );
        }
        let canvas, ctx;
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        let imageDataNew = canvas.toDataURL("", options.encoderOptions);
        if (!options.fileName) {
          options.fileName = `场景出图_${width}x${height}`;
        }
        that.downloadBase64Image(options.fileName, imageDataNew, options.type);
      };
      image.src = imageData;
    } else {
      // 高清出图
      let width = that.viewer.canvas.width,
        height = that.viewer.canvas.height;
      if (!options.fileName) {
        options.fileName = `场景出图_${width}x${height}`;
      }
      that.downloadBase64Image(options.fileName, imageData, options.type);
    }
  }
  downloadBase64Image(fileName, imageData, type) {
    const blob = this.base64ToBlob(imageData);
    this.download(fileName + "." + type, blob);
  }
  base64ToBlob(code) {
    let parts = code.split(";base64,");
    let contentType = parts[0].split(":")[1];
    let raw = window.atob(parts[1]);
    let rawLength = raw.length;
    let unit8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; i++) {
      unit8Array[i] = raw.charCodeAt(i);
    }
    return new Blob([unit8Array], { type: contentType });
  }
  download(fileName, blob) {
    const a = document.createElement("a");
    a.download = fileName;
    a.href = URL.createObjectURL(blob);
    a.click();
  }
  /**
   * 转换为图片文件
   * @param {Object} options
   * @param {Number} options.width 图片宽度
   * @param {Number} options.height 图片高度
   * @param {String} options.type 图片格式 jpg png
   * @param {String} options.fileName 图片名称
   * @param {Number} options.encoderOptions 图片质量 取值[0,1] 默认值0.92
   */
  transToImgFile(options) {
    let file = null;
    const that = this;
    const defaultOptions = {
      type: "jpg",
      encoderOptions: 0.92
    };
    options = Object.assign(defaultOptions, options);
    const imageData = that.toDataURL();
    if (Cesium.defined(options.width) || Cesium.defined(options.height)) {
      // 指定宽度或者高度后对图片进行压缩处理
      let image = new Image(),
        width,
        height;
      image.onload = () => {
        if (Cesium.defined(options.width)) {
          width = options.width;
          height =
            options.height ||
            Math.round(
              (width * that.viewer.canvas.height) / that.viewer.canvas.width
            );
        } else {
          height = options.height;
          width = Math.round(
            (height * that.viewer.canvas.width) / that.viewer.canvas.height
          );
        }
        let canvas, ctx;
        canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, width, height);
        let imageDataNew = canvas.toDataURL("", options.encoderOptions);
        if (!options.fileName) {
          options.fileName =
            `场景出图_${width}x${height}` + new Date().getTime();
        }
        file = that.generateFile(options.fileName, imageDataNew, options.type);
      };
      image.src = imageData;
    } else {
      // 高清出图
      let width = that.viewer.canvas.width,
        height = that.viewer.canvas.height;
      if (!options.fileName) {
        options.fileName = `场景出图_${width}x${height}` + new Date().getTime();
      }
      file = that.generateFile(options.fileName, imageData, options.type);
    }
    return file;
  }

  /**
   * 生成file文件
   * @param fileName
   * @param imageData
   * @param type
   */
  generateFile(fileName, imageData, type) {
    let parts = imageData.split(";base64,");
    let contentType = parts[0].split(":")[1];
    let raw = window.atob(parts[1]);
    let rawLength = raw.length;
    let unit8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; i++) {
      unit8Array[i] = raw.charCodeAt(i);
    }
    return new File([unit8Array], fileName + "." + type, { type: contentType });
  }
  destroy() {
    this.viewer = null;
  }
}
export { CanvasToImage };
