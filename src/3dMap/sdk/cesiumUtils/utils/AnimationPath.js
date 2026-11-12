import * as Cesium from "@/3dMap/sdk/cesium";
class AnimationPath {
  constructor(viewer) {
    this.viewer = viewer;
    this.keyPoints = [];
  }
  /**添加节点
   * @param {Object} destination Cesium.Cartesian
   * @param {Object} orientation Cesium.HeadingPitchRoll
   * @param {Number} duration 到下一节点时间(秒) default:5
   */
  addKeyPoint(destination, orientation, duration) {
    const options = {
      destination,
      orientation,
      duration: Cesium.defaultValue(duration, 5)
    };
    this.keyPoints.push(options);
    return options;
  }
  /**添加相机当前视角为新节点
   * @param {Number} duration 到下一节点时间(秒) default:5
   */
  addKeyPointByCurrentView(duration) {
    const camera = this.viewer.camera;
    const position = Cesium.Cartesian3.clone(camera.position);
    const orientation = new Cesium.HeadingPitchRoll(
      camera.heading,
      camera.pitch,
      camera.roll
    );
    return this.addKeyPoint(position, orientation, duration);
  }
  /**根据索引值设置节点信息
   * @param {Number} index
   * @param {Object} options addkeyPoint方法return options格式
   */
  setKeyPointByIndex(index, options) {
    this.stop();
    this.keyPoints.splice(index, 1, options);
  }
  /**根据索引值删除节点
   * @param {Number} index
   */
  removeKeyPointByIndex(index) {
    this.stop();
    this.keyPoints.splice(index, 1);
  }
  /**清空节点 */
  clearKeyPoints() {
    this.stop();
    this.keyPoints = [];
  }
  /**获取全部节点 */
  getAllKeyPoints() {
    return this.keyPoints;
  }
  /**播放 */
  play() {
    if (this.keyPoints.length < 2) return;
    this.viewer.clock.shouldAnimate = true;
    if (this.isPause && this.listen) {
      this.isPause = false;
      return;
    }
    if (!this.playOption) {
      this.playOption = {
        index: 0
      };
    } else if (this.playOption.index < this.keyPoints.length - 2) {
      this.playOption.index++;
    } else {
      this.playOption = null;
      return;
    }
    const indexKeyPoint = this.keyPoints[this.playOption.index],
      nextKeyPoint = this.keyPoints[this.playOption.index + 1];
    const positions = [indexKeyPoint.destination, nextKeyPoint.destination];
    const orientations = [indexKeyPoint.orientation, nextKeyPoint.orientation];
    this.playKeyPointFromTime(positions, orientations, indexKeyPoint.duration);
  }
  playKeyPointFromTime(positions, orientations, duration) {
    const that = this;
    const startTime = that.viewer.clock.currentTime;
    // 计算结束时间
    const stopTime = Cesium.JulianDate.addSeconds(
      startTime,
      duration,
      new Cesium.JulianDate()
    );
    // positions存储对象
    const sample_position = new Cesium.SampledPositionProperty();
    // 添加开始结束点
    sample_position.addSample(startTime, positions[0]);
    sample_position.addSample(stopTime, positions[1]);
    sample_position.setInterpolationOptions({
      interpolationAlgorithm: Cesium.LinearApproximation
    });
    // 角度
    const hpr_dex = orientations[0],
      hpr_next = orientations[1],
      newDuration = duration * 1000;
    let difference_heading =
        Cesium.Math.toDegrees(hpr_next.heading) -
        Cesium.Math.toDegrees(hpr_dex.heading),
      difference_pitch =
        Cesium.Math.toDegrees(hpr_next.pitch) -
        Cesium.Math.toDegrees(hpr_dex.pitch),
      difference_roll =
        Cesium.Math.toDegrees(hpr_next.roll) -
        Cesium.Math.toDegrees(hpr_dex.roll);
    // heading处理
    const abs_heading = Math.abs(difference_heading);
    if (abs_heading > 180) {
      if (difference_heading < 0) {
        difference_heading = 360 - abs_heading;
      } else {
        difference_heading = abs_heading - 360;
      }
    }
    // 计算角度stemp
    const step_heading = difference_heading / newDuration,
      step_pitch = difference_pitch / newDuration,
      step_roll = difference_roll / newDuration;
    // 获取角度集合
    const hprs = [];
    for (let i = 0; i < newDuration; i++) {
      const newHeading =
          Cesium.Math.toDegrees(hpr_dex.heading) + step_heading * i,
        newPitch = Cesium.Math.toDegrees(hpr_dex.pitch) + step_pitch * i,
        newRoll = Cesium.Math.toDegrees(hpr_dex.roll) + step_roll * i;
      const hpr = Cesium.HeadingPitchRoll.fromDegrees(
        newHeading,
        newPitch,
        newRoll
      );
      hprs.push(hpr);
    }
    this.listen = (d, time) => {
      const dex = Math.floor(
        (duration - (stopTime.secondsOfDay - time.secondsOfDay)) * 1000
      );
      let orientation;
      if (hprs[dex]) {
        orientation = hprs[dex];
      } else {
        orientation = hprs[hprs.length - 1];
      }
      if (time < stopTime) {
        that.viewer.camera.setView({
          destination: sample_position.getValue(time),
          orientation
        });
      } else {
        that.viewer.scene.postRender.removeEventListener(that.listen);
        that.listen = null;
        // 继续播放下一节点
        that.play();
      }
    };
    // 添加监听
    that.viewer.scene.postRender.addEventListener(that.listen);
  }
  /**暂停 */
  pause() {
    this.viewer.clock.shouldAnimate = false;
    this.isPause = true;
  }
  /**停止 */
  stop() {
    this.viewer.clock.shouldAnimate = false;
    this.playOption = null;
    this.isPause = null;
    if (this.listen) {
      this.viewer.scene.postRender.removeEventListener(this.listen);
      this.listen = null;
    }
  }
  /**注销 */
  destroy() {
    this.stop();
    this.keyPoints = null;
    this.viewer = null;
  }
}
export { AnimationPath };
