import * as ol from "@/3dMap/sdk/ol";
import { h337 } from "@/3dMap/sdk/cesiumUtils/utils/heatMap2D/js/CesiumHeatmap";
/*
 *  OlHeatmap.js | OpenLayers Heatmap Library
 *
 *  参照 CesiumHeatmap.js 实现：基于 heatmap.js v2.0.0 渲染 canvas，
 *  并以 ol ImageStatic 静态影像图层叠加到地图上。
 */
let OlHeatmap = {
  defaults: {
    minCanvasSize: 700, // minimum size (in pixels) for the heatmap canvas
    maxCanvasSize: 2000, // maximum size (in pixels) for the heatmap canvas
    radiusFactor: 60, // data point size factor used if no radius is given (the greater of height and width divided by this number yields the used radius)
    spacingFactor: 1.5, // extra space around the borders (point radius multiplied by this number yields the spacing)
    maxOpacity: 0.8, // the maximum opacity used if not given in the heatmap options object
    minOpacity: 0, // the minimum opacity used if not given in the heatmap options object
    blur: 0.85, // the blur used if not given in the heatmap options object
    gradient: {
      // the gradient used if not given in the heatmap options object
      ".3": "blue",
      ".65": "yellow",
      ".8": "orange",
      ".95": "red"
    }
  }
};

/*  创建 OlHeatmap 实例
 *
 *  olMap:   OpenLayers Map 实例
 *  bb:      WGS84 边界 {north, east, south, west}
 *  options: heatmap.js options 对象（见 http://www.patrick-wied.at/static/heatmapjs/docs.html#h337-create）
 */
OlHeatmap.create = function (olMap, bb, options) {
  return new OHInstance(olMap, bb, options);
};

/* 创建隐藏容器 */
OlHeatmap._getContainer = function (width, height, id) {
  let c = document.createElement("div");
  if (id) {
    c.setAttribute("id", id);
  }
  c.setAttribute(
    "style",
    "width: " +
      width +
      "px; height: " +
      height +
      "px; margin: 0px; display: none;"
  );
  document.body.appendChild(c);
  return c;
};

/* 生成随机id */
OlHeatmap._getID = function (len) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < (len ? len : 8); i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

/*  将 WGS84 位置转换为 WebMercator 位置
 *
 *  p: WGS84 位置 {x: lon, y: lat}
 */
OlHeatmap.wgs84ToMercator = function (p) {
  const mp = ol.fromLonLat([p.x, p.y], ol.WebMercator);
  return {
    x: mp[0],
    y: mp[1]
  };
};

/*  将 WGS84 边界转换为 WebMercator 边界
 *
 *  bb: WGS84 边界 {north, east, south, west}
 */
OlHeatmap.wgs84ToMercatorBB = function (bb) {
  const sw = ol.fromLonLat([bb.west, bb.south], ol.WebMercator);
  const ne = ol.fromLonLat([bb.east, bb.north], ol.WebMercator);
  return {
    north: ne[1],
    east: ne[0],
    south: sw[1],
    west: sw[0]
  };
};

/*  将 WebMercator 位置转换为 WGS84 位置
 *
 *  p: WebMercator 位置 {x, y}
 */
OlHeatmap.mercatorToWgs84 = function (p) {
  const wp = ol.toLonLat([p.x, p.y], ol.WebMercator);
  return {
    x: wp[0],
    y: wp[1]
  };
};

/*  将 WebMercator 边界转换为 WGS84 边界
 *
 *  bb: WebMercator 边界 {north, east, south, west}
 */
OlHeatmap.mercatorToWgs84BB = function (bb) {
  const sw = ol.toLonLat([bb.west, bb.south], ol.WebMercator);
  const ne = ol.toLonLat([bb.east, bb.north], ol.WebMercator);
  return {
    north: ne[1],
    east: ne[0],
    south: sw[1],
    west: sw[0]
  };
};

export default OlHeatmap;

/*  初始化 OlHeatmap 实例
 *
 *  olMap: OpenLayers Map 实例
 *  bb:    WGS84 边界 {north, east, south, west}
 *  o:     heatmap.js options 对象
 */
function OHInstance(olMap, bb, o) {
  if (!bb) {
    return null;
  }
  if (!o) {
    o = {};
  }

  this._olMap = olMap;
  this._options = o;
  this._id = OlHeatmap._getID();

  this._options.gradient = this._options.gradient
    ? this._options.gradient
    : OlHeatmap.defaults.gradient;
  this._options.maxOpacity = this._options.maxOpacity
    ? this._options.maxOpacity
    : OlHeatmap.defaults.maxOpacity;
  this._options.minOpacity = this._options.minOpacity
    ? this._options.minOpacity
    : OlHeatmap.defaults.minOpacity;
  this._options.blur = this._options.blur
    ? this._options.blur
    : OlHeatmap.defaults.blur;

  this._mbounds = OlHeatmap.wgs84ToMercatorBB(bb);
  this._setWidthAndHeight(this._mbounds);

  this._options.radius = Math.round(
    this._options.radius
      ? this._options.radius
      : this.width > this.height
      ? this.width / OlHeatmap.defaults.radiusFactor
      : this.height / OlHeatmap.defaults.radiusFactor
  );

  this._spacing = this._options.radius * OlHeatmap.defaults.spacingFactor;
  this._xoffset = this._mbounds.west;
  this._yoffset = this._mbounds.south;

  this.width = Math.round(this.width + this._spacing * 2);
  this.height = Math.round(this.height + this._spacing * 2);

  this._mbounds.west -= this._spacing * this._factor;
  this._mbounds.east += this._spacing * this._factor;
  this._mbounds.south -= this._spacing * this._factor;
  this._mbounds.north += this._spacing * this._factor;

  this.bounds = OlHeatmap.mercatorToWgs84BB(this._mbounds);

  this._container = OlHeatmap._getContainer(this.width, this.height, this._id);
  this._options.container = this._container;
  let h337New = h337();
  this._heatmap = h337New.create(this._options);
  this._container.children[0].setAttribute("id", this._id + "-hm");
}

