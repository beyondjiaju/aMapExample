import { viewer, olMap } from "@/3dMap/global";
import { CanvasToImage as CanvasToImageCesium } from "@/3dMap/sdk/cesiumUtils";
import { CanvasToImage as CanvasToImageOl } from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";
/**监听 */
class MapToImage {
  newCanvasToImageByMode: any;
  constructor() {
    this.newCanvasToImageByMode = {
      cesium: new CanvasToImageCesium(viewer),
      ol: new CanvasToImageOl(olMap)
    };
  }
  toDataURL() {
    const mapMode = mapData().mapMode;
    return new Promise((resolve, reject) => {
      if (mapMode === "cesium") {
        resolve(this.newCanvasToImageByMode[mapMode]?.toDataURL());
      }
      if (mapMode === "ol") {
        this.newCanvasToImageByMode[mapMode]?.toDataURL().then(image => {
          resolve(image);
        });
      }
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
  saveAsImage(option) {
    const mapMode = mapData().mapMode;
    this.newCanvasToImageByMode[mapMode]?.saveAsImage(option);
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
  transToImgFile(option) {
    const mapMode = mapData().mapMode;
    return new Promise((resolve, reject) => {
      if (mapMode === "cesium") {
        resolve(this.newCanvasToImageByMode[mapMode]?.transToImgFile(option));
      }
      if (mapMode === "ol") {
        this.newCanvasToImageByMode[mapMode]
          ?.transToImgFile(option)
          .then(image => {
            resolve(image);
          });
      }
    });
  }
  destroy() {
    this.newCanvasToImageByMode = null;
  }
}
export { MapToImage };
