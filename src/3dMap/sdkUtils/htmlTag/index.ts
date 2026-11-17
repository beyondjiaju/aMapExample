import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer, olMap } from "@/3dMap/global";
import { mapEmitter } from "@/3dMap/interface";
import {
  HtmlTag as HtmlTagCesium,
  HtmlTagCollection as HtmlTagCollectionCesium
} from "@/3dMap/sdk/cesiumUtils";
import {
  HtmlTag as HtmlTagOl,
  HtmlTagCollection as HtmlTagCollectionOl
} from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";

/** 把经纬度、[lon,lat] 或 Cartesian3 收成同一套坐标 */
function readLonLat(position) {
  if (!position) return null;
  if (Array.isArray(position)) {
    return {
      lon: Number(position[0]),
      lat: Number(position[1]),
      height: Number(position[2]) || 0
    };
  }
  if (typeof position.lon === "number" && typeof position.lat === "number") {
    return {
      lon: position.lon,
      lat: position.lat,
      height: Number(position.height) || 0
    };
  }
  if (
    typeof position.x === "number" &&
    typeof position.y === "number" &&
    typeof position.z === "number"
  ) {
    const carto = Cesium.Cartographic.fromCartesian(position);
    return {
      lon: Cesium.Math.toDegrees(carto.longitude),
      lat: Cesium.Math.toDegrees(carto.latitude),
      height: carto.height || 0
    };
  }
  return null;
}

/**
 * 二三维通用标牌集合。
 * 只往当前模式的地图上加标牌，历史数据在切换模式时再挂到新地图。
 */
class HtmlTagCollection {
  option: any;
  collection: any;
  history: any[];
  visible: any;
  drag: any;
  collision: any;
  dragLine: any;
  visibleById: any;
  mapEmitterOff: any;
  constructor(option?) {
    this.option = option;
    this.collection = null;
    this.history = [];
    this.visible = null;
    this.drag = null;
    this.collision = null;
    this.dragLine = null;
    this.visibleById = {};
    this.mapEmitterOff = null;
    this.setByMapMode();
    // 模式切换后丢掉旧集合，按历史记录在新地图上重建
    this.mapEmitterOff = mapEmitter.on("mapEvents:mapModeChangeSetSdkUtilsByCurrentMode", () => {
      this.reloadByHistory();
    });
  }
  /** 按当前 mapMode 创建对应集合 */
  setByMapMode() {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium" && viewer && !viewer.isDestroyed?.()) {
      this.collection = new HtmlTagCollectionCesium(viewer, this.option);
      return;
    }
    if (mapMode === "ol" && olMap) {
      this.collection = new HtmlTagCollectionOl(olMap, this.option);
    }
  }
  /** 用已记录的标牌和显示状态，同步到切换后的地图 */
  reloadByHistory() {
    this.collection?.destroy();
    this.collection = null;
    this.setByMapMode();
    this.history.forEach(record => {
      record.tag = this.createTag(record);
    });
    if (this.visible !== null) this.collection?.setVisible(this.visible);
    if (this.drag !== null) this.collection?.setDrag(this.drag);
    if (this.collision !== null) this.collection?.setCollision(this.collision);
    if (this.dragLine) this.collection?.setDragLine(this.dragLine);
    Object.keys(this.visibleById).forEach(id => {
      this.collection?.setVisibleById(id, this.visibleById[id]);
    });
  }
  /** 只在当前模式的集合里创建一个标牌 */
  createTag(record) {
    if (!this.collection) return null;
    const { lonlat, rest } = record;
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium" && viewer && !viewer.isDestroyed?.()) {
      const tag = new HtmlTagCesium(viewer, {
        ...rest,
        position: Cesium.Cartesian3.fromDegrees(
          lonlat.lon,
          lonlat.lat,
          lonlat.height || 0
        )
      });
      this.collection.add(tag);
      return tag;
    }
    if (mapMode === "ol" && olMap) {
      const tag = new HtmlTagOl(olMap, {
        ...rest,
        position: [lonlat.lon, lonlat.lat]
      });
      this.collection.add(tag);
      return tag;
    }
    return null;
  }
  findRecord(htmlTag) {
    if (!htmlTag) return null;
    return (
      this.history.find(
        item =>
          item === htmlTag ||
          item.tag === htmlTag ||
          (htmlTag.dom?.id && item.rest?.id == htmlTag.dom.id) ||
          (htmlTag.rest?.id && item.rest?.id == htmlTag.rest.id)
      ) || null
    );
  }
  /**
   * 记录参数并加到当前地图。
   * position 支持 [lon, lat]、{lon, lat} 或 Cartesian3。
   */
  add(options: any = {}) {
    const lonlat = readLonLat(options.position);
    if (!lonlat) return null;
    const rest = { ...options };
    delete rest.position;
    const record = { lonlat, rest, tag: null };
    record.tag = this.createTag(record);
    this.history.push(record);
    return record.tag;
  }
  /** HtmlTag.setHtml：更新记录和当前标牌内容 */
  setHtml(id, html) {
    this.history.forEach(item => {
      if (item.rest?.id != id) return;
      item.rest.html = html;
      item.tag?.setHtml(html);
    });
  }
  setVisible(state) {
    this.visible = state;
    this.collection?.setVisible(state);
  }
  setVisibleById(id, state) {
    this.visibleById[id] = state;
    this.collection?.setVisibleById(id, state);
  }
  setDrag(state) {
    this.drag = state;
    this.collection?.setDrag(state);
  }
  setDragLine(option) {
    this.dragLine = option;
    this.collection?.setDragLine(option);
  }
  get(index) {
    const record = this.history[index];
    if (!record) return this.collection?.get(index);
    return record.tag;
  }
  getById(id) {
    const record = this.history.find(item => item.rest?.id == id);
    if (!record) return this.collection?.getById(id);
    return record.tag;
  }
  getAll() {
    return this.history.map(item => item.tag).filter(Boolean);
  }
  remove(htmlTag, isDestroy) {
    const record = this.findRecord(htmlTag);
    if (!record) return;
    if (record.tag) this.collection?.remove(record.tag, isDestroy);
    this.history = this.history.filter(item => item !== record);
    if (record.rest?.id != null) delete this.visibleById[record.rest.id];
  }
  removeById(id, isDestroy) {
    this.collection?.removeById(id, isDestroy);
    this.history = this.history.filter(item => item.rest?.id != id);
    delete this.visibleById[id];
  }
  removeAll(isDestroy) {
    this.collection?.removeAll(isDestroy);
    this.history = [];
    this.visibleById = {};
  }
  setCollision(state) {
    this.collision = state;
    this.collection?.setCollision(state);
  }
  isCrash(a, b) {
    return this.collection?.isCrash(a, b);
  }
  destroy() {
    this.mapEmitterOff?.();
    this.mapEmitterOff = null;
    this.collection?.destroy();
    this.collection = null;
    this.history = [];
    this.visibleById = {};
  }
}
export { HtmlTagCollection };
