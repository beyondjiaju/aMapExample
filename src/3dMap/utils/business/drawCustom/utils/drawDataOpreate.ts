import {
  coordinateConversionTool,
  shapeCoordinates
} from "@/3dMap/sdk/cesiumUtils";
import { cloneDeep } from "@/3dMap/interface";
/**获取保存数据 */
export const getDrawCustomSaveDataByDraw = shap => {
  const shapeType = shap.type.toLocaleUpperCase();
  let option = {
    shapeType
  };
  let addOption;
  if (["point"].indexOf(shap.type) >= 0) {
    addOption = Object.assign(option, {
      location: JSON.stringify([shap.coordinate[0], shap.coordinate[1]])
    });
  }
  if (["label"].indexOf(shap.type) >= 0) {
    addOption = Object.assign(option, {
      location: JSON.stringify([shap.coordinate[0], shap.coordinate[1]]),
      name: shap.text
    });
  }
  if (["polyline", "polygon", "rectangle"].indexOf(shap.type) >= 0) {
    addOption = Object.assign(option, {
      location: JSON.stringify(shap.coordinates),
      shapeType: shap.type == "rectangle" ? "POLYGON" : option.shapeType
    });
  }
  if (["circle"].indexOf(shap.type) >= 0) {
    const geometry = {
      center: shap.center,
      radius: shap.radius
    };
    addOption = Object.assign(option, {
      geometry: JSON.stringify(geometry)
    });
  }
  if (["sector"].indexOf(shap.type) >= 0) {
    const geometry = {
      center: shap.points.first,
      radius: shap.radius,
      startAngle: shap.startAngle,
      endAngle: shap.endAngle
    };
    addOption = Object.assign(option, {
      geometry: JSON.stringify(geometry)
    });
  }
  if (["rectangleCircle"].indexOf(shap.type) >= 0) {
    const geometry = {
      first: shap.points.first,
      second: shap.points.second,
      radius: shap.radius
    };
    addOption = Object.assign(option, {
      shapeType: "LONG_CIRCLE",
      geometry: JSON.stringify(geometry)
    });
  }
  return addOption;
};
/**获取回显数据 */
export const getDrawCustomFeedBackDataBySave = data => {
  let shapeType = data.shapeType.toLocaleLowerCase();
  const type = shapeType == "long_circle" ? "rectangleCircle" : shapeType;
  const geometry = data.geometry ? JSON.parse(data.geometry) : {};
  let shapeOption;
  if (type == "circle") {
    shapeOption = geometry;
  }
  if (type == "sector") {
    const { center, ...other } = geometry;
    shapeOption = {
      ...other,
      points: {
        first: center
      }
    };
  }
  if (type == "rectangleCircle") {
    const { first, second, ...other } = geometry;
    shapeOption = {
      ...other,
      points: {
        first,
        second
      }
    };
  }
  let coordinates = null;
  if (data.location) {
    coordinates =
      data.location instanceof Array
        ? data.location
        : JSON.parse(data.location);
  }
  return Object.assign(
    {
      id: data.id || null,
      type,
      coordinates,
      coordinate: coordinates ? coordinates[0] : null
    },
    shapeOption
  );
};
/**获取编辑数据 */
const getDegreesString = (lon, lat) => {
  return coordinateConversionTool.degreesToDegrees60(lon, lat, true);
};
export const getDrawCustomEditDataBySave = saveData => {
  let data = cloneDeep(saveData);
  let shapeType = data.shapeType.toLocaleLowerCase();
  const type = shapeType == "long_circle" ? "rectangleCircle" : shapeType;
  // 默认option
  let defaultOption = {};
  defaultOption.id = data.id || null;
  defaultOption.type = type;
  // location
  if (data.location && data.location.length != 0) {
    if (!(data.location instanceof Array)) {
      data.location = JSON.parse(data.location);
    }
    if (["point", "label"].indexOf(type) >= 0) {
      defaultOption.coordinate = data.location[0];
      if (type == "label") {
        defaultOption.text = data.name;
      }
    } else {
      defaultOption.coordinates = data.location;
    }
  }
  const geometry = data.geometry ? JSON.parse(data.geometry) : {};
  let shapeOption;
  if (type == "circle") {
    shapeOption = geometry;
    const end = shapeCoordinates.getPositionByRadiusAngle(
      geometry.center,
      shapeOption.radius,
      0,
      "degrees"
    );
    shapeOption.points = {
      start: geometry.center,
      end
    };
    shapeOption.coordinates = shapeCoordinates.getCirclePositions(
      shapeOption.points.start,
      shapeOption.radius,
      "degrees"
    );
  }
  if (type == "sector") {
    const { center, ...other } = geometry;
    const second = shapeCoordinates.getPositionByRadiusAngle(
      geometry.center,
      geometry.radius,
      geometry.startAngle,
      "degrees"
    );
    const end = shapeCoordinates.getPositionByRadiusAngle(
      geometry.center,
      geometry.radius,
      geometry.endAngle,
      "degrees"
    );
    shapeOption = {
      ...other,
      points: {
        first: center,
        second,
        end
      }
    };
    shapeOption.coordinates = shapeCoordinates.getSectorPositionsByRadius({
      center,
      radius: geometry.radius,
      startAngle: geometry.startAngle,
      endAngle: geometry.endAngle
    });
  }
  if (type == "rectangleCircle") {
    const { first, second, ...other } = geometry;
    shapeOption = {
      ...other,
      points: {
        first,
        second
      }
    };
    shapeOption.coordinates =
      shapeCoordinates.getRectangleCirclePositionsByRadius({
        first,
        second,
        radius: geometry.radius
      });
  }
  let ret = Object.assign(defaultOption, shapeOption);
  if (ret.coordinate) {
    ret.coordinateDMS = getDegreesString(ret.coordinate[0], ret.coordinate[1]);
  }
  if (ret.coordinates) {
    let coordinatesDMS = [];
    data.location?.forEach(coordinate => {
      const coordinateDMS = getDegreesString(coordinate[0], coordinate[1]);
      coordinatesDMS.push(coordinateDMS);
    });
    ret.coordinatesDMS = coordinatesDMS;
  }
  if (ret.center) {
    ret.centerDMS = getDegreesString(geometry.center[0], geometry.center[1]);
  }
  if (ret.points) {
    ret.pointsDMS = {};
    for (let key in ret.points) {
      ret.pointsDMS[key] = getDegreesString(
        ret.points[key][0],
        ret.points[key][1]
      );
    }
  }
  return ret;
};
