import * as ol from "@/3dMap/sdk/ol";

/** 数值写成像素，none 表示这条边不参与定位 */
function edgeStyle(value) {
  if (value === "none" || value === undefined || value === null) return "auto";
  return typeof value === "number" ? `${value}px` : String(value);
}

/** 用主图范围拼一个闭合面，作为鹰眼里的视窗框 */
function polygonFromExtent(extent) {
  const minX = extent[0];
  const minY = extent[1];
  const maxX = extent[2];
  const maxY = extent[3];
  return new ol.geom.Polygon([
    [
      [minX, minY],
      [minX, maxY],
      [maxX, maxY],
      [maxX, minY],
      [minX, minY]
    ]
  ]);
}

/**
 * 二维鹰眼。
 * 方法与三维 OverViewMap 一致：addListener、setVisible、removeListener、destroy。
 * 主图移动时把视窗框同步到缩小后的鹰眼上。
 */
class OverViewMap {
  constructor(options) {
    if (!options.map) return;
    this.map = options.map;
    const defaultOptions = {
      show: true,
      width: 300,
      height: 200,
      top: "none",
      left: 5,
      bottom: 5,
      right: 5,
      zIndex: 6
    };
    this.options = Object.assign(defaultOptions, options);
    this.show = this.options.show;
    this.overMapData = {};
    this.listener = null;
    this.listening = false;
    this.addListener();
  }

  /** 创建鹰眼容器和只读小地图，底图与主图同一套高德瓦片 */
  ensureOverview() {
    if (this.overMapData.dom) return;
    const target = this.map.getTargetElement();
    const div = document.createElement("div");
    div.id = `${target?.id || "ol"}_OverViewMap`;
    div.style.cssText = `position:absolute;width:${this.options.width}px;height:${this.options.height}px;top:${edgeStyle(this.options.top)};left:${edgeStyle(this.options.left)};bottom:${edgeStyle(this.options.bottom)};right:${edgeStyle(this.options.right)};z-index:${this.options.zIndex};display:${this.show ? "block" : "none"};background:#000;overflow:hidden;`;
    target.appendChild(div);
    this.overMapData.dom = div;
    this.overMapData.box = new ol.Feature({
      geometry: polygonFromExtent([0, 0, 1, 1])
    });
    this.overMapData.boxLayer = new ol.VectorLayer({
      source: new ol.VectorSource({ features: [this.overMapData.box] }),
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({ color: "#ffff00", width: 2 }),
        fill: new ol.style.Fill({ color: "rgba(255,255,0,0.3)" })
      })
    });
    const view = this.map.getView();
    this.overMapData.viewer = new ol.Map({
      target: div,
      layers: [
        new ol.TileLayer({
          source: new ol.XYZ({
            url: "https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
            projection: "EPSG:3857"
          })
        }),
        this.overMapData.boxLayer
      ],
      view: new ol.View({
        center: view.getCenter(),
        zoom: 0,
        projection: view.getProjection()
      }),
      controls: [],
      interactions: []
    });
  }

  /**
   * 鹰眼地面范围要比主图大约 4.5 倍，和三维视高放大倍数对齐。
   * 小窗像素少，同样的 zoom 看到的地面更窄，所以按两边宽度换算该退几级。
   */
  overviewZoom(mainZoom) {
    const mainWidth = this.map.getSize()?.[0] || 1;
    const overviewWidth = this.overMapData.viewer.getSize()?.[0] || this.options.width;
    const delta = Math.log2((4.5 * mainWidth) / Math.max(overviewWidth, 1));
    return Math.max(mainZoom - delta, 0);
  }

  /** 主图范围变化时刷新鹰眼中心和视窗框 */
  syncView() {
    if (!this.overMapData?.dom || !this.overMapData.viewer) return;
    this.overMapData.dom.style.display = this.show ? "block" : "none";
    const view = this.map.getView();
    const zoom = view.getZoom() || 0;
    const extent = view.calculateExtent(this.map.getSize());
    // 拉得很远时视窗框会铺满鹰眼，与三维高度超过 5000km 后隐藏框的做法一致
    this.overMapData.boxLayer.setVisible(zoom > 4);
    if (extent && extent.every(value => Number.isFinite(value)) && extent[0] !== extent[2]) {
      this.overMapData.box.setGeometry(polygonFromExtent(extent));
    }
    this.overMapData.viewer.updateSize();
    const overviewView = this.overMapData.viewer.getView();
    overviewView.setCenter(view.getCenter());
    overviewView.setRotation(view.getRotation());
    overviewView.setZoom(this.overviewZoom(zoom));
  }

  addListener() {
    if (!this.map) return;
    this.ensureOverview();
    if (!this.listener) this.listener = () => this.syncView();
    if (this.listening) return;
    const view = this.map.getView();
    view.on("change:center", this.listener);
    view.on("change:resolution", this.listener);
    view.on("change:rotation", this.listener);
    this.listening = true;
    this.syncView();
  }

  setVisible(state) {
    this.show = state;
    if (this.overMapData?.dom) {
      this.overMapData.dom.style.display = state ? "block" : "none";
    }
  }

  removeListener() {
    if (!this.listener || !this.map || !this.listening) return;
    const view = this.map.getView();
    view.un("change:center", this.listener);
    view.un("change:resolution", this.listener);
    view.un("change:rotation", this.listener);
    this.listening = false;
  }

  /** 卸掉监听并销毁鹰眼小地图 */
  destroy() {
    this.removeListener();
    this.listener = null;
    if (this.overMapData?.viewer) {
      this.overMapData.viewer.setTarget(null);
    }
    if (this.overMapData?.dom?.parentNode) {
      this.overMapData.dom.parentNode.removeChild(this.overMapData.dom);
    }
    this.overMapData = null;
    this.options = null;
    this.show = null;
    this.map = null;
  }
}

export { OverViewMap };
