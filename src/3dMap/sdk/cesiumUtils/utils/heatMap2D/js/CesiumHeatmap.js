import * as Cesium from "@/3dMap/sdk/cesium";
/*
 *  CesiumHeatmap.js v0.1 | Cesium Heatmap Library
 *
 *  Works with heatmap.js v2.0.0: http://www.patrick-wied.at/static/heatmapjs/
 */
let CesiumHeatmap = {
  defaults: {
    useEntitiesIfAvailable: true, //whether to use entities if a Viewer is supplied or always use an ImageryProvider
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

/*  Create a CesiumHeatmap instance
 *
 *  cesium:  the CesiumWidget or Viewer instance
 *  bb:      the WGS84 bounding box like {north, east, south, west}
 *  options: a heatmap.js options object (see http://www.patrick-wied.at/static/heatmapjs/docs.html#h337-create)
 */
CesiumHeatmap.create = function (cesium, bb, options) {
  let instance = new CHInstance(cesium, bb, options);
  return instance;
};

CesiumHeatmap._getContainer = function (width, height, id) {
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

CesiumHeatmap._getImageryProvider = function (instance) {
  //let n = (new Date()).getTime();
  let d = instance._heatmap.getDataURL();
  //console.log("Create data URL: " + ((new Date()).getTime() - n));

  //let n = (new Date()).getTime();
  let imgprov = new Cesium.SingleTileImageryProvider({
    url: d,
    rectangle: instance._rectangle
  });
  //console.log("Create imageryprovider: " + ((new Date()).getTime() - n));

  imgprov._tilingScheme = new Cesium.WebMercatorTilingScheme({
    rectangleSouthwestInMeters: new Cesium.Cartesian2(
      instance._mbounds.west,
      instance._mbounds.south
    ),
    rectangleNortheastInMeters: new Cesium.Cartesian2(
      instance._mbounds.east,
      instance._mbounds.north
    )
  });

  return imgprov;
};

CesiumHeatmap._getID = function (len) {
  let text = "";
  let possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < (len ? len : 8); i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
};

let WMP = new Cesium.WebMercatorProjection();

/*  Convert a WGS84 location into a mercator location
 *
 *  p: the WGS84 location like {x: lon, y: lat}
 */
CesiumHeatmap.wgs84ToMercator = function (p) {
  let mp = WMP.project(Cesium.Cartographic.fromDegrees(p.x, p.y));
  return {
    x: mp.x,
    y: mp.y
  };
};

/*  Convert a WGS84 bounding box into a mercator bounding box
 *
 *  bb: the WGS84 bounding box like {north, east, south, west}
 */
CesiumHeatmap.wgs84ToMercatorBB = function (bb) {
  let sw = WMP.project(Cesium.Cartographic.fromDegrees(bb.west, bb.south));
  let ne = WMP.project(Cesium.Cartographic.fromDegrees(bb.east, bb.north));
  return {
    north: ne.y,
    east: ne.x,
    south: sw.y,
    west: sw.x
  };
};

/*  Convert a mercator location into a WGS84 location
 *
 *  p: the mercator lcation like {x, y}
 */
CesiumHeatmap.mercatorToWgs84 = function (p) {
  let wp = WMP.unproject(new Cesium.Cartesian3(p.x, p.y));
  return {
    x: wp.longitude,
    y: wp.latitude
  };
};

/*  Convert a mercator bounding box into a WGS84 bounding box
 *
 *  bb: the mercator bounding box like {north, east, south, west}
 */
CesiumHeatmap.mercatorToWgs84BB = function (bb) {
  let sw = WMP.unproject(new Cesium.Cartesian3(bb.west, bb.south));
  let ne = WMP.unproject(new Cesium.Cartesian3(bb.east, bb.north));
  return {
    north: this.rad2deg(ne.latitude),
    east: this.rad2deg(ne.longitude),
    south: this.rad2deg(sw.latitude),
    west: this.rad2deg(sw.longitude)
  };
};

/*  Convert degrees into radians
 *
 *  d: the degrees to be converted to radians
 */
CesiumHeatmap.deg2rad = function (d) {
  let r = d * (Math.PI / 180.0);
  return r;
};

/*  Convert radians into degrees
 *
 *  r: the radians to be converted to degrees
 */
CesiumHeatmap.rad2deg = function (r) {
  let d = r / (Math.PI / 180.0);
  return d;
};

export default CesiumHeatmap;

/*  Initiate a CesiumHeatmap instance
 *
 *  c:  CesiumWidget instance
 *  bb: a WGS84 bounding box like {north, east, south, west}
 *  o:  a heatmap.js options object (see http://www.patrick-wied.at/static/heatmapjs/docs.html#h337-create)
 */
function CHInstance(c, bb, o) {
  if (!bb) {
    return null;
  }
  if (!o) {
    o = {};
  }

  this._cesium = c;
  this._options = o;
  this._id = CesiumHeatmap._getID();

  this._options.gradient = this._options.gradient
    ? this._options.gradient
    : CesiumHeatmap.defaults.gradient;
  this._options.maxOpacity = this._options.maxOpacity
    ? this._options.maxOpacity
    : CesiumHeatmap.defaults.maxOpacity;
  this._options.minOpacity = this._options.minOpacity
    ? this._options.minOpacity
    : CesiumHeatmap.defaults.minOpacity;
  this._options.blur = this._options.blur
    ? this._options.blur
    : CesiumHeatmap.defaults.blur;

  this._mbounds = CesiumHeatmap.wgs84ToMercatorBB(bb);
  this._setWidthAndHeight(this._mbounds);

  this._options.radius = Math.round(
    this._options.radius
      ? this._options.radius
      : this.width > this.height
      ? this.width / CesiumHeatmap.defaults.radiusFactor
      : this.height / CesiumHeatmap.defaults.radiusFactor
  );

  this._spacing = this._options.radius * CesiumHeatmap.defaults.spacingFactor;
  this._xoffset = this._mbounds.west;
  this._yoffset = this._mbounds.south;

  this.width = Math.round(this.width + this._spacing * 2);
  this.height = Math.round(this.height + this._spacing * 2);

  this._mbounds.west -= this._spacing * this._factor;
  this._mbounds.east += this._spacing * this._factor;
  this._mbounds.south -= this._spacing * this._factor;
  this._mbounds.north += this._spacing * this._factor;

  this.bounds = CesiumHeatmap.mercatorToWgs84BB(this._mbounds);

  this._rectangle = Cesium.Rectangle.fromDegrees(
    this.bounds.west,
    this.bounds.south,
    this.bounds.east,
    this.bounds.north
  );
  this._container = CesiumHeatmap._getContainer(
    this.width,
    this.height,
    this._id
  );
  this._options.container = this._container;
  let h337New = h337();
  this._heatmap = h337New.create(this._options);
  this._container.children[0].setAttribute("id", this._id + "-hm");
}

/*  Convert a WGS84 location to the corresponding heatmap location
 *
 *  p: a WGS84 location like {x:lon, y:lat}
 */
CHInstance.prototype.wgs84PointToHeatmapPoint = function (p) {
  return this.mercatorPointToHeatmapPoint(CesiumHeatmap.wgs84ToMercator(p));
};

/*  Convert a mercator location to the corresponding heatmap location
 *
 *  p: a WGS84 location like {x: lon, y:lat}
 */
CHInstance.prototype.mercatorPointToHeatmapPoint = function (p) {
  let pn = {};

  pn.x = Math.round((p.x - this._xoffset) / this._factor + this._spacing);
  pn.y = Math.round((p.y - this._yoffset) / this._factor + this._spacing);
  pn.y = this.height - pn.y;

  return pn;
};

CHInstance.prototype._setWidthAndHeight = function (mbb) {
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
    this.width > CesiumHeatmap.defaults.maxCanvasSize
  ) {
    this._factor = this.width / CesiumHeatmap.defaults.maxCanvasSize;

    if (this.height / this._factor < CesiumHeatmap.defaults.minCanvasSize) {
      this._factor = this.height / CesiumHeatmap.defaults.minCanvasSize;
    }
  } else if (
    this.height > this.width &&
    this.height > CesiumHeatmap.defaults.maxCanvasSize
  ) {
    this._factor = this.height / CesiumHeatmap.defaults.maxCanvasSize;

    if (this.width / this._factor < CesiumHeatmap.defaults.minCanvasSize) {
      this._factor = this.width / CesiumHeatmap.defaults.minCanvasSize;
    }
  } else if (
    this.width < this.height &&
    this.width < CesiumHeatmap.defaults.minCanvasSize
  ) {
    this._factor = this.width / CesiumHeatmap.defaults.minCanvasSize;

    if (this.height / this._factor > CesiumHeatmap.defaults.maxCanvasSize) {
      this._factor = this.height / CesiumHeatmap.defaults.maxCanvasSize;
    }
  } else if (
    this.height < this.width &&
    this.height < CesiumHeatmap.defaults.minCanvasSize
  ) {
    this._factor = this.height / CesiumHeatmap.defaults.minCanvasSize;

    if (this.width / this._factor > CesiumHeatmap.defaults.maxCanvasSize) {
      this._factor = this.width / CesiumHeatmap.defaults.maxCanvasSize;
    }
  }

  this.width = this.width / this._factor;
  this.height = this.height / this._factor;
};

/*  Set an array of heatmap locations
 *
 *  min:  the minimum allowed value for the data values
 *  max:  the maximum allowed value for the data values
 *  data: an array of data points in heatmap coordinates and values like {x, y, value}
 */
CHInstance.prototype.setData = function (min, max, data) {
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

/*  Set an array of WGS84 locations
 *
 *  min:  the minimum allowed value for the data values
 *  max:  the maximum allowed value for the data values
 *  data: an array of data points in WGS84 coordinates and values like { x:lon, y:lat, value }
 */
CHInstance.prototype.setWGS84Data = function (min, max, data) {
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

/*  Set whether or not the heatmap is shown on the map
 *
 *  s: true means the heatmap is shown, false means the heatmap is hidden
 */
CHInstance.prototype.show = function (s) {
  if (this._layer) {
    this._layer.show = s;
  }
};

/*  Update/(re)draw the heatmap
 */
CHInstance.prototype.updateLayer = function () {
  // only works with a Viewer instance since the cesiumWidget
  // instance doesn't contain an entities property
  if (CesiumHeatmap.defaults.useEntitiesIfAvailable && this._cesium.entities) {
    if (this._layer) {
      this._cesium.entities.remove(this._layer);
    }
    // Work around issue with material rendering in Cesium
    // provided by https://github.com/criis
    let material = new Cesium.ImageMaterialProperty({
      image: this._heatmap._renderer.canvas
    });
    material.transparent = true;
    this._layer = this._cesium.entities.add({
      show: true,
      rectangle: {
        coordinates: this._rectangle,
        height: 0,
        material: material
      }
    });
  } else {
    if (this._layer) {
      this._cesium.scene.imageryLayers.remove(this._layer);
    }

    this._layer = this._cesium.scene.imageryLayers.addImageryProvider(
      CesiumHeatmap._getImageryProvider(this)
    );
  }
};

/*  DON'T TOUCH:
 *
 *  heatmap.js v2.0.0 | JavaScript Heatmap Library: http://www.patrick-wied.at/static/heatmapjs/
 *
 *  Copyright 2008-2014 Patrick Wied <heatmapjs@patrick-wied.at> - All rights reserved.
 *  Dual licensed under MIT and Beerware license
 *
 *  :: 2014-10-31 21:16
 */
const h337 = function () {
  let defaultOption = {
    radius: 40,
    renderer: "canvas2d",
    gradient: {
      0.25: "rgb(0,0,255)",
      0.55: "rgb(0,255,0)",
      0.85: "yellow",
      1: "rgb(255,0,0)"
    },
    maxOpacity: 1,
    minOpacity: 0,
    blur: 0.85,
    xField: "x",
    yField: "y",
    valueField: "value",
    plugins: {}
  };
  let b = (function h() {
    let b = function d(option) {
      this._coordinator = {};
      this._data = [];
      this._radi = [];
      this._min = 0;
      this._max = 1;
      this._xField = option["xField"] || defaultOption.xField;
      this._yField = option["yField"] || defaultOption.yField;
      this._valueField = option["valueField"] || defaultOption.valueField;
      if (option["radius"]) {
        this._cfgRadius = option["radius"];
      }
    };
    let c = defaultOption.radius;
    b.prototype = {
      _organiseData: function (a, b) {
        let d = a[this._xField];
        let e = a[this._yField];
        let f = this._radi;
        let g = this._data;
        let h = this._max;
        let i = this._min;
        let j = a[this._valueField] || 1;
        let k = a.radius || this._cfgRadius || c;
        if (!g[d]) {
          g[d] = [];
          f[d] = [];
        }
        if (!g[d][e]) {
          g[d][e] = j;
          f[d][e] = k;
        } else {
          g[d][e] += j;
        }
        if (g[d][e] > h) {
          if (!b) {
            this._max = g[d][e];
          } else {
            this.setDataMax(g[d][e]);
          }
          return false;
        } else {
          return { x: d, y: e, value: j, radius: k, min: i, max: h };
        }
      },
      _unOrganizeData: function () {
        let data = [];
        let b = this._data;
        let c = this._radi;
        for (let d in b) {
          for (let e in b[d]) {
            data.push({ x: d, y: e, radius: c[d][e], value: b[d][e] });
          }
        }
        return { min: this._min, max: this._max, data };
      },
      _onExtremaChange: function () {
        this._coordinator.emit("extremachange", {
          min: this._min,
          max: this._max
        });
      },
      setData: function (a) {
        let b = a.data;
        let c = b.length;
        this._data = [];
        this._radi = [];
        for (let d = 0; d < c; d++) {
          this._organiseData(b[d], false);
        }
        this._max = a.max;
        this._min = a.min || 0;
        this._onExtremaChange();
        this._coordinator.emit("renderall", this._getInternalData());
        return this;
      },
      removeData: function () {},
      setDataMax: function (a) {
        this._max = a;
        this._onExtremaChange();
        this._coordinator.emit("renderall", this._getInternalData());
        return this;
      },
      setDataMin: function (a) {
        this._min = a;
        this._onExtremaChange();
        this._coordinator.emit("renderall", this._getInternalData());
        return this;
      },
      setCoordinator: function (a) {
        this._coordinator = a;
      },
      _getInternalData: function () {
        return {
          max: this._max,
          min: this._min,
          data: this._data,
          radi: this._radi
        };
      },
      getData: function () {
        return this._unOrganizeData();
      }
    };
    return b;
  })();
  let c = (function i() {
    let a = function (a) {
      let b = a.gradient || defaultOption.gradient;
      let c = document.createElement("canvas");
      let d = c.getContext("2d");
      c.width = 256;
      c.height = 1;
      let e = d.createLinearGradient(0, 0, 256, 1);
      for (let f in b) {
        e.addColorStop(f, b[f]);
      }
      d.fillStyle = e;
      d.fillRect(0, 0, 256, 1);
      return d.getImageData(0, 0, 256, 1).data;
    };
    let b = function (a, b) {
      let c = document.createElement("canvas");
      let d = c.getContext("2d");
      let e = a;
      let f = a;
      c.width = c.height = a * 2;
      if (b == 1) {
        d.beginPath();
        d.arc(e, f, a, 0, 2 * Math.PI, false);
        d.fillStyle = "rgba(0,0,0,1)";
        d.fill();
      } else {
        let g = d.createRadialGradient(e, f, a * b, e, f, a);
        g.addColorStop(0, "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        d.fillStyle = g;
        d.fillRect(0, 0, 2 * a, 2 * a);
      }
      return c;
    };
    let c = function (a) {
      let b = [];
      let c = a.min;
      let d = a.max;
      let e = a.radi;
      let data = a.data;
      let f = Object.keys(data);
      let g = f.length;
      while (g--) {
        let h = f[g];
        let i = Object.keys(data[h]);
        let j = i.length;
        while (j--) {
          let k = i[j];
          let l = data[h][k];
          let m = e[h][k];
          b.push({ x: h, y: k, value: l, radius: m });
        }
      }
      return { min: c, max: d, data: b };
    };

    function d(b) {
      let c = b.container;
      let d = (this.shadowCanvas = document.createElement("canvas"));
      let e = (this.canvas = b.canvas || document.createElement("canvas"));
      let f = (this._renderBoundaries = [1e4, 1e4, 0, 0]);
      let g = getComputedStyle(b.container) || {};
      e.className = "heatmap-canvas";
      this._width = e.width = d.width = +g.width.replace(/px/, "");
      this._height = e.height = d.height = +g.height.replace(/px/, "");
      this.shadowCtx = d.getContext("2d");
      this.ctx = e.getContext("2d");
      e.style.cssText = d.style.cssText = "position:absolute;left:0;top:0;";
      c.style.position = "relative";
      c.appendChild(e);
      this._palette = a(b);
      this._templates = {};
      this._setStyles(b);
    }

    d.prototype = {
      renderPartial: function (a) {
        this._drawAlpha(a);
        this._colorize();
      },
      renderAll: function (a) {
        this._clear();
        this._drawAlpha(c(a));
        this._colorize();
      },
      _updateGradient: function (b) {
        this._palette = a(b);
      },
      updateConfig: function (a) {
        if (a["gradient"]) {
          this._updateGradient(a);
        }
        this._setStyles(a);
      },
      setDimensions: function (a, b) {
        this._width = a;
        this._height = b;
        this.canvas.width = this.shadowCanvas.width = a;
        this.canvas.height = this.shadowCanvas.height = b;
      },
      _clear: function () {
        this.shadowCtx.clearRect(0, 0, this._width, this._height);
        this.ctx.clearRect(0, 0, this._width, this._height);
      },
      _setStyles: function (a) {
        this._blur = a.blur == 0 ? 0 : a.blur || defaultOption.blur;
        if (a.backgroundColor) {
          this.canvas.style.backgroundColor = a.backgroundColor;
        }
        this._opacity = (a.opacity || 0) * 255;
        this._maxOpacity = (a.maxOpacity || defaultOption.maxOpacity) * 255;
        this._minOpacity = (a.minOpacity || defaultOption.minOpacity) * 255;
        this._useGradientOpacity = !!a.useGradientOpacity;
      },
      _drawAlpha: function (a) {
        let c = (this._min = a.min);
        let d = (this._max = a.max);
        let data = a.data || [];
        let e = data.length;
        let f = 1 - this._blur;
        while (e--) {
          let g = data[e];
          let h = g.x;
          let i = g.y;
          let j = g.radius;
          let k = Math.min(g.value, d);
          let l = h - j;
          let m = i - j;
          let n = this.shadowCtx;
          let o;
          if (!this._templates[j]) {
            this._templates[j] = o = b(j, f);
          } else {
            o = this._templates[j];
          }
          n.globalAlpha = (k - c) / (d - c);
          n.drawImage(o, l, m);
          if (l < this._renderBoundaries[0]) {
            this._renderBoundaries[0] = l;
          }
          if (m < this._renderBoundaries[1]) {
            this._renderBoundaries[1] = m;
          }
          if (l + 2 * j > this._renderBoundaries[2]) {
            this._renderBoundaries[2] = l + 2 * j;
          }
          if (m + 2 * j > this._renderBoundaries[3]) {
            this._renderBoundaries[3] = m + 2 * j;
          }
        }
      },
      _colorize: function () {
        let a_new = this._renderBoundaries[0];
        let b = this._renderBoundaries[1];
        let c = this._renderBoundaries[2] - a_new;
        let d = this._renderBoundaries[3] - b;
        let e = this._width;
        let f = this._height;
        let g = this._opacity;
        let h = this._maxOpacity;
        let i = this._minOpacity;
        let j = this._useGradientOpacity;
        if (a_new < 0) {
          a_new = 0;
        }
        if (b < 0) {
          b = 0;
        }
        if (a_new + c > e) {
          c = e - a_new;
        }
        if (b + d > f) {
          d = f - b;
        }
        let k = this.shadowCtx.getImageData(a_new, b, c, d);
        // let l = k.data;
        let m = k.data.length;
        let n = this._palette;
        for (let o = 3; o < m; o += 4) {
          let p = k.data[o];
          let q = p * 4;
          if (!q) {
            continue;
          }
          let r;
          if (g > 0) {
            r = g;
          } else {
            if (p < h) {
              if (p < i) {
                r = i;
              } else {
                r = p;
              }
            } else {
              r = h;
            }
          }
          k.data[o - 3] = n[q];
          k.data[o - 2] = n[q + 1];
          k.data[o - 1] = n[q + 2];
          k.data[o] = j ? n[q + 3] : r;
        }
        // k.data = l;
        this.ctx.putImageData(k, a_new, b);
        this._renderBoundaries = [1e3, 1e3, 0, 0];
      },
      getValueAt: function (a) {
        let b;
        let c = this.shadowCtx;
        let d = c.getImageData(a.x, a.y, 1, 1);
        let e = d.data[3];
        let f = this._max;
        let g = this._min;
        b = (Math.abs(f - g) * (e / 255)) >> 0;
        return b;
      },
      getDataURL: function () {
        return this.canvas.toDataURL();
      }
    };
    return d;
  })();
  let d = (function j() {
    let b = false;
    if (defaultOption["renderer"] === defaultOption.renderer) {
      b = c;
    }
    return b;
  })();
  let e = {
    merge: function (eData) {
      let data = {};
      let b = eData.length;
      for (let c = 0; c < b; c++) {
        let d = eData[c];
        for (let e in d) {
          data[e] = d[e];
        }
      }
      return data;
    }
  };
  let f = (function k() {
    let c = (function h() {
      function a() {
        this.cStore = {};
      }

      a.prototype = {
        on: function (a, b, c) {
          let d = this.cStore;
          if (!d[a]) {
            d[a] = [];
          }
          d[a].push(function (a) {
            return b.call(c, a);
          });
        },
        emit: function (a, b) {
          let c = this.cStore;
          if (c[a]) {
            let d = c[a].length;
            for (let e = 0; e < d; e++) {
              let f = c[a][e];
              f(b);
            }
          }
        }
      };
      return a;
    })();
    let f = function (a) {
      let b = a._renderer;
      let c = a._coordinator;
      let d = a._store;
      c.on("renderpartial", b.renderPartial, b);
      c.on("renderall", b.renderAll, b);
      c.on("extremachange", function (b) {
        a._config.onExtremaChange &&
          a._config.onExtremaChange({
            min: b.min,
            max: b.max,
            gradient: a._config["gradient"] || a._config["defaultGradient"]
          });
      });
      d.setCoordinator(c);
    };

    function g(gData) {
      let g = (this._config = e.merge([defaultOption, gData || {}]));
      this._coordinator = new c();
      if (g["plugin"]) {
        let h = g["plugin"];
        if (!defaultOption.plugins[h]) {
          throw new Error(
            "Plugin '" + h + "' not found. Maybe it was not registered."
          );
        } else {
          let i = defaultOption.plugins[h];
          this._renderer = new i.renderer(g);
          this._store = new i.store(g);
        }
      } else {
        this._renderer = new d(g);
        this._store = new b(g);
      }
      f(this);
    }

    g.prototype = {
      setData: function (sData) {
        this._store.setData.apply(this._store, [sData]);
        return this;
      },
      configure: function (a) {
        this._config = e.merge([this._config, a]);
        this._renderer.updateConfig(this._config);
        this._coordinator.emit("renderall", this._store._getInternalData());
        return this;
      },
      repaint: function () {
        this._coordinator.emit("renderall", this._store._getInternalData());
        return this;
      },
      getData: function () {
        return this._store.getData();
      },
      getDataURL: function () {
        return this._renderer.getDataURL();
      },
      getValueAt: function (a) {
        if (this._store.getValueAt) {
          return this._store.getValueAt(a);
        } else if (this._renderer.getValueAt) {
          return this._renderer.getValueAt(a);
        } else {
          return null;
        }
      }
    };
    return g;
  })();
  let g = {
    create: function (a) {
      return new f(a);
    },
    register: function (b, c) {
      defaultOption.plugins[b] = c;
    }
  };
  return g;
};
// 导出 heatmap.js 引擎，供 openlayers 热力图复用
export { h337 };
