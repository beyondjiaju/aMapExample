import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer, olMap } from "@/3dMap/global";
import { mapEmitter } from "@/3dMap/interface";
import { AnimationPath as AnimationPathCesium } from "@/3dMap/sdk/cesiumUtils";
import { AnimationPath as AnimationPathOl, getHeight, heightToZoom } from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";

/** 位置收成经纬度。支持 {lon,lat,height}、[lon,lat,height] 和 Cartesian3 */
function readDestination(destination) {
  if (!destination) return null;
  if (Array.isArray(destination)) {
    const lon = Number(destination[0]);
    const lat = Number(destination[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    const height = Number(destination[2]);
    return { lon, lat, height: Number.isFinite(height) ? height : 0 };
  }
  if (typeof destination.lon === "number" || typeof destination.longitude === "number") {
    const lon = Number(destination.lon ?? destination.longitude);
    const lat = Number(destination.lat ?? destination.latitude);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
    const height = Number(destination.height);
    return { lon, lat, height: Number.isFinite(height) ? height : 0 };
  }
  if (typeof destination.x === "number" && typeof destination.y === "number" && typeof destination.z === "number") {
    const carto = Cesium.Cartographic.fromCartesian(destination);
    return {
      lon: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
      height: carto.height || 0
    };
  }
  return null;
}

/** 航向、俯仰、翻滚用弧度，缺省时按俯视 */
function readOrientation(orientation) {
  const heading = Number(orientation?.heading);
  const pitch = Number(orientation?.pitch);
  const roll = Number(orientation?.roll);
  return {
    heading: Number.isFinite(heading) ? heading : 0,
    pitch: Number.isFinite(pitch) ? pitch : -Math.PI / 2,
    roll: Number.isFinite(roll) ? roll : 0
  };
}

function readDuration(duration) {
  const time = Number(duration);
  return Number.isFinite(time) ? time : 5;
}

/**
 * 二三维通用路径播放。
 * 节点记在这里，只在当前地图上创建播放对象；切换模式时用同一份节点重建。
 */
class AnimationPath {
  records: any[];
  engine: any;
  mapEmitterOff: any;
  constructor() {
    this.records = [];
    this.engine = null;
    this.mapEmitterOff = null;
    this.engine = this.createEngine();
    this.mapEmitterOff = mapEmitter.on("mapEvents:mapModeChangeSetSdkUtilsByCurrentMode", () => {
      this.rebuild();
    });
  }
  /** 按当前 mapMode 创建二维或三维播放对象 */
  createEngine() {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium" && viewer && !viewer.isDestroyed?.()) {
      return new AnimationPathCesium(viewer);
    }
    if (mapMode === "ol" && olMap) return new AnimationPathOl(olMap);
    return null;
  }
  /** 把一条记录写成当前地图使用的节点参数 */
  toNative(record) {
    if (mapData().mapMode === "cesium") {
      return {
        destination: Cesium.Cartesian3.fromDegrees(record.lon, record.lat, record.height),
        orientation: new Cesium.HeadingPitchRoll(record.heading, record.pitch, record.roll),
        duration: record.duration
      };
    }
    return {
      destination: [record.lon, record.lat, record.height],
      orientation: {
        heading: record.heading,
        pitch: record.pitch,
        roll: record.roll
      },
      duration: record.duration
    };
  }
  normalize(destination, orientation, duration) {
    // 允许直接传入 addKeyPoint 返回的整段节点
    if (destination?.destination) {
      return this.normalize(destination.destination, destination.orientation, destination.duration);
    }
    const position = readDestination(destination);
    if (!position) return null;
    return {
      ...position,
      ...readOrientation(orientation),
      duration: readDuration(duration)
    };
  }
  writeEngine(record) {
    if (!this.engine) return;
    const native = this.toNative(record);
    this.engine.addKeyPoint(native.destination, native.orientation, native.duration);
  }
  /** 切换后丢掉旧播放对象，按已有节点在新地图上重建 */
  rebuild() {
    this.engine?.destroy?.();
    this.engine = this.createEngine();
    this.records.forEach(record => this.writeEngine(record));
  }
  /**添加节点
   * @param {Object|Array} destination 经纬度、数组或 Cartesian3
   * @param {Object} orientation {heading, pitch, roll} 弧度
   * @param {Number} duration 到下一节点时间(秒) default:5
   */
  addKeyPoint(destination, orientation, duration) {
    const record = this.normalize(destination, orientation, duration);
    if (!record) return null;
    this.records.push(record);
    this.writeEngine(record);
    return record;
  }
  /** 读取当前模式的相机，作为新节点 */
  readCurrentView() {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium" && viewer && !viewer.isDestroyed?.()) {
      const carto = viewer.camera.positionCartographic;
      return {
        destination: {
          lon: Cesium.Math.toDegrees(carto.longitude),
          lat: Cesium.Math.toDegrees(carto.latitude),
          height: carto.height || 0
        },
        orientation: {
          heading: viewer.camera.heading,
          pitch: viewer.camera.pitch,
          roll: viewer.camera.roll
        }
      };
    }
    if (mapMode === "ol" && olMap) {
      const view = olMap.getView();
      const center = view?.getCenter?.();
      if (!center) return null;
      const height = getHeight(olMap);
      return {
        destination: { lon: center[0], lat: center[1], height },
        orientation: {
          heading: -(view.getRotation?.() || 0),
          pitch: -Math.PI / 2,
          roll: 0
        }
      };
    }
    return null;
  }
  /**添加当前视角为新节点
   * @param {Number} duration 到下一节点时间(秒) default:5
   */
  addKeyPointByCurrentView(duration=5) {
    const current = this.readCurrentView();
    if (!current) return null;
    return this.addKeyPoint(current.destination, current.orientation, duration);
  }
  /**根据索引值设置节点信息 */
  setKeyPointByIndex(index, options) {
    if (index < 0 || index >= this.records.length) return;
    const record = this.normalize(options?.destination ?? options, options?.orientation, options?.duration);
    if (!record) return;
    this.records.splice(index, 1, record);
    const native = this.toNative(record);
    this.engine?.setKeyPointByIndex(index, native);
  }
  /**根据索引值删除节点 */
  removeKeyPointByIndex(index) {
    if (index < 0 || index >= this.records.length) return;
    this.records.splice(index, 1);
    this.engine?.removeKeyPointByIndex(index);
  }
  /**清空节点 */
  clearKeyPoints() {
    this.records = [];
    this.engine?.clearKeyPoints();
  }
  /**获取全部节点 */
  getAllKeyPoints() {
    return this.records;
  }
  /**播放 */
  play() {
    this.engine?.play();
  }
  /**暂停 */
  pause() {
    this.engine?.pause();
  }
  /**停止 */
  stop() {
    this.engine?.stop();
  }
  /**
   * 按位置和角度定位当前地图，不播放。
   * heading、pitch、roll 为弧度。二维使用经纬度、航向和高度。
   */
  locate(point) {
    this.stop();
    const lon = Number(point?.lon);
    const lat = Number(point?.lat);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    const heightValue = Number(point?.height);
    const height = Number.isFinite(heightValue) ? heightValue : 8000;
    const heading = Number.isFinite(Number(point?.heading)) ? Number(point.heading) : 0;
    const pitch = Number.isFinite(Number(point?.pitch)) ? Number(point.pitch) : -Math.PI / 2;
    const roll = Number.isFinite(Number(point?.roll)) ? Number(point.roll) : 0;
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium" && viewer && !viewer.isDestroyed?.()) {
      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, height),
        orientation: { heading, pitch, roll }
      });
      return;
    }
    if (mapMode === "ol" && olMap) {
      const view = olMap.getView();
      if (!view) return;
      view.cancelAnimations?.();
      view.setCenter([lon, lat]);
      view.setRotation(-heading);
      const zoom = heightToZoom(Math.max(height, 1));
      if (Number.isFinite(zoom)) view.setZoom(zoom);
    }
  }
  /**注销 */
  destroy() {
    this.mapEmitterOff?.();
    this.mapEmitterOff = null;
    this.engine?.destroy?.();
    this.engine = null;
    this.records = [];
  }
}
export { AnimationPath };
