import * as ol from "@/3dMap/sdk/ol";
import * as turf from "@turf/turf";
import { getColorAlpha } from "./CorlorTool";

/**创建 HollowCylinder 空心圆柱、扇形对象（OpenLayers 二维） */
class HollowCylinder {
  /**
   * 初始化 HollowCylinder
   * @param {Object} olMap - OpenLayers 地图实例
   * @param {Object} options
   * @param {Array} options.center 位置 [lng, lat]
   * @param {Number} options.beginAngle 起始角度 default:50
   * @param {Number} options.endAngle 结束 default:100
   * @param {Number} options.minHeight 体于地面的高度 default:0
   * @param {Number} options.maxHeight 体顶部距离地面的高度 default:10
   * @param {Number} options.innerRadius 内半径 default:0
   * @param {Number} options.outRadius 外半径 default:20
   * @param {Boolean} options.fill 是否填充 default:true
   * @param {String} options.fillColor 颜色 default:#ffffff
   * @param {Number} options.fillAlpha 颜色 default:0.3
   * @param {Boolean} options.outline 边线 default:false
   * @param {Number} options.outlineWidth 边线宽度 default:2
   * @param {String} options.outlineColor 边线颜色 default:#ffffff
   * @param {Number} options.outlineAlpha 边线透明度 default:1
   * @param {Boolean} options.closeCenter 扇形是否闭合中心点 default:true
   * @returns {ol.layer.VectorLayer}
   */
  constructor(olMap, options) {
    const that = this;
    const defaultOptions = {
      minHeight: 0,
      maxHeight: 10,
      innerRadius: 0,
      outRadius: 20,
      fill: true,
      fillColor: "#ffffff",
      fillAlpha: 0.3,
      outline: false,
      outlineWidth: 2,
      outlineColor: options.fillColor || "#fffFFF",
      outlineAlpha: 1,
      beginAngle: 50,
      endAngle: 100,
      closeCenter: true
    };
    options = Object.assign(defaultOptions, options);
    if (!options.center || !olMap) return;

    const properties = {
      ...options
    };

    that.hollowCylinderLayer = new ol.VectorLayer({
      source: new ol.VectorSource(),
      updateWhileAnimating: true,
      updateWhileInteracting: true
    });
    olMap.addLayer(that.hollowCylinderLayer);

    const source = that.hollowCylinderLayer.getSource();
    const center = options.center;
    const point = turf.point([center[0], center[1]]);
    const turfOptions = {
      units: "miles",
      steps: 360
    };

    let innerPositions_degrees;
    let outPositions_degrees;
    let polygonCoordinates;
    let hierarchy_degrees;
    const angle = Math.abs(options.beginAngle - options.endAngle);

    if (angle >= 360) {
      innerPositions_degrees = turf.buffer(
        point,
        options.innerRadius * 0.001,
        turfOptions
      );
      outPositions_degrees = turf.buffer(
        point,
        options.outRadius * 0.001,
        turfOptions
      );
      const outerRing = outPositions_degrees.geometry.coordinates[0];
      const innerRing = innerPositions_degrees.geometry.coordinates[0]
        .slice()
        .reverse();
      polygonCoordinates = [outerRing, innerRing];
    } else {
      innerPositions_degrees = that.getBufferPositions(
        options.beginAngle,
        options.endAngle,
        point,
        options.innerRadius * 0.001,
        turfOptions
      );
      outPositions_degrees = that.getBufferPositions(
        options.beginAngle,
        options.endAngle,
        point,
        options.outRadius * 0.001,
        turfOptions
      );
      if (options.closeCenter) {
        innerPositions_degrees.unshift(point.geometry.coordinates);
        outPositions_degrees.unshift(point.geometry.coordinates);
        const outerRing = [...outPositions_degrees];
        if (
          outerRing[0][0] !== outerRing[outerRing.length - 1][0] ||
          outerRing[0][1] !== outerRing[outerRing.length - 1][1]
        ) {
          outerRing.push(outerRing[0]);
        }
        const innerRing = [...innerPositions_degrees].reverse();
        polygonCoordinates = [outerRing, innerRing];
      } else {
        hierarchy_degrees = [
          innerPositions_degrees,
          JSON.parse(JSON.stringify(outPositions_degrees)).reverse()
        ];
        const ring = hierarchy_degrees.flat();
        if (
          ring[0][0] !== ring[ring.length - 1][0] ||
          ring[0][1] !== ring[ring.length - 1][1]
        ) {
          ring.push(ring[0]);
        }
        polygonCoordinates = [ring];
      }
    }

    if (options.fill) {
      const fillColorWithAlpha = getColorAlpha(
        options.fillColor,
        options.fillAlpha
      );
      const geometry = new ol.geom.Polygon(polygonCoordinates);
      const style = new ol.style.Style({
        fill: new ol.style.Fill({ color: fillColorWithAlpha })
      });
      const feature = new ol.Feature({
        geometry,
        featureData: { geometry, style },
        properties
      });
      feature.setStyle(style);
      source.addFeature(feature);
    }

    if (options.outline) {
      const outlineColorWithAlpha = getColorAlpha(
        options.outlineColor,
        options.outlineAlpha
      );
      const lineStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
          color: outlineColorWithAlpha,
          width: options.outlineWidth
        })
      });
      const addLineFeature = coordinates => {
        if (!coordinates || coordinates.length < 2) return;
        const lineCoords = coordinates.map(c => [c[0], c[1]]);
        const feature = new ol.Feature({
          geometry: new ol.geom.LineString(lineCoords),
          properties
        });
        feature.setStyle(lineStyle);
        source.addFeature(feature);
      };
      const closeRing = ring => {
        if (!ring || ring.length < 2) return ring;
        const closed = ring.map(c => [c[0], c[1]]);
        const first = closed[0];
        const last = closed[closed.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          closed.push(first);
        }
        return closed;
      };

      if (angle >= 360) {
        addLineFeature(innerPositions_degrees.geometry.coordinates[0]);
        addLineFeature(outPositions_degrees.geometry.coordinates[0]);
      } else if (options.closeCenter) {
        const innerArc = innerPositions_degrees.slice(1);
        const outerArc = outPositions_degrees.slice(1);
        addLineFeature(innerArc);
        addLineFeature(outerArc);
        if (innerArc.length && outerArc.length) {
          addLineFeature([outerArc[0], innerArc[0]]);
          addLineFeature([
            outerArc[outerArc.length - 1],
            innerArc[innerArc.length - 1]
          ]);
        }
      } else if (hierarchy_degrees) {
        addLineFeature(closeRing(hierarchy_degrees.flat()));
        const innerArc = innerPositions_degrees;
        const outerArc = outPositions_degrees;
        if (innerArc.length && outerArc.length) {
          addLineFeature([innerArc[0], outerArc[0]]);
          addLineFeature([
            innerArc[innerArc.length - 1],
            outerArc[outerArc.length - 1]
          ]);
        }
      }
    }

    return that.hollowCylinderLayer;
  }

  /**根据角度、点、半径获取坐标 */
  getBufferPositions(beginAngle, endAngle, point, radius, options) {
    const newPositions = [];
    let end = endAngle;
    if (end < beginAngle) {
      end += 360;
    }
    for (let i = beginAngle; i <= end; i += 1) {
      const destination = turf.rhumbDestination(point, radius, i, options);
      newPositions.push(destination.geometry.coordinates);
    }
    return newPositions;
  }
}

export { HollowCylinder };
