import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
import { PolylineAntialiasingMaterialProperty } from "@/3dMap/sdk/cesiumUtils";
/**创建HollowCylinder空心圆柱、扇形对象
 */
class HollowCylinder {
  /**
   * 初始化HollowCylinder
   * @param {Object} viewer - viewer对象
   * @param {Object} options
   * @param {Array} options.center 位置 [lng, lat]
   * @param {Number} options.beginAngle 起始角度 default:50
   * @param {Number} options.endAngle 结束 default:100
   * @param {Number} options.minHeight 体于地面的高度 default:0
   * @param {Number} options.maxHeight 体顶部距离地面的高度 default:10
   * @param {Number} options.innerRadius 内半径 default:10
   * @param {Number} options.outRadius 外半径 default:20
   * @param {Boolean} options.fill 是否填充 default:true
   * @param {String} options.fillColor 颜色 default:#ffffff
   * @param {Number} options.fillAlpha 颜色 default:0.3
   * @param {Boolean} options.outline 边线 default:false
   * @param {Number} options.outlineWidth 边线宽度 default:2
   * @param {String} options.outlineColor 边线颜色 default:#ffffff
   * @param {String} options.outlineAlpha 边线颜色 default:1
   * @param {Boolean} options.closeCenter 扇形是否闭合中心点 default:true
   */
  constructor(viewer, options) {
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
      outlineColor: "#fffFFF",
      outlineAlpha: 1,
      beginAngle: 50,
      endAngle: 100,
      closeCenter: true
    };
    options = Object.assign(defaultOptions, options);
    if (!options.center || !viewer) return;
    const properties = {
      ...options,
      polylineReplaceOutline: true
    };
    // 创建datasource对象存储
    that.hollowCylinderSource = new Cesium.CustomDataSource();
    viewer.dataSources.add(that.hollowCylinderSource);
    // 计算坐标
    const center = options.center,
      point = turf.point([center[0], center[1]]),
      turfOptions = {
        units: "kilometers",
        steps: 360
      };
    let innerPositions_degrees,
      outPositions_degrees,
      innerPositions_c3,
      outPositions_c3,
      hierarchy_degrees,
      hierarchy;
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
      innerPositions_c3 = Cesium.Cartesian3.fromDegreesArray(
        innerPositions_degrees.geometry.coordinates.flat(Infinity)
      );
      outPositions_c3 = Cesium.Cartesian3.fromDegreesArray(
        outPositions_degrees.geometry.coordinates.flat(Infinity)
      );
      hierarchy = {
        positions: outPositions_c3,
        holes: [
          {
            positions: innerPositions_c3
          }
        ]
      };
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
        innerPositions_c3 = Cesium.Cartesian3.fromDegreesArray(
          innerPositions_degrees.flat(Infinity)
        );
        outPositions_c3 = Cesium.Cartesian3.fromDegreesArray(
          outPositions_degrees.flat(Infinity)
        );
        hierarchy = {
          positions: outPositions_c3,
          holes: [
            {
              positions: innerPositions_c3
            }
          ]
        };
      } else {
        hierarchy_degrees = [
          innerPositions_degrees,
          JSON.parse(JSON.stringify(outPositions_degrees)).reverse()
        ];
        hierarchy = Cesium.Cartesian3.fromDegreesArray(
          hierarchy_degrees.flat(Infinity)
        );
      }
    }
    // 添加
    if (options.fill) {
      that.hollowCylinderSource.entities.add({
        polygon: {
          hierarchy,
          height: options.minHeight,
          extrudedHeight: options.maxHeight,
          material: Cesium.Color.fromCssColorString(
            options.fillColor
          ).withAlpha(options.fillAlpha)
        },
        properties
      });
    }
    // 边线
    if (options.outline) {
      const line_positions = {
        min: [],
        max: []
      };
      if (angle >= 360) {
        const innerPositions = innerPositions_degrees.geometry.coordinates[0];
        innerPositions.forEach(degrees => {
          line_positions.min.push([degrees[0], degrees[1], options.minHeight]);
          line_positions.max.push([degrees[0], degrees[1], options.maxHeight]);
        });
        line_positions.min.push([
          innerPositions[0][0],
          innerPositions[0][1],
          options.minHeight
        ]);
        line_positions.max.push([
          innerPositions[0][0],
          innerPositions[0][1],
          options.maxHeight
        ]);
        const outPositions = outPositions_degrees.geometry.coordinates[0];
        line_positions["min_out"] = [];
        line_positions["max_out"] = [];
        outPositions.forEach(degrees => {
          line_positions.min_out.push([
            degrees[0],
            degrees[1],
            options.minHeight
          ]);
          line_positions.max_out.push([
            degrees[0],
            degrees[1],
            options.maxHeight
          ]);
        });
        line_positions.min_out.push([
          outPositions[0][0],
          outPositions[0][1],
          options.minHeight
        ]);
        line_positions.max_out.push([
          outPositions[0][0],
          outPositions[0][1],
          options.maxHeight
        ]);
      } else {
        if (options.closeCenter) {
          const lines = {
            inner: innerPositions_degrees,
            out: outPositions_degrees
          };
          // 坐标处理
          lines.inner.splice(0, 1);
          lines.out.push(outPositions_degrees[0]);
          // 添加
          for (const [key, value] of Object.entries(lines)) {
            value.forEach(degrees => {
              // 上下面
              if (!line_positions[key + "min"])
                line_positions[key + "min"] = [];
              if (!line_positions[key + "max"])
                line_positions[key + "max"] = [];
              line_positions[key + "min"].push([
                degrees[0],
                degrees[1],
                options.minHeight
              ]);
              line_positions[key + "max"].push([
                degrees[0],
                degrees[1],
                options.maxHeight
              ]);
            });
            // 侧边
            if (key == "inner") {
              line_positions[key + "_first"] = [
                [value[0], options.minHeight],
                [value[0], options.maxHeight]
              ];
              line_positions[key + "_last"] = [
                [value[value.length - 1], options.minHeight],
                [value[value.length - 1], options.maxHeight]
              ];
            } else {
              line_positions[key + "_first"] = [
                [value[0], options.minHeight],
                [value[0], options.maxHeight]
              ];
            }
          }
          // 坐标处理
          lines.out.splice(0, 1);
          lines.out.splice(lines.out.length - 1, 1);
          line_positions["out" + "_second"] = [
            [lines.out[0], options.minHeight],
            [lines.out[0], options.maxHeight]
          ];
          line_positions["out" + "_last"] = [
            [lines.out[lines.out.length - 1], options.minHeight],
            [lines.out[lines.out.length - 1], options.maxHeight]
          ];
        } else if (hierarchy_degrees) {
          const hierarchy_degrees_new = hierarchy_degrees.flat();
          // 上下面
          hierarchy_degrees_new.forEach(degrees => {
            line_positions.min.push([
              degrees[0],
              degrees[1],
              options.minHeight
            ]);
            line_positions.max.push([
              degrees[0],
              degrees[1],
              options.maxHeight
            ]);
          });
          line_positions.min.push([
            hierarchy_degrees_new[0][0],
            hierarchy_degrees_new[0][1],
            options.minHeight
          ]);
          line_positions.max.push([
            hierarchy_degrees_new[0][0],
            hierarchy_degrees_new[0][1],
            options.maxHeight
          ]);
          // 侧边
          const line_side = {
            inner: innerPositions_degrees,
            out: outPositions_degrees
          };
          for (const [key, value] of Object.entries(line_side)) {
            line_positions[key + "_first"] = [
              [value[0], options.minHeight],
              [value[0], options.maxHeight]
            ];
            line_positions[key + "_last"] = [
              [value[value.length - 1], options.minHeight],
              [value[value.length - 1], options.maxHeight]
            ];
          }
        }
      }
      // 添加
      for (const line_position of Object.values(line_positions)) {
        that.hollowCylinderSource.entities.add({
          polyline: {
            positions: Cesium.Cartesian3.fromDegreesArrayHeights(
              line_position.flat(Infinity)
            ),
            width: options.outlineWidth,
            material: new PolylineAntialiasingMaterialProperty({
              color: Cesium.Color.fromCssColorString(
                options.outlineColor
              ).withAlpha(options.outlineAlpha)
            })
          },
          properties
        });
      }
    }
    return that.hollowCylinderSource;
  }
  /**根据角度, 点, 半径获取坐标 */
  getBufferPositions(beginAngle, endAngle, point, radius, options) {
    const newPositions = [];
    if (endAngle < beginAngle) {
      endAngle += 360;
    }
    for (let i = beginAngle; i <= endAngle; i += 1) {
      const destination = turf.rhumbDestination(point, radius, i, options);
      newPositions.push(destination.geometry.coordinates);
    }
    // newPositions.push(point.geometry.coordinates);
    return newPositions;
  }
}
export { HollowCylinder };
