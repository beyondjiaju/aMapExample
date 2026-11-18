import { getHeight, heightToZoom } from "./HeightTool";

/** 航向按最短转角插值，超过 180 度时从另一侧绕，避免转一整圈 */
function lerpHeading(from, to, t) {
  const toDeg = radian => (radian * 180) / Math.PI;
  const toRad = degree => (degree * Math.PI) / 180;
  let difference = toDeg(to) - toDeg(from);
  const abs = Math.abs(difference);
  if (abs > 180) difference = difference < 0 ? 360 - abs : abs - 360;
  return toRad(toDeg(from) + difference * t);
}

/**
 * 二维路径播放，方法与 cesiumUtils/AnimationPath 对齐。
 * 节点仍保存航向、俯仰、翻滚；播放时只把经纬度、航向和高度作用到视图。
 */
class AnimationPath {
  constructor(olMap) {
    this.olMap = olMap;
    this.keyPoints = [];
    this.playOption = null;
    this.isPause = null;
    this.segment = null;
    this.raf = null;
    this.alive = false;
    this.destroyed = false;
  }
  /** 把调用方传入的位置收成 [经度, 纬度, 高度] */
  readDestination(destination) {
    if (Array.isArray(destination)) {
      const lon = Number(destination[0]);
      const lat = Number(destination[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
      const height = Number(destination[2]);
      return [lon, lat, Number.isFinite(height) ? height : 0];
    }
    const lon = Number(destination?.lon ?? destination?.longitude);
    const lat = Number(destination?.lat ?? destination?.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    const height = Number(destination?.height);
    return [lon, lat, Number.isFinite(height) ? height : 0];
  }
  /** 角度用弧度，和三维 HeadingPitchRoll 一致 */
  readOrientation(orientation) {
    const heading = Number(orientation?.heading);
    const pitch = Number(orientation?.pitch);
    const roll = Number(orientation?.roll);
    return {
      heading: Number.isFinite(heading) ? heading : 0,
      pitch: Number.isFinite(pitch) ? pitch : -Math.PI / 2,
      roll: Number.isFinite(roll) ? roll : 0
    };
  }
  createOptions(destination, orientation, duration) {
    const position = this.readDestination(destination);
    if (!position) return null;
    const time = Number(duration);
    return {
      destination: position,
      orientation: this.readOrientation(orientation),
      duration: Number.isFinite(time) ? time : 5
    };
  }
  /**添加节点
   * @param {Array|Object} destination [lon, lat, height] 或 {lon, lat, height}
   * @param {Object} orientation {heading, pitch, roll} 弧度
   * @param {Number} duration 到下一节点时间(秒) default:5
   */
  addKeyPoint(destination, orientation, duration) {
    if (this.destroyed) return null;
    const options = this.createOptions(destination, orientation, duration);
    if (!options) return null;
    this.keyPoints.push(options);
    return options;
  }
  /**添加当前视图为新节点
   * @param {Number} duration 到下一节点时间(秒) default:5
   */
  addKeyPointByCurrentView(duration) {
    const view = this.olMap?.getView?.();
    const center = view?.getCenter?.();
    if (!center) return null;
    const height = getHeight(this.olMap);
    // 二维旋转和三维航向相反，这里存成三维航向
    const heading = -(view.getRotation?.() || 0);
    return this.addKeyPoint(
      [center[0], center[1], height],
      { heading, pitch: -Math.PI / 2, roll: 0 },
      duration
    );
  }
  /**根据索引值设置节点信息
   * @param {Number} index
   * @param {Object} options addKeyPoint 返回的节点
   */
  setKeyPointByIndex(index, options) {
    if (this.destroyed || !this.keyPoints) return;
    this.stop();
    const point = this.createOptions(options?.destination, options?.orientation, options?.duration);
    if (!point) return;
    this.keyPoints.splice(index, 1, point);
  }
  /**根据索引值删除节点
   * @param {Number} index
   */
  removeKeyPointByIndex(index) {
    if (this.destroyed || !this.keyPoints) return;
    this.stop();
    this.keyPoints.splice(index, 1);
  }
  /**清空节点 */
  clearKeyPoints() {
    if (this.destroyed) return;
    this.stop();
    this.keyPoints = [];
  }
  /**获取全部节点 */
  getAllKeyPoints() {
    return this.keyPoints || [];
  }
  /** 把当前段的位置和航向写进视图。t 为 0 到 1 */
  applySegment(t) {
    const view = this.olMap?.getView?.();
    const segment = this.segment;
    if (!view || !segment) return false;
    const from = segment.from.destination;
    const to = segment.to.destination;
    const lon = from[0] + (to[0] - from[0]) * t;
    const lat = from[1] + (to[1] - from[1]) * t;
    const height = from[2] + (to[2] - from[2]) * t;
    const heading = lerpHeading(segment.from.orientation.heading, segment.to.orientation.heading, t);
    view.setCenter([lon, lat]);
    // 与二三维切换一致：视图旋转取航向的相反数
    view.setRotation(-heading);
    const zoom = heightToZoom(Math.max(height, 1));
    if (Number.isFinite(zoom)) view.setZoom(zoom);
    return true;
  }
  playSegment(from, to, duration) {
    if (this.raf) cancelAnimationFrame(this.raf);
    const durationMs = Math.max(0, Number(duration) || 0) * 1000;
    this.segment = { from, to, durationMs, elapsed: 0, lastNow: performance.now() };
    this.alive = true;
    this.olMap?.getView?.()?.cancelAnimations?.();
    this.applySegment(0);
    const tick = now => {
      if (!this.alive || !this.segment) return;
      const delta = now - this.segment.lastNow;
      this.segment.lastNow = now;
      if (!this.isPause) this.segment.elapsed += delta;
      const t = this.segment.durationMs <= 0 ? 1 : Math.min(1, this.segment.elapsed / this.segment.durationMs);
      if (!this.applySegment(t)) {
        this.stop();
        return;
      }
      // 暂停时停在当前帧，到点后再进入下一段
      if (t >= 1 && !this.isPause) {
        this.segment = null;
        this.raf = null;
        this.play();
        return;
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }
  /**播放 */
  play() {
    if (this.destroyed || !this.keyPoints || this.keyPoints.length < 2) return;
    if (this.isPause && this.segment) {
      this.isPause = false;
      this.alive = true;
      return;
    }
    if (!this.playOption) {
      this.playOption = { index: 0 };
    } else if (this.playOption.index < this.keyPoints.length - 2) {
      this.playOption.index += 1;
    } else {
      this.playOption = null;
      return;
    }
    this.isPause = false;
    const current = this.keyPoints[this.playOption.index];
    const next = this.keyPoints[this.playOption.index + 1];
    this.playSegment(current, next, current.duration);
  }
  /**暂停 */
  pause() {
    this.isPause = true;
  }
  /**停止 */
  stop() {
    this.alive = false;
    this.playOption = null;
    this.isPause = null;
    this.segment = null;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }
  /**注销 */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.stop();
    this.keyPoints = null;
    this.olMap = null;
  }
}
export { AnimationPath };
