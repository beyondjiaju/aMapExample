class CanvasToImage {
  constructor(olMap) {
    this.olMap = olMap;
  }
  /** 获取地图画布尺寸 */
  _getMapCanvasSize() {
    const viewport = this.olMap.getViewport();
    const canvas = viewport.querySelector("canvas");
    return { width: canvas?.width || 0, height: canvas?.height || 0 };
  }
  toDataURL() {
    return new Promise((resolve, reject) => {
      let imageBase64 = null;
      // 等待全部渲染完成
      this.olMap.once("rendercomplete", () => {
        // 获取地图视口下所有 canvas
        const viewport = this.olMap.getViewport();
        const canvasList = Array.from(viewport.querySelectorAll("canvas"));
        if (canvasList.length === 0) return;
        // 取第一个画布尺寸作为合成画布大小
        const baseCanvas = canvasList[0];
        const mergeCanvas = document.createElement("canvas");
        mergeCanvas.width = baseCanvas.width;
        mergeCanvas.height = baseCanvas.height;
        const ctx = mergeCanvas.getContext("2d");
        // 从上到下依次绘制（顺序决定层级：底图先画，矢量后画）
        canvasList.forEach(canvas => {
          ctx.drawImage(canvas, 0, 0);
        });
        // 导出base64
        imageBase64 = mergeCanvas.toDataURL("image/png");
        resolve(imageBase64);
      });
      this.olMap.render();
    });
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
    const { width: mapW, height: mapH } = this._getMapCanvasSize();
    that.toDataURL().then(imageData => {
      if (options.width != null || options.height != null) {
        // 指定宽度或者高度后对图片进行压缩处理
        let image = new Image(),
          width,
          height;
        image.onload = () => {
          if (options.width != null) {
            width = options.width;
            height = options.height || Math.round((width * mapH) / mapW);
          } else {
            height = options.height;
            width = Math.round((height * mapW) / mapH);
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
          that.downloadBase64Image(
            options.fileName,
            imageDataNew,
            options.type
          );
        };
        image.src = imageData;
      } else {
        // 高清出图
        if (!options.fileName) {
          options.fileName = `场景出图_${mapW}x${mapH}`;
        }
        that.downloadBase64Image(options.fileName, imageData, options.type);
      }
    });
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
    const { width: mapW, height: mapH } = this._getMapCanvasSize();
    return new Promise((resolve, reject) => {
      that.toDataURL().then(imageData => {
        if (options.width != null || options.height != null) {
          // 指定宽度或者高度后对图片进行压缩处理
          let image = new Image(),
            width,
            height;
          image.onload = () => {
            if (options.width != null) {
              width = options.width;
              height = options.height || Math.round((width * mapH) / mapW);
            } else {
              height = options.height;
              width = Math.round((height * mapW) / mapH);
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
            file = that.generateFile(
              options.fileName,
              imageDataNew,
              options.type
            );
          };
          image.src = imageData;
        } else {
          // 高清出图
          if (!options.fileName) {
            options.fileName =
              `场景出图_${mapW}x${mapH}` + new Date().getTime();
          }
          file = that.generateFile(options.fileName, imageData, options.type);
        }
        resolve(file);
      });
    });
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
    this.olMap = null;
  }
}
export { CanvasToImage };
