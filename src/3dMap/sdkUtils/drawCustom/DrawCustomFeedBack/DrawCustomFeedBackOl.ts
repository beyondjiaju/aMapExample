import { cloneDeep } from "@/3dMap/interface";
import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import { olMap } from "@/3dMap/global";
import { shapeCoordinates } from "@/3dMap/sdk/cesiumUtils";
import {
  HeightLightFeature,
  PolylineVolumeFromPolygon,
  getColorAlpha,
  HtmlTag,
  HtmlTagCollection,
  getFitExtentAutoZoom
} from "@/3dMap/sdk/olUtils";
import { getCenterByCoordinates } from "@/3dMap/sdk/publicUtils";
import { textOption } from "@/3dMap/const/graphicOption";
/**监听 */
class DrawCustomFeedBack {
  vectorLayer: any;
  htmlTagCollection: any;
  newHeightLightFeature: any;
  polylineVolumeFromPolygon: any;
  constructor() {
    // 高亮对象
    this.newHeightLightFeature = new HeightLightFeature(olMap);
    // route
    this.polylineVolumeFromPolygon = new PolylineVolumeFromPolygon(olMap);
    // 回显存储
    this.vectorLayer = new ol.VectorLayer({
      source: new ol.VectorSource(),
      updateWhileAnimating: true,
      updateWhileInteracting: true
    });
    this.vectorLayer.setZIndex(Number.MAX_VALUE);
    olMap.addLayer(this.vectorLayer);
    this.htmlTagCollection = new HtmlTagCollection(olMap, {
      collision: true
    });
  }
  /**添加回显
   * @param { Object } option {data, style, callback}
   */
  add(option) {
    // data
    const data = Object.assign(
      {
        lineRoute: null // 带宽度航线数据
      },
      option.data
    );
    // style
    let style = Object.assign(
      {
        color: "#FF4500",
        alpha: 0.7,
        image: "",
        imageColor: "",
        imageScale: 0.7,
        text: "",
        textColor: "",
        textTranslate: [0, 20],
        textScale: 1,
        html: "",
        htmlIsDrag: false,
        htmlDragLineColor: "#ffffff",
        htmlDragLineWidth: 1.5,
        htmlAlignmentMode: 7,
        htmlTranslate: [0, -25],
        outline: true,
        lineWidth: 5,
        lineType: "solid",
        lineClampToGround: true,
        lineRouteShowCenterLine: false,
        dashLength: 16,
        glowPower: 0.2,
        lineOutlineColor: "#ffffff",
        lineOutlineWidth: 4,
        minHeight: 0,
        maxHeight: 1
      },
      option.style
    );
    // 样式微调
    if (style.lineWidth > 2) style.lineWidth /= 2;
    if (style.dashLength > 2) style.dashLength /= 2;
    // features
    let features;
    if (data.type == "point") {
      features = this.getPointFeature(data, style);
    }
    if (data.type == "polyline") {
      if (data.lineRoute) {
        // polyline route
        this.addPolylineRoute(data, style);
      }
      if (!data.lineRoute || style.lineRouteShowCenterLine) {
        // poolyline
        features = this.getPolylineFeature(data, style);
      }
    }
    if (
      ["circle", "rectangle", "polygon", "sector", "rectangleCircle"].indexOf(
        data.type
      ) >= 0
    ) {
      features = this.getPolygonOption(data, style);
    }
    // 添加
    if (features) this.vectorLayer.getSource().addFeatures(features);
    // 回显结束回调
    if (option.callback && option.callback instanceof Function)
      option.callback(this.vectorLayer);
  }
  /**定位（带动画） */
  flyTo(id = null) {
    if (id) {
      const feature = this.vectorLayer.getSource().getFeatureById(id);
      if (!feature) return;
      const extent = feature.getGeometry().getExtent();
      this.zoomToExtent(extent, { duration: 1500 });
      return;
    }
    if (!this.vectorLayer?.getSource()?.getFeatures().length) return;
    const extent = this.vectorLayer.getSource().getExtent();
    this.zoomToExtent(extent, { duration: 1500 });
  }
  setView(id = null) {
    if (id) {
      const feature = this.vectorLayer.getSource().getFeatureById(id);
      if (!feature) return;
      const extent = feature.getGeometry().getExtent();
      this.zoomToExtent(extent);
      return;
    }
    if (!this.vectorLayer?.getSource()?.getFeatures().length) return;
    const extent = this.vectorLayer.getSource().getExtent();
    this.zoomToExtent(extent);
  }
  /**
   * 定位到指定范围，确保地图完全展示 extent 后自动调整缩放级别
   * @param {Array} extent 范围
   * @param {Object} option 可选参数 { duration? } duration：动画时长（单位毫秒，默认0为立即定位）
   */
  zoomToExtent(extent, option = { duration: 0 }) {
    setTimeout(() => {
      const view = olMap.getView();
      const { maxZoom } = getFitExtentAutoZoom(olMap, extent);
      view.fit(extent, {
        duration: option.duration,
        padding: [200, 200, 200, 200],
        maxZoom
      });
    });
  }
  /**根据id高亮 */
  heightLightById(id, color = "#DC143C") {
    // 高亮参数
    const hlOption = {
      color,
      alpha: 0.9
    };
    // 主轴 feature（点/线/面/中心线）
    const heightLightFeature = this.vectorLayer.getSource().getFeatureById(id);
    if (heightLightFeature) {
      this.newHeightLightFeature.add(heightLightFeature, hlOption);
      return;
    }
    // 兼容 lineRoute 加载的航路数据（无主轴 feature，依据 properties.id 匹配高亮）
    const heightFeatures = this.getRouteFeaturesById(id);
    heightFeatures?.forEach(feature => {
      this.newHeightLightFeature.add(feature, hlOption);
    });
  }
  /**根据id移除高亮 */
  removeHeightLightById(id) {
    const heightLightFeature = this.vectorLayer.getSource().getFeatureById(id);
    if (heightLightFeature) {
      this.newHeightLightFeature.removeById(id);
      return;
    }
    // 兼容 lineRoute 加载的航路数据：逐个移除各航路段高亮
    const heightFeatures = this.getRouteFeaturesById(id);
    heightFeatures?.forEach(feature => {
      this.newHeightLightFeature.removeById(feature.getId());
    });
  }
  /**移除全部高亮 */
  removeAllHeightLight() {
    this.newHeightLightFeature.removeAll();
  }
  /**根据id移除 */
  removeById(id) {
    this.htmlTagCollection.removeById(id, true);
    const feature = this.vectorLayer.getSource().getFeatureById(id);
    if (feature) {
      this.vectorLayer.getSource().removeFeature(feature);
      return;
    }
    // 兼容 lineRoute 加载的航路数据：移除所有匹配该id的航路段
    const removeFeatures = this.getRouteFeaturesById(id);
    removeFeatures?.forEach(item => {
      this.vectorLayer.getSource().removeFeature(item);
    });
  }
  /**移除全部回显 */
  removeAll() {
    this.vectorLayer.getSource().clear();
    this.htmlTagCollection.removeAll(true);
  }
  /**添加点 */
  getPointFeature(data, option) {
    let image;
    const color = getColorAlpha(option.color, option.alpha);
    if (option.image) {
      let iconOption = {
        src: option.image, // 图标地址
        scale: option.imageScale // 图标大小
      };
      if (option.imageColor) {
        iconOption["color"] = option.imageColor;
      }
      image = new ol.style.Icon(iconOption);
    } else {
      image = new ol.style.Circle({
        radius: 10, // 半径
        fill: new ol.style.Fill({ color }), // 填充色
        stroke: new ol.style.Stroke({ color: option.color, width: 2 }) // 边框
      });
    }
    const position = [data.coordinate[0], data.coordinate[1]];
    const label = this.getLabel(option);
    const properties = this.getProperties(option);
    const geometry = new ol.geom.Point(position);
    const style = new ol.style.Style({
      image,
      text: new ol.style.Text(label)
    });
    const feature = new ol.Feature({
      geometry,
      featureData: {
        geometry,
        style
      },
      properties
    });
    feature.setId(data.id);
    feature.setStyle(style);
    if (option.html) this.addHtmlTag(data.id, position, option);
    return [feature];
  }
  /**添加route */
  addPolylineRoute(data, option) {
    let routeData = [];
    data.lineRoute.forEach((point, index) => {
      routeData.push(
        Object.assign(
          {
            fillColor: option.color,
            fillAlpha: option.alpha,
            properties: {
              id: data.id
            }
          },
          point
        )
      );
    });
    this.polylineVolumeFromPolygon
      .add({
        data: routeData,
        layer: this.vectorLayer
      })
      .then(() => {
        // 为各航路段 feature 分配唯一 id，便于高亮、移除时按 id 精确定位
        const routeFeatures = this.getRouteFeaturesById(data.id);
        routeFeatures?.forEach((feature, index) => {
          feature.setId(`${data.id}_route_${index}`);
        });
      });
  }
  /**获取加载航路数据（依据 properties.id 匹配） */
  getRouteFeaturesById(id) {
    return this.vectorLayer
      .getSource()
      .getFeatures()
      .filter(feature => {
        const featureId = feature.get("properties")?.id;
        return featureId == id;
      });
  }
  /**添加线 */
  getPolylineFeature(data, option) {
    // 坐标
    let coordinates = data.coordinates;
    coordinates.forEach(item => item.splice(2, 1));
    const label = this.getLabel(option);
    const properties = this.getProperties(option);
    const image = this.getIcon(option);
    const lineStyles = this.getLineStyle(option);
    const geometry = new ol.geom.LineString(coordinates);
    lineStyles[0].setImage(image);
    lineStyles[0].setText(new ol.style.Text(label));
    const style = lineStyles;
    const feature = new ol.Feature({
      geometry,
      featureData: {
        geometry,
        style
      },
      properties
    });
    feature.setId(data.id);
    feature.setStyle(style);
    if (option.html) {
      let position;
      if (data.coordinates.length > 2) {
        const centerIndex = Math.floor(data.coordinates.length / 2);
        const coorCenter = data.coordinates[centerIndex];
        position = [coorCenter[0], coorCenter[1]];
      } else {
        const center = Cesium.BoundingSphere.fromPoints(coordinates).center;
        const center_carto = Cesium.Cartographic.fromCartesian(center);
        position = [
          Cesium.Math.toDegrees(center_carto.longitude),
          Cesium.Math.toDegrees(center_carto.latitude)
        ];
      }
      this.addHtmlTag(data.id, position, option);
    }
    return [feature];
  }
  /**添加面 */
  getPolygonOption(data, option) {
    let coordinates = data.coordinates;
    // 圆形
    if (data.type == "circle") {
      const center = data.center,
        radius = data.radius;
      // 获取扇形边界坐标
      coordinates = shapeCoordinates.getCirclePositions(
        center,
        radius,
        "degrees"
      );
    }
    // 扇形坐标计算
    if (data.type == "sector") {
      const center = data.points.first,
        radius = data.radius,
        startAngle = data.startAngle,
        endAngle = data.endAngle;
      coordinates = shapeCoordinates.getSectorPositionsByRadius({
        center,
        radius,
        startAngle,
        endAngle
      });
    }
    // 长圆坐标计算
    if (data.type == "rectangleCircle") {
      const first = data.points.first,
        second = data.points.second,
        radius = data.radius;
      // 获取长圆边界坐标
      coordinates = shapeCoordinates.getRectangleCirclePositionsByRadius({
        first,
        second,
        radius
      });
    }
    coordinates.forEach(item => item.splice(2, 1));
    coordinates.push(coordinates[0]);
    const label = this.getLabel(option);
    const image = this.getIcon(option);
    const lineStyles = this.getLineStyle(option);
    const properties = this.getProperties(option);
    const geometry = new ol.geom.Polygon([coordinates]);
    const color = getColorAlpha(option.color, option.alpha);
    lineStyles[0].setImage(image);
    lineStyles[0].setFill(new ol.style.Fill({ color }));
    lineStyles[0].setText(new ol.style.Text(label));
    const style = lineStyles;
    let feature = new ol.Feature({
      geometry,
      featureData: {
        geometry,
        style
      },
      properties
    });
    feature.setId(data.id);
    feature.setStyle(style);
    if (option.html) {
      // 坐标
      const hierarchy =
        coordinates[0].length > 2
          ? Cesium.Cartesian3.fromDegreesArrayHeights(
              coordinates.flat(Infinity)
            )
          : Cesium.Cartesian3.fromDegreesArray(coordinates.flat(Infinity));
      const position = getCenterByCoordinates(coordinates);
      this.addHtmlTag(data.id, position, option);
    }
    return [feature];
  }
  /**获取label option */
  getLabel(option) {
    const color = option.textColor || option.color;
    let label = null;
    if (option.text) {
      label = cloneDeep(textOption);
      label.text = String(option.text);
      label.fill = new ol.style.Fill({ color });
      label.offsetX = option.textTranslate[0];
      label.offsetY = option.textTranslate[1];
      label.scale = option.textScale;
      label.textBaseline = "top";
    }
    return label;
  }
  /**获取billboard option */
  getIcon(option) {
    let ret = null;
    if (option.image) {
      let iconOption = {
        src: option.image, // 图标地址
        scale: option.imageScale // 图标大小
      };
      if (option.imageColor) {
        iconOption["color"] = option.imageColor;
      }
      ret = new ol.style.Icon(iconOption);
    }
    return ret;
  }
  getLineStyle(option) {
    // 样式
    let ret = [
      new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: option.color,
          width: option.lineWidth
        })
      })
    ];
    if (option.lineType === "dash") {
      ret = [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: option.color,
            width: option.lineWidth,
            lineDash: [option.dashLength, option.dashLength]
          })
        })
      ];
    }
    if (option.lineType === "glow") {
      const glowPowerNew = option.glowPower >= 0.8 ? 0.8 : option.glowPower;
      ret = [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: option.color,
            width: option.lineWidth
          })
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: "#ffffff",
            width: option.lineWidth * glowPowerNew
          })
        })
      ];
      // ret = new ol.style.Style({
      //   renderer: (coords, state) => {
      //     const ctx = state.context;
      //     ctx.lineWidth = option.lineWidth;
      //     for (let i = 1; i < coords.length; i++) {
      //       const start = coords[i - 1];
      //       const end = coords[i];
      //       const gradient = ctx.createLinearGradient(start[0], start[1], end[0], end[1]);
      //       gradient.addColorStop(0, 'rgba(255,255,0,0)');
      //       gradient.addColorStop(0.5, option.color);
      //       gradient.addColorStop(1, 'rgba(255,255,0,0)');
      //       ctx.strokeStyle = gradient;
      //       ctx.beginPath();
      //       ctx.moveTo(start[0], start[1]);
      //       ctx.lineTo(end[0], end[1]);
      //       ctx.stroke();
      //     }
      //   }
      // });
    }
    if (option.lineType === "outline") {
      const innerLineWidth = option.lineWidth - option.lineOutlineWidth;
      ret = [
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: option.lineOutlineColor,
            width: option.lineWidth
          })
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: option.color,
            width: innerLineWidth <= 1 ? 1 : innerLineWidth
          })
        })
      ];
    }
    return ret;
  }
  /**获取properties */
  getProperties(option) {
    return Object.assign(option, {
      fillColor: option.color,
      fillAlpha: option.alpha,
      outlineColor: option.color,
      outlineAlpha: 1
    });
  }
  /**添加htmlTag */
  addHtmlTag(id, position, option) {
    const htmlTag = new HtmlTag(olMap, {
      id,
      position,
      html: option.html,
      show: true,
      noEvent: false,
      isDrag: option.htmlIsDrag,
      dragLineColor: option.htmlDragLineColor,
      dragLineWidth: option.htmlDragLineWidth,
      alignmentMode: option.htmlAlignmentMode,
      translate: option.htmlTranslate,
      maxVisibleDistance: 1000000,
      zIndex: 5
    });
    // 添加到集合
    this.htmlTagCollection.add(htmlTag);
  }
  destroy() {
    olMap.removeLayer(this.vectorLayer);
    this.htmlTagCollection?.destroy();
    this.newHeightLightFeature.destroy();
  }
}
export { DrawCustomFeedBack };
