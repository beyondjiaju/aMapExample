import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
/**特殊形状坐标获取方法 */
class ShapeCoordinates {
  constructor() {}
  /**获取根据角度方向获取坐标
   * @param {Object} center cartesian3 || [lon,lat]
   * @param {Number} radius
   * @param {Number} angle
   * @param {String} type 返回坐标类型 默认cartesian  cartesian,degrees
   */
  getPositionByRadiusAngle(center, radius, angle, type) {
    if (!type) type = "catresian";
    let center_new = center;
    if (Array.isArray(center)) {
      center_new = Cesium.Cartesian3.fromDegrees(center[0], center[1]);
    }
    let position;
    const matrix = Cesium.Transforms.eastNorthUpToFixedFrame(center_new);
    const mz = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(angle));
    const rotationZ = Cesium.Matrix4.fromRotationTranslation(mz);
    Cesium.Matrix4.multiply(matrix, rotationZ, matrix);
    const result = Cesium.Matrix4.multiplyByPoint(
      matrix,
      new Cesium.Cartesian3(0, radius, 0),
      new Cesium.Cartesian3()
    );
    const cartographic = Cesium.Cartographic.fromCartesian(result);
    if (type == "catresian") {
      const cartesian3 = Cesium.Cartesian3.fromRadians(
        cartographic.longitude,
        cartographic.latitude,
        0
      );
      position = cartesian3;
    } else if (type == "degrees") {
      position = [
        Cesium.Math.toDegrees(cartographic.longitude),
        Cesium.Math.toDegrees(cartographic.latitude)
      ];
    }
    return position;
  }
  /**获取根据角度方向获取坐标
   * @param {Object} center cartesian3 || [lon,lat]
   * @param {Number} radius
   * @param {Number} angle
   * @param {String} type 返回坐标类型 默认cartesian  cartesian,degrees
   */
  getPositionByRadiusAngleTurf(center, radius, angle, type) {
    if (!type) type = "catresian";
    let center_new = center;
    if (!Array.isArray(center)) {
      const center_carto = Cesium.Cartographic.fromCartesian(center);
      center_new = [
        Cesium.Math.toDegrees(center_carto.longitude),
        Cesium.Math.toDegrees(center_carto.latitude)
      ];
    }
    const point = turf.point([center_new[0], center_new[1]]);
    const destination = turf.rhumbDestination(point, radius * 0.001, angle, {
      units: "miles"
    });
    const position = destination.geometry.coordinates;
    if (type == "catresian") {
      return Cesium.Cartesian3.fromDegrees(position[0], position[1]);
    } else if (type == "degrees") {
      return position;
    }
  }
  /**获取circle-line-positions
   * @param {Object} center cartesian3 || [lon,lat]
   * @param {Number} radius
   * @param {String} type 返回坐标类型 默认cartesian  cartesian,degrees
   */
  getCirclePositions(center, radius, type) {
    if (!type) type = "catresian";
    let center_new = center;
    if (Array.isArray(center)) {
      center_new = Cesium.Cartesian3.fromDegrees(center[0], center[1]);
    }
    const positions = [];
    for (let i = 0; i <= 360; i += 0.5) {
      const matrix = Cesium.Transforms.eastNorthUpToFixedFrame(center_new);
      const mz = Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(i));
      const rotationZ = Cesium.Matrix4.fromRotationTranslation(mz);
      Cesium.Matrix4.multiply(matrix, rotationZ, matrix);
      const result = Cesium.Matrix4.multiplyByPoint(
        matrix,
        new Cesium.Cartesian3(0, radius, 0),
        new Cesium.Cartesian3()
      );
      const cartographic = Cesium.Cartographic.fromCartesian(result);
      if (type == "catresian") {
        const cartesian3 = Cesium.Cartesian3.fromRadians(
          cartographic.longitude,
          cartographic.latitude,
          0
        );
        positions.push(cartesian3);
      } else if (type == "degrees") {
        positions.push([
          Cesium.Math.toDegrees(cartographic.longitude),
          Cesium.Math.toDegrees(cartographic.latitude)
        ]);
      }
    }
    return positions;
  }
  /**获取扇形positions
   * @param {Object} first 第一个坐标点 cartesian3  || [lon,lat]
   * @param {Object} second 第二个坐标点 cartesian3 || [lon,lat]
   * @param {Object} end 第三个坐标点 cartesian3 || [lon,lat]
   */
  getSectorPositions(first, second, end) {
    let first_new = first,
      second_new = second,
      end_new = end;
    if (Array.isArray(first)) {
      first_new = Cesium.Cartesian3.fromDegrees(first[0], first[1]);
    }
    if (Array.isArray(second)) {
      second_new = Cesium.Cartesian3.fromDegrees(second[0], second[1]);
    }
    if (Array.isArray(end)) {
      end_new = Cesium.Cartesian3.fromDegrees(end[0], end[1]);
    }
    // 坐标转换 获取degrees
    const first_cartographic = Cesium.Cartographic.fromCartesian(first_new),
      second_cartographic = Cesium.Cartographic.fromCartesian(second_new),
      end_cartographic = Cesium.Cartographic.fromCartesian(end_new),
      first_degrees = [
        Cesium.Math.toDegrees(first_cartographic.longitude),
        Cesium.Math.toDegrees(first_cartographic.latitude)
      ],
      second_degrees = [
        Cesium.Math.toDegrees(second_cartographic.longitude),
        Cesium.Math.toDegrees(second_cartographic.latitude)
      ],
      end_degrees = [
        Cesium.Math.toDegrees(end_cartographic.longitude),
        Cesium.Math.toDegrees(end_cartographic.latitude)
      ];
    // turf pint angle
    let point_first = turf.point(first_degrees),
      point_second = turf.point(second_degrees),
      point_end = turf.point(end_degrees),
      angle_first = turf.bearing(point_first, point_second),
      angle_second = turf.bearing(point_first, point_end);
    const radius = turf.distance(point_first, point_second, {
      units: "miles",
      steps: 360
    });
    const newPositions = [first_degrees];
    if (angle_first < 0) {
      angle_first = 360 + angle_first;
    }
    if (angle_second < 0) {
      angle_second = 360 + angle_second;
    }
    if (angle_second < angle_first) {
      angle_second = 360 + angle_second;
    }
    for (let angle = angle_first; angle <= angle_second; angle += 1) {
      const destination = turf.rhumbDestination(point_first, radius, angle, {
        units: "miles",
        steps: 360
      });
      newPositions.push(destination.geometry.coordinates);
    }
    newPositions.push(first_degrees);
    if (angle_first > 360) angle_first -= 360;
    if (angle_second > 360) angle_second -= 360;
    const ret = {
      positions: newPositions,
      radius: radius * 1000,
      startAngle: angle_first,
      endAngle: angle_second
    };
    return ret;
  }
  /**获取扇形positions
   * @param {Object} center 第一个坐标点 cartesian3 || [longitude, latitude]
   * @param {Number} radius
   * @param {Number} startAngle
   * @param {Number} endAngle
   */
  getSectorPositionsByRadius(option) {
    const that = this;
    const center = option.center,
      radius = option.radius,
      startAngle = option.startAngle,
      endAngle = option.endAngle;
    // 计算坐标
    let position;
    if (center instanceof Cesium.Cartesian3) {
      const center_carto = Cesium.Cartographic.fromCartesian(center);
      position = [
        Cesium.Math.toDegrees(center_carto.longitude),
        Cesium.Math.toDegrees(center_carto.latitude)
      ];
    } else {
      position = center;
    }
    const point = turf.point([position[0], position[1]]),
      turfOptions = {
        units: "miles",
        steps: 360
      };
    const angle = Math.abs(startAngle - endAngle);
    let coordinates;
    if (angle >= 360) {
      coordinates = turf.buffer(point, radius * 0.001, turfOptions);
    } else {
      coordinates = that.getBufferPositions(
        startAngle,
        endAngle,
        point,
        radius * 0.001,
        turfOptions
      );
    }
    return coordinates;
  }
  /**根据角度, 点, 半径获取坐标 */
  getBufferPositions(startAngle, endAngle, point, radius, options) {
    const newPositions = [];
    if (endAngle < startAngle) {
      endAngle += 360;
    }
    for (let i = startAngle; i <= endAngle; i += 1) {
      const destination = turf.rhumbDestination(point, radius, i, options);
      newPositions.push(destination.geometry.coordinates);
    }
    newPositions.push(point.geometry.coordinates);
    return newPositions;
  }
  /**获取扇形positions
   * @param {Object} first 第一个坐标点 cartesian3
   * @param {Object} second 第二个坐标点 cartesian3
   * @param {Object} end 第三个坐标点 cartesian3
   * @param {String} type 返回坐标类型 默认cartesian  cartesian,degrees
   */
  getSectorPositions_old(first, second, end, type) {
    if (!type) type = "catresian";
    let first_new = first,
      second_new = second,
      end_new = end;
    if (Array.isArray(first)) {
      first_new = Cesium.Cartesian3.fromDegrees(first[0], first[1]);
    }
    if (Array.isArray(second)) {
      second_new = Cesium.Cartesian3.fromDegrees(second[0], second[1]);
    }
    if (Array.isArray(end)) {
      end_new = Cesium.Cartesian3.fromDegrees(end[0], end[1]);
    }
    // 坐标转换 获取degrees
    const first_cartographic = Cesium.Cartographic.fromCartesian(first_new),
      second_cartographic = Cesium.Cartographic.fromCartesian(second_new),
      end_cartographic = Cesium.Cartographic.fromCartesian(end_new),
      first_degrees = [
        Cesium.Math.toDegrees(first_cartographic.longitude),
        Cesium.Math.toDegrees(first_cartographic.latitude)
      ],
      second_degrees = [
        Cesium.Math.toDegrees(second_cartographic.longitude),
        Cesium.Math.toDegrees(second_cartographic.latitude)
      ],
      end_degrees = [
        Cesium.Math.toDegrees(end_cartographic.longitude),
        Cesium.Math.toDegrees(end_cartographic.latitude)
      ];
    // turf pint angle
    let point_first = turf.point(first_degrees),
      point_second = turf.point(second_degrees),
      point_end = turf.point(end_degrees),
      angle_first = turf.bearing(point_first, point_second),
      angle_second = turf.bearing(point_first, point_end);
    const radius = turf.distance(point_first, point_second, {
      units: "miles",
      steps: 360
    });
    const newPositions = [first_degrees];
    if (angle_first < 0) {
      angle_first = 360 + angle_first;
    }
    if (angle_second < 0) {
      angle_second = 360 + angle_second;
    }
    if (angle_second < angle_first) {
      angle_second = 360 + angle_second;
    }
    for (let angle = angle_first; angle <= angle_second; angle += 1) {
      const destination = turf.rhumbDestination(point_first, radius, angle, {
        units: "miles",
        steps: 360
      });
      newPositions.push(destination.geometry.coordinates);
    }
    newPositions.push(first_degrees);
    let ret;
    if (type == "catresian") {
      ret = Cesium.Cartesian3.fromDegreesArray(newPositions.flat(Infinity));
    } else if (type == "degrees") {
      ret = newPositions;
    }
    return ret;
  }
  /**获取长圆positions
   * @param {Object} first 第一个坐标点 cartesian3
   * @param {Object} second 第二个坐标点 cartesian3
   * @param {Object} end 第三个坐标点 cartesian3
   */
  getRectangleCirclePositions(first, second, end) {
    let first_new = first,
      second_new = second,
      end_new = end;
    if (Array.isArray(first)) {
      first_new = Cesium.Cartesian3.fromDegrees(first[0], first[1]);
    }
    if (Array.isArray(second)) {
      second_new = Cesium.Cartesian3.fromDegrees(second[0], second[1]);
    }
    if (Array.isArray(end)) {
      end_new = Cesium.Cartesian3.fromDegrees(end[0], end[1]);
    }
    // 坐标转换 获取degrees
    const first_cartographic = Cesium.Cartographic.fromCartesian(first_new),
      second_cartographic = Cesium.Cartographic.fromCartesian(second_new),
      end_cartographic = Cesium.Cartographic.fromCartesian(end_new),
      first_degrees = [
        Cesium.Math.toDegrees(first_cartographic.longitude),
        Cesium.Math.toDegrees(first_cartographic.latitude)
      ],
      second_degrees = [
        Cesium.Math.toDegrees(second_cartographic.longitude),
        Cesium.Math.toDegrees(second_cartographic.latitude)
      ],
      end_degrees = [
        Cesium.Math.toDegrees(end_cartographic.longitude),
        Cesium.Math.toDegrees(end_cartographic.latitude)
      ];
    // turf pint angle
    const point_first = turf.point(first_degrees),
      point_second = turf.point(second_degrees),
      point_end = turf.point(end_degrees),
      angle_first = turf.bearing(point_first, point_second);
    const radius = turf.distance(point_second, point_end, {
      units: "miles",
      steps: 360
    });
    const angle_left = angle_first + 90;
    const angle_right = angle_first - 90;
    // 根据方向缓冲rectangle
    const point_first_offset_left = turf.rhumbDestination(
        point_first,
        radius,
        angle_left,
        {
          units: "miles",
          steps: 360
        }
      ),
      point_second_offset_left = turf.rhumbDestination(
        point_second,
        radius,
        angle_left,
        {
          units: "miles",
          steps: 360
        }
      ),
      first_degrees_offset_left = point_first_offset_left.geometry.coordinates,
      second_degrees_offset_left =
        point_second_offset_left.geometry.coordinates,
      point_first_offset_right = turf.rhumbDestination(
        point_first,
        radius,
        angle_right,
        {
          units: "miles",
          steps: 360
        }
      ),
      point_second_offset_right = turf.rhumbDestination(
        point_second,
        radius,
        angle_right,
        {
          units: "miles",
          steps: 360
        }
      ),
      first_degrees_offset_right =
        point_first_offset_right.geometry.coordinates,
      second_degrees_offset_right =
        point_second_offset_right.geometry.coordinates;
    const rectangle = [
      [
        first_degrees_offset_left,
        second_degrees_offset_left,
        second_degrees_offset_right,
        first_degrees_offset_right,
        first_degrees_offset_left
      ]
    ];
    // 计算圆中心点及两侧圆polygon
    const first_circle = turf.buffer(point_first, radius, {
        units: "miles",
        steps: 360
      }),
      second_circle = turf.buffer(point_second, radius, {
        units: "miles",
        steps: 360
      }),
      first_circle_coordinates = first_circle.geometry.coordinates,
      second_circle_coordinates = second_circle.geometry.coordinates;
    first_circle_coordinates[0].push(first_circle_coordinates[0][0]);
    second_circle_coordinates[0].push(second_circle_coordinates[0][0]);
    // 合并
    const polygon1 = turf.polygon(rectangle),
      polygon2 = turf.polygon(first_circle_coordinates),
      polygon3 = turf.polygon(second_circle_coordinates);
    const union1 = turf.union(polygon1, polygon2),
      union2 = turf.union(union1, polygon3);
    const ret = {
      positions: union2.geometry.coordinates[0],
      radius: radius * 1000
    };
    return ret;
  }
  /**获取长圆positions
   * @param {Object} first 第一个坐标点 cartesian3 || [longitude, latitude]
   * @param {Object} second 第二个坐标点 cartesian3 || [longitude, latitude]
   * @param {Number} radius 半径
   */
  getRectangleCirclePositionsByRadius(option) {
    const first = option.first,
      second = option.second,
      radius = option.radius * 0.001;
    // 坐标转换 获取degrees
    let first_degrees, second_degrees;
    if (first instanceof Cesium.Cartesian3) {
      const first_cartographic = Cesium.Cartographic.fromCartesian(first);
      first_degrees = [
        Cesium.Math.toDegrees(first_cartographic.longitude),
        Cesium.Math.toDegrees(first_cartographic.latitude)
      ];
    } else {
      first_degrees = first;
    }
    if (second instanceof Cesium.Cartesian3) {
      const second_cartographic = Cesium.Cartographic.fromCartesian(second);
      second_degrees = [
        Cesium.Math.toDegrees(second_cartographic.longitude),
        Cesium.Math.toDegrees(second_cartographic.latitude)
      ];
    } else {
      second_degrees = second;
    }
    // turf pint angle
    const point_first = turf.point(first_degrees),
      point_second = turf.point(second_degrees),
      angle_first = turf.bearing(point_first, point_second);
    const angle_left = angle_first + 90;
    const angle_right = angle_first - 90;
    // 根据方向缓冲rectangle
    const point_first_offset_left = turf.rhumbDestination(
        point_first,
        radius,
        angle_left,
        {
          units: "miles",
          steps: 360
        }
      ),
      point_second_offset_left = turf.rhumbDestination(
        point_second,
        radius,
        angle_left,
        {
          units: "miles",
          steps: 360
        }
      ),
      first_degrees_offset_left = point_first_offset_left.geometry.coordinates,
      second_degrees_offset_left =
        point_second_offset_left.geometry.coordinates,
      point_first_offset_right = turf.rhumbDestination(
        point_first,
        radius,
        angle_right,
        {
          units: "miles",
          steps: 360
        }
      ),
      point_second_offset_right = turf.rhumbDestination(
        point_second,
        radius,
        angle_right,
        {
          units: "miles",
          steps: 360
        }
      ),
      first_degrees_offset_right =
        point_first_offset_right.geometry.coordinates,
      second_degrees_offset_right =
        point_second_offset_right.geometry.coordinates;
    const rectangle = [
      [
        first_degrees_offset_left,
        second_degrees_offset_left,
        second_degrees_offset_right,
        first_degrees_offset_right,
        first_degrees_offset_left
      ]
    ];
    // 计算圆中心点及两侧圆polygon
    const first_circle = turf.buffer(point_first, radius, {
        units: "miles",
        steps: 360
      }),
      second_circle = turf.buffer(point_second, radius, {
        units: "miles",
        steps: 360
      }),
      first_circle_coordinates = first_circle.geometry.coordinates,
      second_circle_coordinates = second_circle.geometry.coordinates;
    first_circle_coordinates[0].push(first_circle_coordinates[0][0]);
    second_circle_coordinates[0].push(second_circle_coordinates[0][0]);
    // 合并
    const polygon1 = turf.polygon(rectangle),
      polygon2 = turf.polygon(first_circle_coordinates),
      polygon3 = turf.polygon(second_circle_coordinates);
    const union1 = turf.union(polygon1, polygon2),
      union2 = turf.union(union1, polygon3);
    return union2.geometry.coordinates[0];
  }
  /**获取长圆positions
   * @param {Object} first 第一个坐标点 cartesian3
   * @param {Object} second 第二个坐标点 cartesian3
   * @param {Object} end 第三个坐标点 cartesian3
   * @param {String} type 返回坐标类型 默认cartesian  cartesian,degrees
   */
  getRectangleCirclePositions_old(first, second, end, type) {
    if (!type) type = "catresian";
    let first_new = first,
      second_new = second,
      end_new = end;
    if (Array.isArray(first)) {
      first_new = Cesium.Cartesian3.fromDegrees(first[0], first[1]);
    }
    if (Array.isArray(second)) {
      second_new = Cesium.Cartesian3.fromDegrees(second[0], second[1]);
    }
    if (Array.isArray(end)) {
      end_new = Cesium.Cartesian3.fromDegrees(end[0], end[1]);
    }
    // 坐标转换 获取degrees
    const first_cartographic = Cesium.Cartographic.fromCartesian(first_new),
      second_cartographic = Cesium.Cartographic.fromCartesian(second_new),
      end_cartographic = Cesium.Cartographic.fromCartesian(end_new),
      first_degrees = [
        Cesium.Math.toDegrees(first_cartographic.longitude),
        Cesium.Math.toDegrees(first_cartographic.latitude)
      ],
      second_degrees = [
        Cesium.Math.toDegrees(second_cartographic.longitude),
        Cesium.Math.toDegrees(second_cartographic.latitude)
      ],
      end_degrees = [
        Cesium.Math.toDegrees(end_cartographic.longitude),
        Cesium.Math.toDegrees(end_cartographic.latitude)
      ];
    // turf pint angle
    let point_first = turf.point(first_degrees),
      point_second = turf.point(second_degrees),
      point_end = turf.point(end_degrees),
      angle_first = turf.bearing(point_first, point_second),
      angle_second = turf.bearing(point_second, point_end),
      angle;
    const radius = turf.distance(point_second, point_end, {
      units: "miles",
      steps: 360
    });
    if (angle_first < 0) {
      angle_first = 360 + angle_first;
    }
    if (angle_second < 0) {
      angle_second = 360 + angle_second;
    }
    // 计算方向
    if (angle_second >= angle_first && angle_second <= angle_first + 180) {
      angle = angle_first + 90;
    } else {
      angle = angle_first - 90;
    }
    // 根据方向缓冲rectangle
    const point_first_offset = turf.rhumbDestination(
        point_first,
        radius,
        angle,
        {
          units: "miles",
          steps: 360
        }
      ),
      point_second_offset = turf.rhumbDestination(point_second, radius, angle, {
        units: "miles",
        steps: 360
      }),
      first_degrees_offset = point_first_offset.geometry.coordinates,
      second_degrees_offset = point_second_offset.geometry.coordinates;
    const rectangle = [
      [
        first_degrees,
        second_degrees,
        second_degrees_offset,
        first_degrees_offset,
        first_degrees
      ]
    ];
    // 计算圆中心点及两侧圆polygon
    const first_center = turf.midpoint(point_first, point_first_offset),
      second_center = turf.midpoint(point_second, point_second_offset),
      first_circle = turf.buffer(first_center, radius / 2, {
        units: "miles",
        steps: 360
      }),
      second_circle = turf.buffer(second_center, radius / 2, {
        units: "miles",
        steps: 360
      }),
      first_circle_coordinates = first_circle.geometry.coordinates,
      second_circle_coordinates = second_circle.geometry.coordinates;
    first_circle_coordinates[0].push(first_circle_coordinates[0][0]);
    second_circle_coordinates[0].push(second_circle_coordinates[0][0]);
    // 合并
    const polygon1 = turf.polygon(rectangle),
      polygon2 = turf.polygon(first_circle_coordinates),
      polygon3 = turf.polygon(second_circle_coordinates);
    const union1 = turf.union(polygon1, polygon2),
      union2 = turf.union(union1, polygon3);
    let ret;
    if (type == "catresian") {
      ret = Cesium.Cartesian3.fromDegreesArray(
        union2.geometry.coordinates.flat(Infinity)
      );
    } else if (type == "degrees") {
      ret = union2.geometry.coordinates;
    }
    return ret;
  }
}
const shapeCoordinates = new ShapeCoordinates();
export { shapeCoordinates };
