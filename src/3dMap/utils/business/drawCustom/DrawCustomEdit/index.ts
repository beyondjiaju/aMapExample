import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer, olMap } from "@/3dMap/global";
import {
  coordinateConversionTool,
  DrawHandlerEdit as DrawHandlerEditCesium
} from "@/3dMap/sdk/cesiumUtils";
import { DrawHandlerEdit as DrawHandlerEditOl } from "@/3dMap/sdk/olUtils";
import { mapEmitter } from "@/3dMap/interface";
import mapData from "@/3dMap/store/map";
/**监听 */
class DrawCustomEdit {
  newDrawHandlerEditByMode: any;
  editData: any;
  mapEmitterOff: any;
  constructor(
    option = {
      endCallback: null
    }
  ) {
    const { endCallback, ...other } = option;
    const newOption = Object.assign(
      {
        color: "#ffff00",
        alpha: 0.5,
        outlineColor: "#FFA500",
        entireMove: false
      },
      {
        ...other
      }
    );
    this.setDrawHandlerEditByMode(newOption, endCallback);
    // 2\3d切换更新
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeDrawCustomEditUpdata",
      () => {
        this.newDrawHandlerEditByMode?.clear();
        this.newDrawHandlerEditByMode = null;
        this.setDrawHandlerEditByMode(newOption, endCallback);
        if (!this.editData) return;
        this.start(this.editData);
      }
    );
  }
  setDrawHandlerEditByMode(option, endCallback = null) {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium") {
      this.newDrawHandlerEditByMode = new DrawHandlerEditCesium(viewer, option);
    }
    if (mapMode === "ol") {
      this.newDrawHandlerEditByMode = new DrawHandlerEditOl(olMap, option);
    }
    // 修改实时监听回调
    this.newDrawHandlerEditByMode?.end.addEventListener((result, editInfo) => {
      const editEndOption = this.getShowData(result);
      const editEndOptionNew = this.setDegreesString(editEndOption);
      this.editData = editEndOptionNew;
      if (endCallback) endCallback(this.editData, editInfo);
    });
  }
  start(data) {
    const mapMode = mapData().mapMode;
    this.newDrawHandlerEditByMode?.clear();
    this.editData = data;
    if (!data) return;
    const editOption = this.getEditData(data);
    if (!editOption) return;
    this.newDrawHandlerEditByMode?.start(editOption);
  }
  stop() {
    this.newDrawHandlerEditByMode?.clear();
    this.editData = null;
  }
  /**获取修改option */
  getEditData(option) {
    if (["polyline", "polygon", "rectangle"].indexOf(option.type) >= 0) {
      let newCoordinates = [];
      option.coordinates.forEach(val => {
        if (val[0] && val[1]) {
          newCoordinates.push([val[0], val[1], 0]);
        }
      });
      let number = 3;
      if (option.type == "polyline") number = 2;
      if (newCoordinates.length >= number) {
        return {
          type: option.type,
          coordinates: newCoordinates
        };
      } else {
        return null;
      }
    }
    if (option.type == "point") {
      if (!option.coordinate[0] && !option.coordinate[1]) return null;
      return {
        type: option.type,
        longitude: option.coordinate[0],
        latitude: option.coordinate[1]
      };
    }
    if (option.type == "label") {
      if (!option.coordinate[0] && !option.coordinate[1]) return null;
      return {
        type: option.type,
        longitude: option.coordinate[0],
        latitude: option.coordinate[1],
        text: option.text
      };
    }
    if (option.type == "circle") {
      if (!option.center[0] && !option.center[1]) return null;
      return {
        type: option.type,
        longitude: option.center[0],
        latitude: option.center[1],
        radius: option.radius
      };
    }
    if (option.type == "sector") {
      if (!option.points.first[0] && !option.points.first[1]) return null;
      return {
        type: option.type,
        longitude: option.points.first[0],
        latitude: option.points.first[1],
        radius: option.radius,
        startAngle: option.startAngle,
        endAngle: option.endAngle
      };
    }
    if (option.type == "rectangleCircle") {
      if (
        (!option.points.first[0] && !option.points.first[1]) ||
        (!option.points.second[0] && !option.points.second[1])
      ) {
        return null;
      }
      return {
        type: option.type,
        longitude: option.points.first[0],
        latitude: option.points.first[1],
        radius: option.radius,
        longitude_second: option.points.second[0],
        latitude_second: option.points.second[1]
      };
    }
  }
  /**获取展示option */
  getShowData(option) {
    if (["point", "label"].indexOf(option.type) >= 0) {
      return {
        type: option.type,
        coordinate: [option.longitude, option.latitude],
        text: option.text || ""
      };
    }
    if (["polyline", "polygon", "rectangle"].indexOf(option.type) >= 0) {
      let newCoordinates = [];
      option.coordinates.forEach(val => {
        newCoordinates.push([val[0], val[1]]);
      });
      return {
        type: option.type,
        coordinates: newCoordinates
      };
    }
    if (option.type == "circle") {
      return {
        type: option.type,
        center: [option.longitude, option.latitude],
        radius: option.radius
      };
    }
    if (option.type == "sector") {
      let first;
      let second;
      let end;
      if (option.firstPoint instanceof Cesium.Cartesian3) {
        const first_carto = Cesium.Cartographic.fromCartesian(
          option.firstPoint
        );
        first = [
          Cesium.Math.toDegrees(first_carto.longitude),
          Cesium.Math.toDegrees(first_carto.latitude)
        ];
      } else {
        first = option.firstPoint;
      }
      if (option.secondPoint instanceof Cesium.Cartesian3) {
        const second_carto = Cesium.Cartographic.fromCartesian(
          option.secondPoint
        );
        second = [
          Cesium.Math.toDegrees(second_carto.longitude),
          Cesium.Math.toDegrees(second_carto.latitude)
        ];
      } else {
        second = option.secondPoint;
      }
      if (option.endPoint instanceof Cesium.Cartesian3) {
        const end_carto = Cesium.Cartographic.fromCartesian(option.endPoint);
        end = [
          Cesium.Math.toDegrees(end_carto.longitude),
          Cesium.Math.toDegrees(end_carto.latitude)
        ];
      } else {
        end = option.endPoint;
      }
      return {
        type: option.type,
        points: {
          first,
          second,
          end
        },
        radius: option.radius,
        startAngle: option.startAngle,
        endAngle: option.endAngle
      };
    }
    if (option.type == "rectangleCircle") {
      let first;
      let second;
      let end;
      if (option.firstPoint instanceof Cesium.Cartesian3) {
        const first_carto = Cesium.Cartographic.fromCartesian(
          option.firstPoint
        );
        first = [
          Cesium.Math.toDegrees(first_carto.longitude),
          Cesium.Math.toDegrees(first_carto.latitude)
        ];
      } else {
        first = option.firstPoint;
      }
      if (option.secondPoint instanceof Cesium.Cartesian3) {
        const second_carto = Cesium.Cartographic.fromCartesian(
          option.secondPoint
        );
        second = [
          Cesium.Math.toDegrees(second_carto.longitude),
          Cesium.Math.toDegrees(second_carto.latitude)
        ];
      } else {
        second = option.secondPoint;
      }
      if (option.endPoint instanceof Cesium.Cartesian3) {
        const end_carto = Cesium.Cartographic.fromCartesian(option.endPoint);
        end = [
          Cesium.Math.toDegrees(end_carto.longitude),
          Cesium.Math.toDegrees(end_carto.latitude)
        ];
      } else {
        end = option.endPoint;
      }
      return {
        type: option.type,
        points: {
          first,
          second,
          end
        },
        radius: option.radius
      };
    }
  }
  /**设置坐标字符串 */
  setDegreesString(option) {
    let properties = option;
    // coordinate
    if (properties.coordinate) {
      properties.coordinateDMS = this.getDegreesString(
        properties.coordinate[0],
        properties.coordinate[1]
      );
    }
    // center
    if (properties.center) {
      properties.centerDMS = this.getDegreesString(
        properties.center[0],
        properties.center[1]
      );
    }
    // coordinates
    if (properties.coordinates) {
      properties.coordinatesDMS = [];
      properties.coordinates.forEach(coordinate => {
        const coordinateDMS = this.getDegreesString(
          coordinate[0],
          coordinate[1]
        );
        properties.coordinatesDMS.push(coordinateDMS);
      });
    }
    // points
    if (properties.points) {
      properties.pointsDMS = {};
      for (let [key, value] of Object.entries(properties.points)) {
        properties.pointsDMS[key] = this.getDegreesString(value[0], value[1]);
      }
    }
    return properties;
  }
  /**获取坐标字符串 */
  getDegreesString(lon, lat) {
    return coordinateConversionTool.degreesToDegrees60(lon, lat, true);
  }
  destroy() {
    this.stop();
    this.newDrawHandlerEditByMode = null;
    this.mapEmitterOff();
    this.mapEmitterOff = null;
  }
}
export { DrawCustomEdit };
