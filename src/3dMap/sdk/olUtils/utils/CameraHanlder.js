import { getHeight, heightToZoom } from "./HeightTool";
/**相机使用工具 */
class CameraHanlder {
  constructor(olMap) {
    this.olMap = olMap;
    this.view = olMap.getView();
    this.minHeight = 1;
    this.maxHeight = Number.POSITIVE_INFINITY;
    this.minZoom = this.view.getMinZoom();
    this.maxZoom = this.view.getMaxZoom();
  }
  /**设置相机高度范围
   * @param { Object } option
   * @param { Object } option.min // 最小高度
   * @param { Object } option.max // 最大高度
   */
  setHeightLimit(option) {
    if (!option) option = {};
    this.minHeight = option.min || 1;
    this.maxHeight = option.max || Number.POSITIVE_INFINITY;
    this.minZoom = option.max ? heightToZoom(option.max / 2) : 28;
    this.maxZoom = option.min ? heightToZoom(option.min / 2) : 0;
    this.view.setMinZoom(this.minZoom);
    this.view.setMaxZoom(this.maxZoom);
  }
  /**在heightLimit限制中操作相机高度 执行view zoom */
  zoomIn(zoomLevel = 1) {
    const viewZoom = this.view.getZoom();
    const viewHeight = getHeight(this.olMap);
    if (!zoomLevel || viewHeight <= this.minHeight) {
      return;
    }
    if (viewZoom + zoomLevel >= this.maxZoom) {
      this.view.setZoom(viewZoom + zoomLevel);
      return;
    }
    this.view.setZoom(viewZoom + zoomLevel);
  }
  /**在heightLimit限制中操作相机高度 执行view zoom*/
  zoomOut(zoomLevel = 1) {
    const viewZoom = this.view.getZoom();
    const viewHeight = getHeight(this.olMap);
    if (!zoomLevel || viewHeight >= this.maxHeight) {
      return;
    }
    if (viewZoom - zoomLevel <= this.minZoom) {
      this.view.setZoom(this.minZoom);
      return;
    }
    this.view.setZoom(viewZoom - zoomLevel);
  }
}
export { CameraHanlder };
