import * as Cesium from "@/3dMap/sdk/cesium";
class AnimationPath {
  constructor(viewer) {
    this.viewer = viewer;
    this.keyPoints = [];
  }
  /**添加节点
   * @param {Object} option
   * @param {Cesium.Cartesian3|Array<Number>} option.position 笛卡尔坐标或 [经度, 纬度, 高度]
   * @param {Object} option.orientation {heading, pitch, roll}，单位为度；兼容 Cesium.HeadingPitchRoll
   * @param {Number} option.duration 到下一节点时间(秒) default:5
   * @returns {{position: Array<Number>, orientation: {heading: Number, pitch: Number, roll: Number}, duration: Number}}
   */
  addKeyPoint(option) {
    // 外部入参转为 Cesium 格式后写入，keyPoints 存储结构保持不变
    const storeOption = this._toStoreKeyPoint(option);    
    this.keyPoints.push(storeOption);
    // 对外返回经纬度与度数，调用方无需再做坐标转换
    return this._toExternalKeyPoint(storeOption);
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
    return this.addKeyPoint({
      position,
      orientation,
      duration
    });
  }
  /**根据索引值设置节点信息
   * @param {Number} index
   * @param {Object} options addKeyPoint 返回的数据格式
   */
  setKeyPointByIndex(index, options) {
    this.stop();
    // 入参为外部度数格式，替换前转为 keyPoints 支持的 Cesium 存储格式
    const storeOption = this._toStoreKeyPoint(options);
    // 按索引替换时保留调用方传入的 duration，不再套用新增默认值
    storeOption.duration = options.duration;
    this.keyPoints.splice(index, 1, storeOption);
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
  /**获取全部节点，返回格式与 addKeyPoint 一致 */
  getAllKeyPoints() {
    // 逐条转为 [经度, 纬度, 高度] 与度数姿态后再返回
    return this.keyPoints.map(item => this._toExternalKeyPoint(item));
  }
  /**播放
   * @param {Function} endCallback 全部节点播放结束回调
   */
  play(endCallback) {
    // 仅外部传入时记录；段与段之间的内部续播不覆盖
    if (typeof endCallback === "function") {
      this.endCallback = endCallback;
    }
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
      // 最后一段播完后再进入 play，此时整段路径结束
      const callback = this.endCallback;
      this.endCallback = null;
      callback && callback();
      return;
    }    
    const indexKeyPoint = this.keyPoints[this.playOption.index],
      nextKeyPoint = this.keyPoints[this.playOption.index + 1];
    const positions = [indexKeyPoint.position, nextKeyPoint.position];
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
    // 手动停止不算播放结束，丢掉尚未触发的结束回调
    this.endCallback = null;
    if (this.listen) {
      this.viewer.scene.postRender.removeEventListener(this.listen);
      this.listen = null;
    }
  }
  /**外部点位转为 keyPoints 存储格式 */
  _toStoreKeyPoint(option) {
    return {
      position: this._toStorePosition(option.position),
      orientation: this._toStoreOrientation(option.orientation),
      duration: Cesium.defaultValue(option.duration, 5)
    };
  }
  /**position：Cartesian3 原样存储，经纬度高度数组转为 Cartesian3 */
  _toStorePosition(position) {
    if (position instanceof Cesium.Cartesian3) {
      return Cesium.Cartesian3.clone(position);
    }
    // [经度, 纬度, 高度]，高度缺省为 0
    if (Array.isArray(position)) {
      return Cesium.Cartesian3.fromDegrees(
        position[0],
        position[1],
        Cesium.defaultValue(position[2], 0)
      );
    }
    return position;
  }
  /**orientation：HeadingPitchRoll 原样存储，{heading,pitch,roll} 按度转为弧度 */
  _toStoreOrientation(orientation) {
    if (orientation instanceof Cesium.HeadingPitchRoll) {
      return new Cesium.HeadingPitchRoll(
        orientation.heading,
        orientation.pitch,
        orientation.roll
      );
    }
    // 外部度数对象转为内部 HeadingPitchRoll
    const degrees = orientation || {};
    return Cesium.HeadingPitchRoll.fromDegrees(
      Cesium.defaultValue(degrees.heading, 0),
      Cesium.defaultValue(degrees.pitch, 0),
      Cesium.defaultValue(degrees.roll, 0)
    );
  }
  /**keyPoints 存储格式转为外部返回格式：position 为 [经度, 纬度, 高度]，姿态为度 */
  _toExternalKeyPoint(storeOption) {
    const cartographic = Cesium.Cartographic.fromCartesian(storeOption.position);
    return {
      position: [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude),
        cartographic.height
      ],
      orientation: {
        heading: Cesium.Math.toDegrees(storeOption.orientation.heading),
        pitch: Cesium.Math.toDegrees(storeOption.orientation.pitch),
        roll: Cesium.Math.toDegrees(storeOption.orientation.roll)
      },
      duration: storeOption.duration
    };
  }
  /**注销 */
  destroy() {
    this.stop();
    this.keyPoints = null;
    this.viewer = null;
  }
}
export { AnimationPath };
