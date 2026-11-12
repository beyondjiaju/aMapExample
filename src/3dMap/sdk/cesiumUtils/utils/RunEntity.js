import * as Cesium from "@/3dMap/sdk/cesium";
/**创建
 * @param {Object} viewer-viewer对象
 * @param
 */
class RunEntity {
  constructor(viewer) {
    const that = this;
    that.viewer = viewer;
    that.entityCollection = new Cesium.CustomDataSource("RunEntityCollection");
    that.viewer.dataSources.add(that.entityCollection);
    that.allListener = [];
  }
  /**加载模型
   * @param {Object} options
   * @param {Array} options.positions-模型运动坐标Degrees [[longitude, latitude, height]]
   * @param {Boolean} options.show-是否显示 default:true
   * @param {Boolean} options.spline-是否对坐标进行插值处理 default:true
   * @param {Number} options.period-spline为true时生效 坐标两点之间超过此长度对坐标进行插值处理 default：1
   * @param {Number} options.step-spline为true时生效 坐标两点之间插值距离 default：1
   * @param {Object} options.entity-已加载的实体模型
   * @param {Object} options.model-模型参数Entity.model
   * @param {String} options.modelAngle-模型需要调整的角度
   * @param {Object} options.properties-模型参数Entity.properties
   * @param {Function} options.listenCallback-监听回调
   * @param {Function} options.endCallback-运动结束回调
   * @param {Boolean} options.loop-循环播放 default：false
   */
  loadRunEntity(options) {
    const that = this;
    // console.log(that.allListener);
    if (!that.viewer) return;
    const defaultOptions = {
      id: Cesium.createGuid(),
      show: true,
      spline: true,
      period: 1,
      step: 1,
      loop: false
    };
    options = Object.assign(defaultOptions, options);
    return new Promise((resolve, reject) => {
      let index = 0;
      let positions = options.positions;
      // 坐标插值处理
      if (positions.length > 1 && options.spline)
        positions = that.positionsSpline(
          options.positions,
          options.period,
          options.step
        );
      // 设置返回数据
      const h =
        positions[index][2] && positions[index][2] > 0
          ? positions[index][2]
          : 10;
      let ret = {
        modelPosition: Cesium.Cartesian3.fromDegrees(
          positions[index][0],
          positions[index][1],
          h
        ),
        prevPosition: null,
        quaternion: null
      };
      // 一个坐标点更新存坐标
      if (options.entity && positions.length == 1) {
        // 存坐标
        ret.prevPosition = options.entity.position.getValue(
          that.viewer.clock.currentTime
        );
      }
      if (options.entity) {
        ret.entity = options.entity;
        ret.entity.properties = options.properties;
        ret.entity.position = new Cesium.CallbackProperty(() => {
          return ret.modelPosition;
        }, false);
      } else {
        if (that.entityCollection.entities.getById(options.id)) {
          console.log("runEntity已存在");
          return;
        }
        // 添加模型
        ret.entity = that.entityCollection.entities.add({
          id: options.id,
          position: new Cesium.CallbackProperty(() => {
            return ret.modelPosition;
          }, false),
          show: options.show,
          model: Cesium.defaultValue(options.model, undefined),
          billboard: Cesium.defaultValue(options.billboard, undefined),
          point: Cesium.defaultValue(options.point, undefined),
          label: Cesium.defaultValue(options.label, undefined),
          properties: options.properties
        });
      }
      if (ret.prevPosition) {
        const hp = that.getHeadingPitch(ret.prevPosition, ret.modelPosition);
        // 更新角度
        let heading = hp.heading;
        if (options.modelAngle) {
          heading = Cesium.Math.toRadians(
            Cesium.Math.toDegrees(heading) + Number(options.modelAngle)
          );
        } else {
          heading = Cesium.Math.toRadians(Cesium.Math.toDegrees(heading) - 90);
        }
        ret.heading = heading;
        ret.pitch = hp.pitch;
        const hpRoll = new Cesium.HeadingPitchRoll(ret.heading, ret.pitch, 0);
        ret.quaternion = Cesium.Transforms.headingPitchRollQuaternion(
          ret.prevPosition,
          hpRoll
        );
        // 设置角度
        ret.entity.orientation = ret.quaternion;
        // 设置属性
        if (!ret.entity.properties.heading) {
          ret.entity.properties.addProperty("heading", ret.heading);
        } else {
          ret.entity.properties.heading = ret.heading;
        }
        if (!ret.entity.properties.pitch) {
          ret.entity.properties.addProperty("pitch", ret.pitch);
        } else {
          ret.entity.properties.pitch = ret.pitch;
        }
        // ret.entity.properties.pitch = ret.pitch;
        // ret.entity.properties.addProperty('heading', ret.heading);
        // ret.entity.properties.addProperty('pitch', ret.pitch);
        if (ret.entity.billboard) {
          ret.entity.billboard.rotation = -hp.heading;
        }
      }
      if (positions.length >= 2) {
        const listenEvent = function () {
          if (!that.entityCollection.entities.getById(ret.entity.id)) return;
          // 存坐标
          ret.prevPosition = JSON.parse(JSON.stringify(ret.modelPosition));
          index++;
          // 更新坐标
          ret.modelPosition = Cesium.Cartesian3.fromDegrees(
            positions[index][0],
            positions[index][1],
            positions[index][2] || 0
          );
          const hp = that.getHeadingPitch(ret.prevPosition, ret.modelPosition);
          // 更新角度
          let heading = hp.heading;
          if (options.modelAngle) {
            heading = Cesium.Math.toRadians(
              Cesium.Math.toDegrees(heading) + Number(options.modelAngle)
            );
          } else {
            heading = Cesium.Math.toRadians(
              Cesium.Math.toDegrees(heading) - 90
            );
          }
          ret.heading = heading;
          ret.pitch = hp.pitch;
          const hpRoll = new Cesium.HeadingPitchRoll(ret.heading, ret.pitch, 0);
          ret.quaternion = Cesium.Transforms.headingPitchRollQuaternion(
            ret.prevPosition,
            hpRoll
          );
          // 设置角度
          if (index == 3) {
            ret.entity.orientation = new Cesium.CallbackProperty(() => {
              if (ret.prevPosition) {
                if (ret.quaternion && ret.quaternion.x) {
                  return ret.quaternion;
                }
              }
            }, false);
          }
          if (index > 3) {
            // 设置属性
            if (!ret.entity.properties.heading) {
              ret.entity.properties.addProperty("heading", ret.heading);
            } else {
              ret.entity.properties.heading = ret.heading;
            }
            if (!ret.entity.properties.pitch) {
              ret.entity.properties.addProperty("pitch", ret.pitch);
            } else {
              ret.entity.properties.pitch = ret.pitch;
            }
          }
          if (ret.entity.billboard && index > 3) {
            ret.entity.billboard.rotation = -Cesium.Math.toRadians(
              Cesium.Math.toDegrees(hp.heading)
            );
          }
          // 监听回调
          if (options.listenCallback) options.listenCallback(ret);
          // 运动结束
          if (index == positions.length - 1) {
            // 判断是否循环
            if (options.loop) {
              index = 0;
              ret.modelPosition = Cesium.Cartesian3.fromDegrees(
                positions[index][0],
                positions[index][1],
                positions[index][2] || 0
              );
            } else {
              // 结束回调
              if (options.endCallback) options.endCallback(ret);
              // 移除监听
              that.viewer.scene.postRender.removeEventListener(ret.event);
              const i = that.allListener.indexOf(ret.event);
              that.allListener.splice(i);
            }
          }
        };
        // 添加监听
        that.viewer.scene.postRender.addEventListener(listenEvent);
        that.allListener.push(listenEvent);
        ret.event = listenEvent;
      } else {
        // 结束回调
        if (options.endCallback) options.endCallback(ret);
      }
      resolve(ret);
    });
  }
  /**数据插值处理
   * @param {Array} positions
   * @param {Number} period 距离超过此数值进行插值
   * @param {Number} step 插值步长
   */
  positionsSpline(positions, period, step) {
    const newPositions = [];
    positions.forEach((val, dex) => {
      if (dex != 0) {
        const distance = Cesium.Cartesian3.distance(
          Cesium.Cartesian3.fromDegrees(val[0], val[1], val[2] || 0),
          Cesium.Cartesian3.fromDegrees(
            positions[dex - 1][0],
            positions[dex - 1][1],
            positions[dex - 1][2] || 0
          )
        );
        if (distance > period) {
          const points = this.spline([positions[dex - 1], val], distance, step);
          points.forEach(p => {
            newPositions.push(p);
          });
        } else {
          newPositions.push(val);
        }
        if (dex == positions.length - 1) {
          newPositions.push(val);
        }
      } else {
        newPositions.push(val);
      }
    });
    return newPositions;
  }
  /**插值 */
  spline(positions, distance, step) {
    const that = this;
    const newPositions = [];
    // 判断坐标是否有高度
    let points;
    if (positions[0].length > 2) {
      points = Cesium.Cartesian3.fromDegreesArrayHeights(
        positions.flat(Infinity)
      );
    } else {
      points = Cesium.Cartesian3.fromDegreesArray(positions.flat(Infinity));
    }
    const spline = new Cesium.LinearSpline({
      times: [0.0, 0.25, 0.5, 0.75, 1],
      points
    });
    // 插值
    for (let i = 0; i < distance; i += step) {
      try {
        const c3 = spline.evaluate(i / distance);
        // 转经纬度
        const ellipsoid = that.viewer.scene.globe.ellipsoid;
        const cartographic = ellipsoid.cartesianToCartographic(c3);
        const p = [
          Cesium.Math.toDegrees(cartographic.longitude),
          Cesium.Math.toDegrees(cartographic.latitude),
          cartographic.height
        ];
        newPositions.push(p);
      } catch (error) {
        // console.log('插值结束');
        break;
      }
    }
    return newPositions;
  }
  /**获取两点间heading pitch
   * @param {Object} left Cartesian3
   * @param {Object} right Cartesian3
   */
  getHeadingPitch(left, right) {
    //建立以点A为原点，X轴为east,Y轴为north,Z轴朝上的坐标系
    const transform = Cesium.Transforms.eastNorthUpToFixedFrame(left);
    //向量AB
    const positionvector = Cesium.Cartesian3.subtract(
      right,
      left,
      new Cesium.Cartesian3()
    );
    //因transform是将A为原点的eastNorthUp坐标系中的点转换到世界坐标系的矩阵
    //AB为世界坐标中的向量
    //因此将AB向量转换为A原点坐标系中的向量，需乘以transform的逆矩阵。
    const vector = Cesium.Matrix4.multiplyByPointAsVector(
      Cesium.Matrix4.inverse(transform, new Cesium.Matrix4()),
      positionvector,
      new Cesium.Cartesian3()
    );
    //归一化
    const direction = Cesium.Cartesian3.normalize(
      vector,
      new Cesium.Cartesian3()
    );
    //heading
    const heading =
      Math.atan2(direction.y, direction.x) - Cesium.Math.PI_OVER_TWO;
    const ret = {
      heading: Cesium.Math.TWO_PI - Cesium.Math.zeroToTwoPi(heading),
      pitch: Cesium.Math.PI_OVER_TWO - Cesium.Math.acosClamped(direction.z)
    };
    return ret;
  }
  /**删除实体 */
  remove(ret) {
    // 移除监听
    const i = this.allListener.indexOf(ret.event);
    if (i >= 0) {
      this.viewer.scene.postRender.removeEventListener(ret.event);
      this.allListener.splice(i);
    }
    // 删除实体
    this.entityCollection.entities.remove(ret.entity);
  }
  /**清除全部 */
  removeAll() {
    this.allListener.forEach(val => {
      this.viewer.scene.postRender.removeEventListener(val);
    });
    this.allListener = [];
    this.entityCollection.entities.removeAll();
  }
  /**注销 */
  destroy() {
    this.removeAll();
    this.allListener = null;
    // 实体集合
    this.viewer.dataSources.remove(this.entityCollection, true);
    this.entityCollection = null;
    this.viewer = null;
  }
}
export { RunEntity };
