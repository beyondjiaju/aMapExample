import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import * as turf from "@turf/turf";
import { getColorAlpha } from "@/3dMap/sdk/olUtils";
/**创建PolylineVolumeFromPolygon
 */
class PolylineVolumeFromPolygon {
  /**
   * 初始化PolylineVolumeFromPolygon
   * @param {Object} olMap
   */
  constructor(olMap) {
    const that = this;
    that.olMap = olMap;
    that.featureCollection = [];
  }
  /**
   * @param {Array} options.data [option, option]
   * @param {Object} options.layer 需要添加到的datasource对象
   * @returns layer
   * // data-option
   * @param {Array} option.point [longitude, latitude] ******
   * @param {String} option.lineUseEntire
   * @param {Number} option.leftWidth default: 1
   * @param {Number} option.rightWidth default: 1
   * @param {Number} option.minHeight 最低高度 default: 0
   * @param {Number} option.maxHeight 最高高度 default: 10
   * @param {String} option.fillColor default: yellow
   * @param {Number} option.fillAlpha default: 0.3
   * @param {Boolean} option.outline default: true
   * @param {Number} option.outlineWidth default: 1.5
   * @param {String} option.outlineColor default: option.fillColor
   * @param {Number} option.outlineAlpha default: 1
   * @param {Object} option.properties 所加载实体属性信息
   * @param {Object} option.label label展示
   */
  add(options) {
    const that = this;
    if (!options.data) return;
    return new Promise((resolve, reject) => {
      let polygonLayer = options.layer;
      if (!polygonLayer) {
        polygonLayer = new ol.VectorLayer({
          source: new ol.VectorSource()
        });
        this.olMap.addLayer(polygonLayer);
      }
      const prevIntersectPoint = {};
      options.data.forEach((item, index) => {
        if (index <= options.data.length - 2) {
          // 下一点位
          const nextItem = options.data[index + 1];
          // 左右两侧坐标
          const loadPositions = {
            leftPositions: [],
            rightPositions: []
          };
          let dexLine,
            dexLineLeft,
            dexLineRight,
            nextLine,
            nextLineLeft,
            nextLineRight;
          const turfOption = {
            units: "meters"
          };
          // 角度距离 计算当前线段两侧
          let dexWidthLeft = Cesium.defaultValue(item.leftWidth, 1);
          let dexWidthRight = Cesium.defaultValue(item.rightWidth, 1);
          if (dexWidthLeft == 0) dexWidthLeft = 1;
          if (dexWidthRight == 0) dexWidthRight = 1;
          dexLine = turf.lineString([item.point, nextItem.point]);
          dexLineLeft = turf.lineOffset(dexLine, dexWidthLeft, turfOption);
          dexLineRight = turf.lineOffset(dexLine, -dexWidthRight, turfOption);
          // 设置当前左右两侧坐标
          loadPositions.leftPositions = dexLineLeft.geometry.coordinates;
          loadPositions.rightPositions = dexLineRight.geometry.coordinates;
          // 有交叉坐标记录替换当前首位坐标为交叉坐标 保证线段在交叉处连接
          if (prevIntersectPoint.left) {
            loadPositions.leftPositions.splice(0, 1, prevIntersectPoint.left);
            prevIntersectPoint.left = null;
          }
          if (prevIntersectPoint.right) {
            loadPositions.rightPositions.splice(0, 1, prevIntersectPoint.right);
            prevIntersectPoint.right = null;
          }
          if (options.data[index + 2]) {
            // 角度距离 计算下一段线段两侧
            let nextWidthLeft = Cesium.defaultValue(nextItem.leftWidth, 1);
            let nextWidthRight = Cesium.defaultValue(nextItem.rightWidth, 1);
            if (nextWidthLeft == 0) nextWidthLeft = 1;
            if (nextWidthRight == 0) nextWidthRight = 1;
            nextLine = turf.lineString([
              nextItem.point,
              options.data[index + 2].point
            ]);
            nextLineLeft = turf.lineOffset(nextLine, nextWidthLeft, turfOption);
            nextLineRight = turf.lineOffset(
              nextLine,
              -nextWidthRight,
              turfOption
            );
            // 判断两侧是否有交叉坐标信息 有交叉坐标取交叉点替换当前线段最后一个点位 无交叉点新增下一点首位拼接过渡
            const leftIntersect = turf.lineIntersect(
              turf.lineString(dexLineLeft.geometry.coordinates),
              turf.lineString(nextLineLeft.geometry.coordinates)
            );
            const rightIntersect = turf.lineIntersect(
              turf.lineString(dexLineRight.geometry.coordinates),
              turf.lineString(nextLineRight.geometry.coordinates)
            );
            if (leftIntersect.features.length > 0) {
              prevIntersectPoint.left =
                leftIntersect.features[0].geometry.coordinates;
              loadPositions.leftPositions.splice(
                loadPositions.leftPositions.length - 1,
                1,
                prevIntersectPoint.left
              );
            } else {
              const distanceLeft = turf.distance(
                turf.point(
                  dexLineLeft.geometry.coordinates[
                    dexLineLeft.geometry.coordinates.length - 1
                  ]
                ),
                turf.point(nextLineLeft.geometry.coordinates[0]),
                {
                  units: "kilometers",
                  steps: 360
                }
              );
              if (distanceLeft > 0) {
                loadPositions.leftPositions.push(
                  nextLineLeft.geometry.coordinates[0]
                );
              }
            }
            if (rightIntersect.features.length > 0) {
              prevIntersectPoint.right =
                rightIntersect.features[0].geometry.coordinates;
              loadPositions.rightPositions.splice(
                loadPositions.rightPositions.length - 1,
                1,
                prevIntersectPoint.right
              );
            } else {
              const distanceRight = turf.distance(
                turf.point(
                  dexLineRight.geometry.coordinates[
                    dexLineRight.geometry.coordinates.length - 1
                  ]
                ),
                turf.point(nextLineRight.geometry.coordinates[0]),
                {
                  units: "kilometers",
                  steps: 360
                }
              );
              if (distanceRight > 0) {
                loadPositions.rightPositions.push(
                  nextLineRight.geometry.coordinates[0]
                );
              }
            }
          }
          // 左右两侧坐标添加高度 wall高度获取
          const types = ["left", "right"];
          let loadOptions = {
            left_minPositions: [],
            right_minPositions: []
          };
          types.forEach(type => {
            const eachData = loadPositions[type + "Positions"];
            eachData.forEach((position, index) => {
              let getItem;
              if (index == 0) {
                getItem = item;
              } else {
                getItem = nextItem;
              }
              loadOptions[type + "_minPositions"].push([
                position[0],
                position[1]
              ]);
            });
          });
          let loadposition = [
            ...loadOptions.left_minPositions,
            ...JSON.parse(
              JSON.stringify(loadOptions.right_minPositions)
            ).reverse()
          ];
          loadposition.push(loadposition[0]);
          const fillColor = Cesium.defaultValue(item.fillColor, "#ffffff"),
            fillAlpha = Cesium.defaultValue(item.fillAlpha, 0.3),
            outlineColor = Cesium.defaultValue(item.outlineColor, fillColor),
            outlineAlpha = Cesium.defaultValue(item.outlineAlpha, 1);
          const fillColorWithAlpha = getColorAlpha(fillColor, fillAlpha);
          const outlineColorWithAlpha = getColorAlpha(
            outlineColor,
            outlineAlpha
          );
          // 设置change获取应用id
          let addProperties = {
            fillColor,
            fillAlpha,
            polylineReplaceOutline: true,
            labeShow: true,
            labelMaxShowScale: 1,
            labelMaxShowHeight: 3000000
          };
          addProperties = Object.assign(addProperties, item.properties);
          // layer
          const geometry = new ol.geom.Polygon([loadposition]);
          const style = new ol.style.Style({
            fill: new ol.style.Fill({ color: fillColorWithAlpha }), // 半透明填充
            // stroke: new ol.style.Stroke({ color: outlineColorWithAlpha, width: 2 }),
            text: new ol.style.Text({
              text: addProperties.label || "",
              font: "bold 20px sans-serif",
              fill: new ol.style.Fill({ color: fillColor }),
              stroke: new ol.style.Stroke({ color: "#000000", width: 2 })
            })
          });
          let feature = new ol.Feature({
            geometry,
            featureData: {
              geometry,
              style
            },
            properties: addProperties
          });
          feature.setStyle(style);
          polygonLayer.getSource().addFeature(feature);
          that.featureCollection.push(feature);
        }
      });
      resolve(polygonLayer);
    });
  }
}
export { PolylineVolumeFromPolygon };
