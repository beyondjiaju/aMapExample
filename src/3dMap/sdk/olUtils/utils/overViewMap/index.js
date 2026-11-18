import * as ol from "@/3dMap/sdk/ol";
import worldImg from "./images/earth_color_low_4096.jpg";

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
    this.interacting = false;
    this.addListener();
  }

  /** 创建鹰眼容器和只读小地图，底图用与三维相同的世界贴图 */
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
        // stroke: new ol.style.Stroke({ color: "#ffff00", width: 2 }),
        fill: new ol.style.Fill({ color: "rgba(255,255,0,0.5)" })
      })
    });
    const view = this.map.getView();
    this.overMapData.viewer = new ol.Map({
      target: div,
      layers: [
        // 与三维鹰眼同一张世界贴图，不再拉在线瓦片
        new ol.ImageLayer({
          source: new ol.ImageStatic({
            url: worldImg,
            projection: "EPSG:4326",
            imageExtent: [-180, -90, 180, 90]
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
    this.bindPointer();
  }

  /** 点击或拖动时，按落点把当前视窗矩形平移过去，并写回主图 */
  moveByPointer(event) {
    const overview = this.overMapData.viewer;
    const pixel = overview.getEventPixel(event);
    const coordinate = overview.getCoordinateFromPixel(pixel);
    if (!coordinate || coordinate.some(value => !Number.isFinite(value))) return;
    const view = this.map.getView();
    const size = this.map.getSize();
    const extent = view.calculateExtent(size);
    const width = extent[2] - extent[0];
    const height = extent[3] - extent[1];
    view.setCenter(coordinate);
    const next = view.calculateExtent(size);
    if (!next.every(value => Number.isFinite(value))) {
      this.overMapData.box.setGeometry(
        polygonFromExtent([
          coordinate[0] - width / 2,
          coordinate[1] - height / 2,
          coordinate[0] + width / 2,
          coordinate[1] + height / 2
        ])
      );
      return;
    }
    this.overMapData.box.setGeometry(polygonFromExtent(next));
  }

  /** 鹰眼上按下即定位，拖动过程中持续把新矩形同步到主图 */
  bindPointer() {
    const viewport = this.overMapData.viewer.getViewport();
    this.onPointerDown = event => {
      if (event.button !== 0) return;
      this.interacting = true;
      viewport.setPointerCapture?.(event.pointerId);
      this.moveByPointer(event);
    };
    this.onPointerMove = event => {
      if (!this.interacting) return;
      this.moveByPointer(event);
    };
    this.onPointerUp = () => {
      if (!this.interacting) return;
      this.interacting = false;
      // 松手后把更新区域放到鹰眼中心，与三维 postRender 回写一致
      this.syncView();
    };
    viewport.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
  }

  unbindPointer() {
    const viewport = this.overMapData?.viewer?.getViewport?.();
    if (viewport && this.onPointerDown) {
      viewport.removeEventListener("pointerdown", this.onPointerDown);
    }
    if (this.onPointerMove) {
      window.removeEventListener("pointermove", this.onPointerMove);
    }
    if (this.onPointerUp) {
      window.removeEventListener("pointerup", this.onPointerUp);
    }
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
    if (this.interacting) return;
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
    this.unbindPointer();
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
