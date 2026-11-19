import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
import { PolylineAntialiasingMaterialProperty } from "@/3dMap/sdk/cesiumUtils";
/**创建PolylineVolumeFromPolygon
 */
class PolylineVolumeFromPolygon {
  /**
   * 初始化PolylineVolumeFromPolygon
   * @param {Object} viewer - viewer对象
   */
  constructor(viewer) {
    const that = this;
    that.viewer = viewer;
    that.entityCollection = [];
  }
  /**
   * @param {Array} options.data [option, option]
   * @param {Array} options.addToViewer 是否添加到viewer
   * @param {Object} options.datasource 需要添加到的datasource对象
   * @returns datasource
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
      const polygonDataSource =
        options.datasource || new Cesium.CustomDataSource();
      const addToViewer = Cesium.defaultValue(options.addToViewer, true);
      const prevIntersectPoint = {};
      options.data.forEach((item, index) => {
        if (index <= options.data.length - 2) {
          // 下一点位
          const nextItem = options.data[index + 1];
          if (
            item.point[0] == nextItem.point[0] &&
            item.point[1] == nextItem.point[1]
          ) {
            return;
          }
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
          if (
            options.data[index + 2] &&
            (nextItem.point[0] != options.data[index + 2].point[0] ||
              nextItem.point[1] != options.data[index + 2].point[1])
          ) {
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
          const loadOptions = {
            left_minPositions: [],
            left_maxPositions: [],
            left_minHeights: [],
            left_maxHeights: [],
            right_minPositions: [],
            right_maxPositions: [],
            right_minHeights: [],
            right_maxHeights: []
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
              const minHeight = Cesium.defaultValue(getItem.minHeight, 0);
              const maxHeight = Cesium.defaultValue(getItem.maxHeight, 10);
              loadOptions[type + "_minPositions"].push([
                position[0],
                position[1],
                minHeight
              ]);
              loadOptions[type + "_maxPositions"].push([
                position[0],
                position[1],
                maxHeight
              ]);
              loadOptions[type + "_minHeights"].push(minHeight);
              loadOptions[type + "_maxHeights"].push(maxHeight);
            });
          });
          // 添加面及边线
          const loadDatas = [
            {
              // 底部
              polygonData: {
                positions: [
                  loadOptions.left_minPositions,
                  JSON.parse(
                    JSON.stringify(loadOptions.right_minPositions)
                  ).reverse()
                ]
              }
              // // 底部-左侧边线
              // polylineData: {
              //   positions: loadOptions.left_minPositions
              // },
            },
            {
              // 右侧
              polygonData: {
                positions: [
                  loadOptions.right_minPositions,
                  JSON.parse(
                    JSON.stringify(loadOptions.right_maxPositions)
                  ).reverse()
                ]
              }
              // wallData: {
              //   positions: loadPositions.leftPositions,
              //   minimumHeights: loadOptions.left_minHeights,
              //   maximumHeights: loadOptions.left_maxHeights
              // },
              // // 右侧-底部边线
              // polylineData: {
              //   positions: loadOptions.right_minPositions
              // }
            },
            {
              // 顶部
              polygonData: {
                positions: [
                  loadOptions.left_maxPositions,
                  JSON.parse(
                    JSON.stringify(loadOptions.right_maxPositions)
                  ).reverse()
                ]
              }
              // // 顶部-右侧边线
              // polylineData: {
              //   positions: loadOptions.right_maxPositions
              // },
            },
            {
              // 左侧
              polygonData: {
                positions: [
                  loadOptions.left_minPositions,
                  JSON.parse(
                    JSON.stringify(loadOptions.left_maxPositions)
                  ).reverse()
                ]
              }
              // wallData: {
              //   positions: loadPositions.rightPositions,
              //   minimumHeights: loadOptions.right_minHeights,
              //   maximumHeights: loadOptions.right_maxHeights
              // },
              // // 左侧-顶部边线
              // polylineData: {
              //   positions: loadOptions.left_maxPositions
              // }
            }
          ];
          // 第一段与最后一段新增出入口边线信息
          // if (index == 0) {
          //   loadDatas.push({
          //     polylineData: {
          //       positions: [
          //         loadOptions.left_minPositions[0],
          //         loadOptions.left_maxPositions[0],
          //         loadOptions.right_maxPositions[0],
          //         loadOptions.right_minPositions[0],
          //         loadOptions.left_minPositions[0]
          //       ]
          //     }
          //   });
          // } else if (index == options.data.length - 2) {
          //   loadDatas.push({
          //     polylineData: {
          //       positions: [
          //         loadOptions.left_minPositions[
          //         loadOptions.left_minPositions.length - 1
          //         ],
          //         loadOptions.left_maxPositions[
          //         loadOptions.left_maxPositions.length - 1
          //         ],
          //         loadOptions.right_maxPositions[
          //         loadOptions.right_maxPositions.length - 1
          //         ],
          //         loadOptions.right_minPositions[
          //         loadOptions.right_minPositions.length - 1
          //         ],
          //         loadOptions.left_minPositions[
          //         loadOptions.left_minPositions.length - 1
          //         ]
          //       ]
          //     }
          //   });
          // }
          const fillColor = Cesium.defaultValue(item.fillColor, "yellow"),
            fillAlpha = Cesium.defaultValue(item.fillAlpha, 0.3),
            outlineColor = Cesium.defaultValue(item.outlineColor, fillColor),
            outlineAlpha = Cesium.defaultValue(item.outlineAlpha, 1);
          // 颜色
          const material =
            Cesium.Color.fromCssColorString(fillColor).withAlpha(fillAlpha);
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
          // 顶部面
          const topPositions = [
            loadOptions.left_maxPositions,
            JSON.parse(JSON.stringify(loadOptions.right_maxPositions)).reverse()
          ].flat(Infinity);
          // 根据配置信息添加实体
          loadDatas.forEach((loadData, loadDataIndex) => {
            let entityOption = {
              position: Cesium.BoundingSphere.fromPoints(
                Cesium.Cartesian3.fromDegreesArrayHeights(topPositions)
              ).center,
              properties: addProperties
            };
            if (loadDataIndex == 0 && addProperties.label) {
              entityOption.label = {
                text: addProperties.label,
                font: "bold 30px sans-serif",
                verticalOrigin: Cesium.VerticalOrigin.CENTER,
                horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
                scaleByDistance: new Cesium.NearFarScalar(
                  0,
                  addProperties.labelMaxShowScale,
                  addProperties.labelMaxShowHeight,
                  0
                ),
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                outlineWidth: 4,
                fillColor: Cesium.Color.fromCssColorString(fillColor),
                outlineColor: Cesium.Color.BLACK,
                disableDepthTestDistance: 99,
                show: addProperties.labeShow
              };
            }
            if (loadData.polygonData) {
              entityOption.polygon = {
                hierarchy: Cesium.Cartesian3.fromDegreesArrayHeights(
                  loadData.polygonData.positions.flat(Infinity)
                ),
                material,
                perPositionHeight: true
              };
            }
            if (loadData.wallData) {
              entityOption.wall = {
                positions: Cesium.Cartesian3.fromDegreesArray(
                  loadData.wallData.positions.flat(Infinity)
                ),
                minimumHeights: loadData.wallData.minimumHeights,
                maximumHeights: loadData.wallData.maximumHeights,
                material
              };
            }
            // if (loadData.polylineData && item.outline) {
            //   entityOption.polyline = {
            //     positions: Cesium.Cartesian3.fromDegreesArrayHeights(
            //       loadData.polylineData.positions.flat(Infinity)
            //     ),
            //     material: new PolylineAntialiasingMaterialProperty({
            //       color:
            //         Cesium.Color.fromCssColorString(outlineColor).withAlpha(
            //           outlineAlpha
            //         )
            //     }),
            //     width: Cesium.defaultValue(item.outlineWidth, 2)
            //   };
            // }
            if (addToViewer) {
              const addEntity = that.viewer.entities.add(entityOption);
              that.entityCollection.push(addEntity);
              polygonDataSource.entities.add(addEntity);
            } else {
              const addEntity = polygonDataSource.entities.add(entityOption);
              that.entityCollection.push(addEntity);
            }
          });
        }
      });
      resolve(polygonDataSource);
    });
  }
  /**根据routeId获取 */
  getById(id) {
    let routeEntities = this.entityCollection.find((entity, index) => {
      let entityProperties = entity.properties.getValue(
        this.viewer.clock.currentTime
      );
      return entityProperties.id == id;
    });
    return routeEntities;
  }
  /**根据lineEntireId获取 */
  getByEntireId(id) {
    let routePartEntities = this.entityCollection.find((entity, index) => {
      let entityProperties = entity.properties.getValue(
        this.viewer.clock.currentTime
      );
      return entityProperties.lineEntireId == id;
    });
    return routePartEntities;
  }
  /**设置显示状态 */
  setVisible(state) {
    this.entityCollection.forEach(entity => {
      entity.show = Cesium.defaultValue(state, true);
    });
  }
  /**根据routeId设置显示状态 */
  setVisibleByRouteId(id, state) {
    let entityArr = this.getById(id);
    entityArr.forEach(entity => {
      entity.show = Cesium.defaultValue(state, true);
    });
  }
  /**根据lineEntireId设置显示状态 */
  setVisibleByEntireId(id, state) {
    let entityArr = this.getByEntireId(id);
    entityArr.forEach(entity => {
      entity.show = Cesium.defaultValue(state, true);
    });
  }
  /**根据routeId删除 */
  removeById(id) {
    this.entityCollection.forEach((entity, index) => {
      let entityProperties = entity.properties.getValue(
        this.viewer.clock.currentTime
      );
      if (entityProperties.id == id) {
        this.viewer.entities.remove(entity);
        this.entityCollection.splice(index, 1);
      }
    });
  }
  /**清除全部 */
  removeAll() {
    this.entityCollection.forEach(entity => {
      this.viewer.entities.remove(entity);
    });
    this.entityCollection = [];
  }
  /**
   * 注销集合
   */
  destroy() {
    this.removeAll();
    this.viewer = null;
  }
}
export { PolylineVolumeFromPolygon };
