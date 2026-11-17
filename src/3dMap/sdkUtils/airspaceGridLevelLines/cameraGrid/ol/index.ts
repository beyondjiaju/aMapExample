import * as Cesium from "@/3dMap/sdk/cesium";
import * as ol from "@/3dMap/sdk/ol";
import { getHeight } from "@/3dMap/sdk/olUtils";
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
class LevelGridOl {
  olMap: any;
  listener: any;
  level: any;
  gridCodeVisible: any;
  gridLines: any;
  gridLabels: any;
  showPolygon: any;
  constructor(olMap, option = null) {
    const newOption = Object.assign(
      {
        level: null
      },
      option
    );
    this.olMap = olMap;
    this.level = newOption.level;
    this.gridCodeVisible = true;
    this.showPolygon = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.olMap.addLayer(this.showPolygon);
    this.gridLines = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.olMap.addLayer(this.gridLines);
    this.gridLabels = new ol.VectorLayer({
      source: new ol.VectorSource()
    });
    this.olMap.addLayer(this.gridLabels);
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
        this.showPolygon.getSource().clear();
      }
      this.gridLines.getSource().clear();
      this.gridLabels.getSource().clear();
      const currentLevelMaxHeight = gridLevelShowMaxHeight[that.level];
      const height = getHeight(this.olMap);
      if (height > currentLevelMaxHeight) {
        return;
      }
      // 计算边界
      const olView = this.olMap.getView();
      const extent = olView.calculateExtent(this.olMap.getSize());
      let rectangle = {
        minLon: extent[0],
        maxLon: extent[2],
        minLat: extent[1],
        maxLat: extent[3]
      };
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
      // const feature = new ol.Feature({
      //   geometry: new ol.geom.Polygon([coordinates])
      // });
      // feature.setStyle(new ol.style.Style({
      //   fill: new ol.style.Fill({ color: "#ff000050" }), // 半透明填充
      //   stroke: new ol.style.Stroke({ color: "#ff0000", width: 1 })
      // }));
      // this.showPolygon.getSource().addFeature(feature);
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
    this.olMap.addEventListener("moveend", this.listener);
  }
  /**停止展示 */
  stop() {
    if (this.listener) this.olMap.removeEventListener("moveend", this.listener);
    this.gridLines.getSource().clear();
    this.gridLabels.getSource().clear();
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
      gridLevelShowMaxHeight[this.level] / 2;
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
    const feature = new ol.Feature({
      geometry: new ol.geom.Point([position[0], position[1]])
    });
    feature.setStyle(
      new ol.style.Style({
        text: new ol.style.Text({
          text,
          font: "bold 20px sans-serif",
          fill: new ol.style.Fill({ color: "#ffffff" }),
          stroke: new ol.style.Stroke({ color: "#000000", width: 2 }),
          scale: (10 - this.level) / 10 < 0.5 ? 0.5 : (10 - this.level) / 10
        })
      })
    );
    this.gridLabels.getSource().addFeature(feature);
  }
  createPolyline(coordinates) {
    let lineCoordinates = [...coordinates, coordinates[0]];
    lineCoordinates.forEach(item => item.splice(2, 1));
    const feature = new ol.Feature({
      geometry: new ol.geom.LineString(coordinates)
    });
    feature.setStyle(
      new ol.style.Style({
        stroke: new ol.style.Stroke({ color: "#ffffff", width: 1 })
      })
    );
    this.gridLines.getSource().addFeature(feature);
  }
}
export { LevelGridOl };
