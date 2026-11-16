import * as ol from "@/3dMap/sdk/ol";
import OlHeatmap from "./js/OlHeatmap";
import getHeatMapOption from "./js/getHeatMapOption";

/** 把 showArea 收成 [lon, lat] 环，空数组视为未传 */
function readShowArea(showArea) {
  if (!Array.isArray(showArea) || showArea.length < 3) return null;
  const ring = showArea.filter(
    item => Array.isArray(item) && item.length >= 2 && typeof item[0] === "number"
  );
  return ring.length >= 3 ? ring : null;
}

/** 射线法判断点是否在多边形内 */
function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** 只接受 move、click，其它值（含 null）不注册鼠标事件 */
function readMouseLookAt(mouseLookAt) {
  return mouseLookAt === "move" || mouseLookAt === "click" ? mouseLookAt : null;
}

/** 点是否落在这块热力的展示范围内：有多边形用多边形，否则用影像矩形 */
function pointInHeatArea(lon, lat, heatMap) {
  if (heatMap._lookRing) return pointInRing(lon, lat, heatMap._lookRing);
  const bounds = heatMap.bounds;
  if (!bounds) return false;
  return lon >= bounds.west && lon <= bounds.east && lat >= bounds.south && lat <= bounds.north;
}

/** 把经纬度换算成热力画布上的数值，画布外视为没有值 */
function readHeatValue(heatMap, lon, lat) {
  const point = heatMap.wgs84PointToHeatmapPoint({ x: lon, y: lat });
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.y < 0 ||
    point.x >= heatMap.width ||
    point.y >= heatMap.height
  ) {
    return null;
  }
  try {
    const value = heatMap._heatmap?.getValueAt?.(point);
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

function ringBounds(ring) {
  let west = Infinity;
  let east = -Infinity;
  let south = Infinity;
  let north = -Infinity;
  ring.forEach(([lon, lat]) => {
    west = Math.min(west, lon);
    east = Math.max(east, lon);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  });
  return { west, east, south, north };
}

/** 热力画布按经纬度铺在矩形上，用目标多边形把矩形外的像素裁掉 */
function clipCanvasToArea(heatMap, ring) {
  const canvas = heatMap._heatmap?._renderer?.canvas;
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  ctx.save();
  ctx.globalCompositeOperation = "destination-in";
  ctx.beginPath();
  ring.forEach((coord, index) => {
    const point = heatMap.wgs84PointToHeatmapPoint({ x: coord[0], y: coord[1] });
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
class HeatMap2D {
  /**
   * @param {Object} olMap
   * @param {Object} [options]
   * @param {String|null} options-mouseLookAt 鼠标取值方式：move 移动、click 点击，其它值不注册鼠标事件
   * @param {Function} options-mouseCallBack 鼠标在热力区域内时回传当前位置数值，区域外回传 null
   */
  constructor(olMap, options) {
    this.olMap = olMap;
    this.heatMaps = [];
    // 鼠标事件记在对象上，开关和切换都不重绘热力图
    this._mouseCallBack = typeof options?.mouseCallBack === "function" ? options.mouseCallBack : null;
    this._mouseLookAt = null;
    this.setMouseLookAt(options?.mouseLookAt);
  }
  /**添加热力图
   * @param {Array} data [{x: 110, y: 120, value: 50}]
   * @param {Object} options
   * @param {Number} options-radius 半径
   * @param {Number} options-maxOpacity 最大值透明度
   * @param {Number} options-minOpacity 最小值透明度
   * @param {Array} options-values 图例数值
   * @param {Array} options-colors 图例颜色
   * @param {Object} options-gradient 热力图色度表
   * @param {Array} options-showArea 展示范围，二维坐标 [[lon, lat], ...]。未传时仍按全部点的外接矩形绘制
   * values、colors 长度必须一致 values、colors / gradient 输入二选一 values、colors优先
   * gradient
   * 输入values与colors自动生成，未输入读取传入gradient,未传入使用默认配置
   */
  add(data, options) {
    const ring = readShowArea(options?.showArea);
    const source = ring ? data.filter(point => pointInRing(point.x, point.y, ring)) : data;
    if (!source.length) return;
    // 计算数值最大最小值
    let minValue, maxValue;
    const lons = [],
      lats = [];
    source.forEach(val => {
      lons.push(val.x);
      lats.push(val.y);
      // 最大值
      if (!maxValue || val.value > maxValue) maxValue = val.value;
      if (!minValue || val.value < minValue) minValue = val.value;
    });
    const heatOptions = { ...(options || {}) };
    delete heatOptions.showArea;
    // 获取加载option
    const heatMapOption = getHeatMapOption(heatOptions, minValue, maxValue);
    // 未传 showArea 时沿用点集外接矩形；传入后范围改为多边形外接矩形
    let bounds = ring
      ? ringBounds(ring)
      : {
          west: Math.min(...lons),
          east: Math.max(...lons),
          south: Math.min(...lats),
          north: Math.max(...lats)
        };
    // 创建
    let heatMap = OlHeatmap.create(this.olMap, bounds, heatMapOption);
    // 排序
    let values = source.sort((a, b) => {
      return a.value - b.value;
    });
    let valueMin = values[0].value;
    let valueMax = values[values.length - 1].value;
    heatMap.setWGS84Data(valueMin, valueMax, source);
    if (ring) {
      clipCanvasToArea(heatMap, ring);
      heatMap.updateLayer();
    }
    // 记录展示范围，鼠标取值时用来判断是否在热力区域内
    heatMap._lookRing = ring;
    this.heatMaps.push(heatMap);
    // 返回结果
    return heatMap;
  }
  /** 只改对象上记录的鼠标方式，并按记录重新绑定监听 */
  setMouseLookAt(mouseLookAt) {
    this._mouseLookAt = readMouseLookAt(mouseLookAt);
    this.bindMouse();
  }
  /** 二维 move 对应 pointermove，click 对应 click，参数名与三维一致 */
  bindMouse() {
    this.unbindMouse();
    const mode = this._mouseLookAt;
    if (!mode || typeof this._mouseCallBack !== "function" || !this.olMap) return;
    this._mouseEventName = mode === "click" ? "click" : "pointermove";
    this._mouseHandler = event => {
      const callback = this._mouseCallBack;
      if (typeof callback !== "function") return;
      const coordinate = event?.coordinate;
      if (!coordinate) {
        callback(null);
        return;
      }
      const lonlat = ol.toLonLat(coordinate, this.olMap.getView().getProjection());
      let value = null;
      const maps = this.heatMaps || [];
      for (let index = maps.length - 1; index >= 0; index -= 1) {
        const heatMap = maps[index];
        if (!heatMap || !pointInHeatArea(lonlat[0], lonlat[1], heatMap)) continue;
        value = readHeatValue(heatMap, lonlat[0], lonlat[1]);
        break;
      }
      callback(value);
    };
    this.olMap.on(this._mouseEventName, this._mouseHandler);
  }
  unbindMouse() {
    if (this._mouseHandler && this.olMap && this._mouseEventName) {
      this.olMap.un(this._mouseEventName, this._mouseHandler);
    }
    this._mouseHandler = null;
    this._mouseEventName = null;
  }
  /**删除
   * @param {Object} add result
   */
  remove(heatMap) {
    this.olMap.removeLayer(heatMap._layer);
    if (heatMap._container) document.body.removeChild(heatMap._container);
  }
  /**清空全部热力图 */
  removeAll() {
    if (this.heatMaps) {
      this.heatMaps.forEach(heatMap => {
        if (heatMap) this.remove(heatMap);
      });
      this.heatMaps = [];
    }
  }
  /**注销 */
  destroy() {
    this.unbindMouse();
    this.removeAll();
    this.olMap = null;
  }
}
export { HeatMap2D };
