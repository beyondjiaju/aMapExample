import * as Cesium from "@/3dMap/sdk/cesium";
import { cartesian3ToLonLat } from "./hook";
const gridLevelDegrees = {
  1: 0.5,
  2: 0.25,
  3: 5.0 / 60.0,
  4: 1.0 / 60.0,
  5: 0.5 / 60.0,
  6: 0.25 / 60.0,
  7: 5.0 / 60.0 / 60.0,
  8: 1.0 / 60.0 / 60.0
};
const gridLevelShowMaxHeight = {
  1: 3000 * 1000, // 30分
  2: 1000 * 1000,
  3: 400 * 1000,
  4: 50 * 1000, // 1分
  5: 20 * 1000,
  6: 10 * 1000,
  7: 5 * 1000,
  8: 1 * 1000
};
// 网格级别枚举
const GridLevelEnum = {
  MINUTE_30: 1,
  MINUTE_15: 2,
  MINUTE_5: 3,
  MINUTE_1: 4,
  SECOND_30: 5,
  SECOND_15: 6,
  SECOND_5: 7,
  SECOND_1: 8
};
class LevelGridCesium {
  viewer: any;
  listener: any;
  level: any;
  gridCodeVisible: any;
  gridLines: any;
  gridLabels: any;
  showPolygon: any;
  color: any;
  destroyed: boolean;
  constructor(viewer, option = null) {
    const newOption = Object.assign(
      {
        level: null,
        color: "#ffffff"
      },
      option
    );
    this.viewer = viewer;
    this.level = newOption.level;
    this.color = newOption.color;
    this.gridCodeVisible = true;
    this.showPolygon = null;
    this.destroyed = false;
    this.gridLines = new Cesium.PolylineCollection();
    this.viewer.scene.primitives.add(this.gridLines);
    this.gridLabels = new Cesium.LabelCollection();
    this.viewer.scene.primitives.add(this.gridLabels);
  }
  /** 更新已绘制网格线和标注颜色，后续新建也沿用该颜色 */
  setColor(color) {
    if (!color) return;
    this.color = color;
    const cesiumColor = Cesium.Color.fromCssColorString(color);
    for (let i = 0; i < this.gridLabels.length; i++) {
      this.gridLabels.get(i).fillColor = cesiumColor;
    }
    for (let i = 0; i < this.gridLines.length; i++) {
      const line = this.gridLines.get(i);
      if (line.material?.uniforms) line.material.uniforms.color = cesiumColor;
    }
  }
  /**设置层级
   * @param { Number } level
   */
  setLevel(level) {
    this.level = level;
    this.start();
  }
  /**开始动态展示网格 */
  start() {
    const that = this;
    this.stop();
    if (!this.level) return;
    this.listener = () => {
      if (this.showPolygon) {
        this.viewer.entities.remove(this.showPolygon);
      }
      that.gridLines.removeAll();
      that.gridLabels.removeAll();
      const currentLevelMaxHeight = gridLevelShowMaxHeight[that.level];
      if (
        this.viewer.camera.positionCartographic.height > currentLevelMaxHeight
      ) {
        return;
      }
      // 计算边界
      let rectangle;
      if (that.viewer.scene.mode == 3) {
        const rectangle2d = that.getCoordinates2D();
        const rectangle3d = that.getCoordinates3D();
        rectangle = {
          minLon: rectangle2d.minLon || rectangle3d.minLon,
          maxLon: rectangle2d.maxLon || rectangle3d.maxLon,
          minLat: rectangle2d.minLat || rectangle3d.minLat,
          maxLat: rectangle2d.maxLat || rectangle3d.maxLat
        };
      } else {
        rectangle = that.getCoordinates2D();
      }
      if (
        !rectangle.minLon ||
        !rectangle.maxLon ||
        !rectangle.minLat ||
        !rectangle.maxLat
      )
        return;
      // 根据缓冲网格个数计算缓冲度数
      const bufferDegrees = gridLevelDegrees[this.level] * 10;
      rectangle.minLon -= bufferDegrees;
      rectangle.minLat -= bufferDegrees;
      rectangle.maxLon += bufferDegrees;
      rectangle.maxLat += bufferDegrees;
      // 整理边界坐标
      // let coordinates = [
      //   [rectangle.minLon, rectangle.minLat],
      //   [rectangle.maxLon, rectangle.minLat],
      //   [rectangle.maxLon, rectangle.maxLat],
      //   [rectangle.minLon, rectangle.maxLat]
      // ];
      // this.showPolygon = this.viewer.entities.add({
      //   polygon: {
      //     hierarchy: Cesium.Cartesian3.fromDegreesArray(
      //       coordinates.flat(Infinity)
      //     ),
      //     material: Cesium.Color.RED.withAlpha(0.5),
      //     height: 0,
      //     extrudedHeight: 100,
      //     outline: true,
      //     outlineColor: Cesium.Color.RED
      //   }
      // });
      // 获取加载数据
      const loadData = that.getGridsAndCodes(rectangle, this.level);
      let addOption = {
        gridsData: loadData.grids,
        codeData: loadData.codes
      };
      this.addGrids(addOption);
    };
    this.listener();
    // 监听相机变化事件
    this.viewer.camera.changed.addEventListener(this.listener);
  }
  /**停止展示 */
  stop() {
    if (this.listener)
      this.viewer.camera.changed.removeEventListener(this.listener);
    this.gridLines.removeAll();
    this.gridLabels.removeAll();
  }
  /** 注销当前层级：先停监听并隐藏，等本帧渲染结束后再从场景移除 */
  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    const viewer = this.viewer;
    if (this.listener && viewer && !viewer.isDestroyed?.()) {
      viewer.camera.changed.removeEventListener(this.listener);
    }
    this.listener = undefined;
    const lines = this.gridLines;
    const labels = this.gridLabels;
    const polygon = this.showPolygon;
    this.gridLines = undefined;
    this.gridLabels = undefined;
    this.showPolygon = undefined;
    // 先隐藏，避免下一帧还去更新即将销毁的集合
    if (lines) lines.show = false;
    if (labels) labels.show = false;
    if (!viewer || viewer.isDestroyed?.()) return;
    // 同步 remove 会在渲染循环仍引用顶点缓冲时销毁 WebGL 资源，地图直接报错并停止绘制
    setTimeout(() => {
      if (viewer.isDestroyed?.()) return;
      if (lines && !lines.isDestroyed?.()) viewer.scene.primitives.remove(lines);
      if (labels && !labels.isDestroyed?.()) viewer.scene.primitives.remove(labels);
      if (polygon) viewer.entities.remove(polygon);
    }, 0);
  }
  /**2d模式下获取相机边界 */
  getCoordinates2D() {
    const that = this;
    const camera = that.viewer.camera;
    const scene = that.viewer.scene;
    // 获取最大最小坐标
    const clientData = {
      leftBottom: [0, that.viewer.canvas.clientHeight],
      rightTop: [that.viewer.canvas.clientWidth, 0]
    };
    let degreesData = {
      leftBottom: null,
      rightTop: null
    };
    for (let [key, value] of Object.entries(clientData)) {
      let ray = camera.getPickRay(new Cesium.Cartesian2(value[0], value[1]));
      // getPickRay 在画布尺寸为 0 或场景过渡中会返回 undefined
      if (!ray) continue;
      let cartesian3 = scene.globe.pick(ray, scene);
      if (cartesian3) degreesData[key] = cartesian3ToLonLat(cartesian3);
    }
    // 计算区域坐标
    let minLon = null;
    let maxLon = null;
    let minLat = null;
    let maxLat = null;
    if (degreesData.leftBottom) {
      minLon = degreesData.leftBottom[0];
      minLat = degreesData.leftBottom[1];
    }
    if (degreesData.rightTop) {
      maxLon = degreesData.rightTop[0];
      maxLat = degreesData.rightTop[1];
    }
    return {
      minLon,
      minLat,
      maxLon,
      maxLat
    };
  }
  /**3d模式下获取相机边界 */
  getCoordinates3D() {
    const that = this;
    const camera = that.viewer.camera;
    const scene = that.viewer.scene;
    const canvas = that.viewer.canvas;
    const empty = { minLon: null, minLat: null, maxLon: null, maxLat: null };
    // 画布宽高为 0 时四个角都拾取失败，Cesium 会退回整球范围
    if (!canvas?.clientWidth || !canvas?.clientHeight) return empty;
    const rectangle = camera.computeViewRectangle(scene.globe.ellipsoid);
    if (!rectangle) return empty;
    const minLon = Cesium.Math.toDegrees(rectangle.west);
    const maxLon = Cesium.Math.toDegrees(rectangle.east);
    const minLat = Cesium.Math.toDegrees(rectangle.south);
    const maxLat = Cesium.Math.toDegrees(rectangle.north);
    // 整球范围不是当前视野，拿去铺网格会把三维打崩
    if (maxLon - minLon >= 300 || maxLat - minLat >= 150) return empty;
    return {
      minLon,
      minLat,
      maxLon,
      maxLat
    };
  }
  /**
   * 通过区域和网格级别获取对应网格参考线
   * @param {Object} option - 区域多边形对象，需包含getEnvelopeInternal方法返回边界信息
   * @returns {Array<Array<Array<number>>>} 网格参考线坐标集合
   */
  getGridsAndCodes(option, level) {
    const baseOffset = gridLevelDegrees[level];
    // 获取多边形边界
    let fGridStartLongitude = option.minLon;
    let fGridEndLongitude = option.maxLon;
    let fGridStartLatitude = option.minLat;
    let fGridEndLatitude = option.maxLat;
    // 计算当前区域范围划分到网格的最小经度
    let fMod = Math.abs(fGridStartLongitude % baseOffset);
    if (fMod > 0) {
      if (fGridStartLongitude > 0) {
        fGridStartLongitude -= fMod;
      } else if (fGridStartLongitude < 0) {
        fGridStartLongitude += fMod - baseOffset;
      }
    }
    // 计算当前区域范围划分到网格的最大经度
    fMod = Math.abs(fGridEndLongitude % baseOffset);
    if (fMod > 0) {
      if (fGridEndLongitude > 0) {
        fGridEndLongitude += baseOffset - fMod;
      } else if (fGridEndLongitude < 0) {
        fGridEndLongitude += fMod;
      }
    }
    // 计算当前区域范围划分到网格的最小纬度
    fMod = Math.abs(fGridStartLatitude % baseOffset);
    if (fMod > 0) {
      if (fGridStartLatitude > 0) {
        fGridStartLatitude -= fMod;
      } else if (fGridStartLatitude < 0) {
        fGridStartLatitude += fMod - baseOffset;
      }
    }
    // 计算当前区域范围划分到网格的最大纬度
    fMod = Math.abs(fGridEndLatitude % baseOffset);
    if (fMod > 0) {
      if (fGridEndLatitude > 0) {
        fGridEndLatitude += baseOffset - fMod;
      } else if (fGridEndLatitude < 0) {
        fGridEndLatitude += fMod;
      }
    }
    let grids = [];
    let codes = [];
    // 生成网格面坐标
    const lonCount =
      Math.abs(fGridStartLongitude - fGridEndLongitude) / baseOffset + 1;
    const latCount =
      Math.abs(fGridStartLatitude - fGridEndLatitude) / baseOffset + 1;
    for (let i = 0; i < lonCount - 1; i++) {
      const lon_min = fGridStartLongitude + i * baseOffset;
      const lon_max = fGridStartLongitude + (i + 1) * baseOffset;
      const codeLon = lon_min + baseOffset / 2;
      for (let j = 0; j < latCount - 1; j++) {
        const lat_min = fGridStartLatitude + j * baseOffset;
        const lat_max = fGridStartLatitude + (j + 1) * baseOffset;
        const codeLat = lat_min + baseOffset / 2;
        grids.push([
          [lon_min, lat_min, 0],
          [lon_max, lat_min, 0],
          [lon_max, lat_max, 0],
          [lon_min, lat_max, 0]
        ]);
        const code = this.getCodes(codeLon, codeLat, level);
        codes.push({
          location: [codeLon, codeLat],
          code
        });
      }
    }
    return {
      grids,
      codes
    };
  }
  getCodes(longitude, latitude, level) {
    const letterArray = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "J",
      "K",
      "L",
      "M",
      "N",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
      "W",
      "X",
      "Y",
      "Z"
    ];
    // 度转分
    let lonOffset = (180.0 + longitude) * 60;
    let latOffset = (90.0 - latitude) * 60;
    // 30' 网格经度偏移, 单位: 分
    let code = Math.floor(lonOffset / 30) + 1;
    code = code.toString().padStart(3, "0");
    code += letterArray[Math.floor(latOffset / 30 / 24)];
    code += letterArray[Math.floor(latOffset / 30) % 24];

    if (level === GridLevelEnum.MINUTE_30) {
      return code;
    }

    lonOffset = lonOffset - Math.floor(lonOffset / 30) * 30;
    latOffset = latOffset - Math.floor(latOffset / 30) * 30;

    // 15' 网格经度偏移, 单位: 分
    code += Math.floor(lonOffset / 15) + 1 + Math.floor(latOffset / 15) * 2;
    if (level === GridLevelEnum.MINUTE_15) {
      return code;
    }

    lonOffset = lonOffset - Math.floor(lonOffset / 15) * 15;
    latOffset = latOffset - Math.floor(latOffset / 15) * 15;

    // 5' 网格经度偏移, 单位: 分
    code += Math.floor(lonOffset / 5) + 1 + Math.floor(latOffset / 5) * 3;
    if (level === GridLevelEnum.MINUTE_5) {
      return code;
    }

    lonOffset = lonOffset - Math.floor(lonOffset / 5) * 5;
    latOffset = latOffset - Math.floor(latOffset / 5) * 5;

    // 1' 网格经度偏移, 单位: 分
    code += (Math.floor(lonOffset) + 1 + Math.floor(latOffset) * 5)
      .toString()
      .padStart(2, "0");
    if (level === GridLevelEnum.MINUTE_1) {
      return code;
    }

    lonOffset = lonOffset - Math.floor(lonOffset);
    latOffset = latOffset - Math.floor(latOffset);

    // 30" 网格经度偏移, 单位: 秒
    code +=
      Math.floor(lonOffset / (30 / 60)) +
      1 +
      Math.floor(latOffset / (30 / 60)) * 2;
    if (level === GridLevelEnum.SECOND_30) {
      return code;
    }

    lonOffset = lonOffset - Math.floor(lonOffset / (30 / 60)) * (30 / 60);
    latOffset = latOffset - Math.floor(latOffset / (30 / 60)) * (30 / 60);

    // 15" 网格经度偏移, 单位: 秒
    code +=
      Math.floor(lonOffset / (15 / 60)) +
      1 +
      Math.floor(latOffset / (15 / 60)) * 2;
    if (level === GridLevelEnum.SECOND_15) {
      return code;
    }

    lonOffset = lonOffset - Math.floor(lonOffset / (15 / 60)) * (15 / 60);
    latOffset = latOffset - Math.floor(latOffset / (15 / 60)) * (15 / 60);

    // 5" 网格经度偏移, 单位: 秒
    code +=
      Math.floor(lonOffset / (5 / 60)) +
      1 +
      Math.floor(latOffset / (5 / 60)) * 3;
    if (level === GridLevelEnum.SECOND_5) {
      return code;
    }

    lonOffset = lonOffset - Math.floor(lonOffset / (5 / 60)) * (5 / 60);
    latOffset = latOffset - Math.floor(latOffset / (5 / 60)) * (5 / 60);

    // 1" 网格经度偏移, 单位: 秒
    code += (
      Math.floor(lonOffset / (1 / 60)) +
      1 +
      Math.floor(latOffset / (1 / 60)) * 5
    )
      .toString()
      .padStart(2, "0");
    if (level === GridLevelEnum.SECOND_1) {
      return code;
    }
    return code;
  }
  addGrids(data) {
    // console.log("加载网格数据", data);
    if (data.codeData) {
      data.codeData.forEach(list => {
        this.createLabel(list.location, list.code);
      });
    }
    if (data.gridsData) {
      data.gridsData.forEach((list, key) => {
        this.createPolyline(list);
      });
    }
  }
  createLabel(position, text) {
    this.gridLabels.add({
      position: Cesium.Cartesian3.fromDegrees(position[0], position[1], 0),
      text: text,
      font: "bold 20px sans-serif",
      fillColor: Cesium.Color.fromCssColorString(this.color),
      outlineColor: Cesium.Color.fromCssColorString("black"),
      outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.CENTER,
      scaleByDistance: new Cesium.NearFarScalar(
        0,
        2,
        gridLevelShowMaxHeight[this.level] / 2,
        0
      )
    });
  }
  createPolyline(coordinates) {
    const lineCoordinates = [...coordinates, coordinates[0]];
    this.gridLines.add({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(
        lineCoordinates.flat(Infinity)
      ),
      width: 1,
      material: new Cesium.Material({
        fabric: {
          type: "Color",
          uniforms: {
            color: Cesium.Color.fromCssColorString(this.color)
          }
        }
      })
    });
  }
}
export { LevelGridCesium };