/*  将 WGS84 位置转换为对应的热力图位置
 *
 *  p: WGS84 位置 {x:lon, y:lat}
 */
OHInstance.prototype.wgs84PointToHeatmapPoint = function (p) {
  return this.mercatorPointToHeatmapPoint(OlHeatmap.wgs84ToMercator(p));
};

/*  将 WebMercator 位置转换为对应的热力图位置
 *
 *  p: WebMercator 位置 {x: lon, y:lat}
 */
OHInstance.prototype.mercatorPointToHeatmapPoint = function (p) {
  let pn = {};

  pn.x = Math.round((p.x - this._xoffset) / this._factor + this._spacing);
  pn.y = Math.round((p.y - this._yoffset) / this._factor + this._spacing);
  pn.y = this.height - pn.y;

  return pn;
};

OHInstance.prototype._setWidthAndHeight = function (mbb) {
  this.width =
    mbb.east > 0 && mbb.west < 0
      ? mbb.east + Math.abs(mbb.west)
      : Math.abs(mbb.east - mbb.west);
  this.height =
    mbb.north > 0 && mbb.south < 0
      ? mbb.north + Math.abs(mbb.south)
      : Math.abs(mbb.north - mbb.south);
  this._factor = 1;

  if (
    this.width > this.height &&
    this.width > OlHeatmap.defaults.maxCanvasSize
  ) {
    this._factor = this.width / OlHeatmap.defaults.maxCanvasSize;

    if (this.height / this._factor < OlHeatmap.defaults.minCanvasSize) {
      this._factor = this.height / OlHeatmap.defaults.minCanvasSize;
    }
  } else if (
    this.height > this.width &&
    this.height > OlHeatmap.defaults.maxCanvasSize
  ) {
    this._factor = this.height / OlHeatmap.defaults.maxCanvasSize;

    if (this.width / this._factor < OlHeatmap.defaults.minCanvasSize) {
      this._factor = this.width / OlHeatmap.defaults.minCanvasSize;
    }
  } else if (
    this.width < this.height &&
    this.width < OlHeatmap.defaults.minCanvasSize
  ) {
    this._factor = this.width / OlHeatmap.defaults.minCanvasSize;

    if (this.height / this._factor > OlHeatmap.defaults.maxCanvasSize) {
      this._factor = this.height / OlHeatmap.defaults.maxCanvasSize;
    }
  } else if (
    this.height < this.width &&
    this.height < OlHeatmap.defaults.minCanvasSize
  ) {
    this._factor = this.height / OlHeatmap.defaults.minCanvasSize;

    if (this.width / this._factor > OlHeatmap.defaults.maxCanvasSize) {
      this._factor = this.width / OlHeatmap.defaults.maxCanvasSize;
    }
  }

  this.width = this.width / this._factor;
  this.height = this.height / this._factor;
};

/*  设置热力图位置数组
 *
 *  min:  数据值允许的最小值
 *  max:  数据值允许的最大值
 *  data: 热力图坐标与数值数组 [{x, y, value}]
 */
OHInstance.prototype.setData = function (min, max, data) {
  if (
    data &&
    data.length > 0 &&
    min !== null &&
    min !== false &&
    max !== null &&
    max !== false
  ) {
    this._heatmap.setData({
      min: min,
      max: max,
      data: data
    });

    this.updateLayer();
    return true;
  }

  return false;
};

/*  设置 WGS84 位置数组
 *
 *  min:  数据值允许的最小值
 *  max:  数据值允许的最大值
 *  data: WGS84 坐标与数值数组 [{x:lon, y:lat, value}]
 */
OHInstance.prototype.setWGS84Data = function (min, max, data) {
  if (
    data &&
    data.length > 0 &&
    min !== null &&
    min !== false &&
    max !== null &&
    max !== false
  ) {
    let convdata = [];

    for (let i = 0; i < data.length; i++) {
      let gp = data[i];

      let hp = this.wgs84PointToHeatmapPoint(gp);
      if (gp.value || gp.value === 0) {
        hp.value = gp.value;
      }

      convdata.push(hp);
    }

    return this.setData(min, max, convdata);
  }

  return false;
};

/*  设置热力图是否显示
 *
 *  s: true 显示，false 隐藏
 */
OHInstance.prototype.show = function (s) {
  if (this._layer) {
    this._layer.setVisible(s);
  }
};

/*  更新/(重新)绘制热力图
 */
OHInstance.prototype.updateLayer = function () {
  // 移除旧图层
  if (this._layer) {
    this._olMap.removeLayer(this._layer);
  }
  // 将WGS84边界转换为地图当前投影范围
  const viewProjection = this._olMap.getView().getProjection();
  const extent = ol.transformExtent(
    [this.bounds.west, this.bounds.south, this.bounds.east, this.bounds.north],
    ol.WGS84,
    viewProjection
  );
  // 以热力图canvas生成静态影像图层
  this._layer = new ol.ImageLayer({
    source: new ol.ImageStatic({
      url: this._heatmap.getDataURL(),
      imageExtent: extent,
      projection: viewProjection
    })
  });
  this._layer.setZIndex(Number.MAX_VALUE);
  this._olMap.addLayer(this._layer);
};
