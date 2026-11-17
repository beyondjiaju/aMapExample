import * as turf from "@turf/turf";

/** 二维键盘平移，方向与三维 KeyDownControlCamera 一致：朝向为前，固定步长 1000 米 */
class KeyDownControlCamera {
  constructor(olMap, option = {}) {
    this.olMap = olMap;
    this.onKeyDown = event => {
      const handled = this.handleKeyDown(event);
      if (!handled) return;
      // 拦住方向键，避免和二维地图默认键盘平移叠在一起
      event.preventDefault();
      event.stopPropagation();
    };
    // 单独使用时创建后立即监听；通用对象会关掉自动监听
    if (option.autoListen !== false) this.addEventListener();
  }
  /** 按方向键平移二维视图，处理了方向键时返回 true */
  handleKeyDown(event) {
    const view = this.olMap?.getView?.();
    const center = view?.getCenter?.();
    if (!center) return false;
    // 视图旋转为顺时针弧度，0 朝北，与三维 heading、turf 方位角一致
    const heading = view.getRotation?.() || 0;
    let distance = 1000,
      angle;
    switch (event.keyCode) {
      case 38:
        // 向前
        angle = (heading * 180) / Math.PI;
        break;
      case 40:
        // 向后
        angle = ((heading - Math.PI) * 180) / Math.PI;
        break;
      case 37:
        // 向左
        angle = ((heading - Math.PI / 2) * 180) / Math.PI;
        break;
      case 39:
        // 向右
        angle = ((heading + Math.PI / 2) * 180) / Math.PI;
        break;
      default:
        return false;
    }
    // 当前视图是 EPSG:4326，中心点可直接按经纬度平移
    const point = turf.point(center),
      newPoint = turf.destination(point, distance, angle, {
        units: "meters"
      });
    view.setCenter(newPoint.geometry.coordinates);
    return true;
  }
  addEventListener() {
    // 捕获阶段先于地图自身的键盘平移
    document.addEventListener("keydown", this.onKeyDown, true);
  }
  destroy() {
    document.removeEventListener("keydown", this.onKeyDown, true);
    this.olMap = null;
  }
}
const keyDownControlCamera = olMap => {
  return new KeyDownControlCamera(olMap);
};
export { KeyDownControlCamera, keyDownControlCamera };
