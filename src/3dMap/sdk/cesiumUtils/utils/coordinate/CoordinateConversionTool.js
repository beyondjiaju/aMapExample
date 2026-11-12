import * as Cesium from "@/3dMap/sdk/cesium";
/**创建CoordinateConversionTool 坐标转换工具
 */
class CoordinateConversionTool {
  /**
   * 初始化CoordinateConversionTool
   */
  constructor() {
    const that = this;
    that.ONE_HUNDRED_AND_EIGHTY = 180.0;
    that.THREE_HUNDRED_AND_SIXTY = 360.0;
    that.SECOND_PRECISION_COMPARE_VALUE = 0.000000001;
    that.PI = 3.14159265358979323846;
    that.TWO_PI = 6.28318530717958647692;
    that.DOUBLE_COMPARE_VALUE = 0.000000000000001;
    that.AngleCoordinate = {
      // 度
      degree: 0,
      // 分
      minute: 0,
      // 秒
      second: 0.0,
      // 符号
      isPositiveSign: true,
      // 角度坐标值是否合法
      isValid(maxDegree) {
        if (this.degree == maxDegree) {
          if (
            this.minute > 0 ||
            this.second >= this.SECOND_PRECISION_COMPARE_VALUE
          ) {
            return false;
          }
        }
        return (
          this.degree >= 0 &&
          (this.degree <= maxDegree) & (this.minute >= 0) &&
          this.minute < 60 &&
          this.second >= 0.0 &&
          this.second < 60.0
        );
      }
    };
  }
  /**度分秒转经纬度
   * @param position 例："N383200.000E1165330.000" 23位; "N290141E1133105" 15位
   */
  degrees60ToDegrees(position) {
    const point = {
      latitude: null,
      longitude: null
    };
    if (position) {
      const positionStrSize = position.length;
      if (positionStrSize == 23) {
        const longCoordinate = Object.create(this.AngleCoordinate);
        const latCoordinate = Object.create(this.AngleCoordinate);
        //判断输入字符是否正确
        for (let i = 0; i < positionStrSize; ++i) {
          if (i == 0) {
            if (position[i] != "N" && position[i] != "S") {
              return point;
            }
          } else if (i == 11) {
            if (position[i] != "E" && position[i] != "W") {
              return point;
            }
          } else if (i == 7 || i == 19) {
            if (position[i] != ".") {
              return point;
            }
          } else {
            if (position[i] < "0" || position[i] > "9") {
              return point;
            }
          }
        }
        //维度
        const latType = position[0];
        //度
        const latDegree = parseInt(position[1] + "" + position[2]);
        const latDegreeStr = latDegree < 10 ? "0" + latDegree : "" + latDegree;
        //分
        const latMinute = parseInt(position[3] + "" + position[4]);
        const latMinuteStr = latMinute < 10 ? "0" + latMinute : "" + latMinute;
        //秒
        const latSecond = parseInt(position[5] + "" + position[6]);
        const latSecondStr = latSecond < 10 ? "0" + latSecond : "" + latSecond;
        //毫秒
        const latMillSecond =
          position[8] + "" + position[9] + "" + position[10];
        //经度
        const longType = position[11];
        //度
        const longDegree = parseInt(
          position[12] + "" + position[13] + "" + position[14]
        );
        const longDegreeStr =
          longDegree < 10
            ? "00" + longDegree
            : longDegree < 100
            ? "0" + longDegree
            : "" + longDegree;
        //分
        const longMinute = parseInt(position[15] + "" + position[16]);
        const longMinuteStr =
          longMinute < 10 ? "0" + longMinute : "" + longMinute;
        //秒
        const longSecond = parseInt(position[17] + "" + position[18]);
        const longSecondStr =
          longSecond < 10 ? "0" + longSecond : "" + longSecond;
        //毫秒
        const longMillSecond =
          position[20] + "" + position[21] + "" + position[22];
        // let fPosition = String.format("%c%2s%2s%2s.%3s%c%3s%2s%2s.%3s", latType, latDegreeStr, latMinuteStr, latSecondStr, latMillSecond, longType, longDegreeStr, longMinuteStr, longSecondStr, longMillSecond);
        const latTypeStr = latType;
        let fPosition = `${latTypeStr.padEnd(1)}${latDegreeStr.padStart(
          2
        )}${latMinuteStr.padStart(2)}${latSecondStr.padStart(
          2
        )}.${latMillSecond.padStart(3)}${longType.padEnd(
          1
        )}${longDegreeStr.padStart(3)}${longMinuteStr.padStart(
          2
        )}${longSecondStr.padStart(2)}.${longMillSecond.padStart(3)}`;
        fPosition = `${latType}${latDegreeStr.padStart(
          2
        )}${latMinuteStr.padStart(2)}${latSecondStr.padStart(
          2
        )}.${latMillSecond.padStart(3)}${longType}${longDegreeStr.padStart(
          3
        )}${longMinuteStr.padStart(2)}${longSecondStr.padStart(
          2
        )}.${longMillSecond.padStart(3)}`;
        if (fPosition != position) {
          return point;
        }
        if (latType != "N" && latType != "S") {
          return point;
        }
        if (longType != "E" && longType != "W") {
          return point;
        }
        const isEast = longType != "W";
        const isNorth = latType != "S";
        longCoordinate.degree = longDegree;
        longCoordinate.minute = longMinute;
        longCoordinate.second =
          longSecond + parseFloat(longMillSecond) / 1000.0;
        longCoordinate.isPositiveSign = isEast;
        latCoordinate.degree = latDegree;
        latCoordinate.minute = latMinute;
        latCoordinate.second = latSecond + parseFloat(latMillSecond) / 1000.0;
        latCoordinate.isPositiveSign = isNorth;
        let latitude;
        let longitude;
        if (longCoordinate.isValid(180) && latCoordinate.isValid(90)) {
          longitude =
            (longCoordinate.second / 60.0 + longCoordinate.minute) / 60.0 +
            longCoordinate.degree;
          latitude =
            (latCoordinate.second / 60.0 + latCoordinate.minute) / 60.0 +
            latCoordinate.degree;
          if (!longCoordinate.isPositiveSign) {
            longitude *= -1.0;
          }
          point.longitude = longitude;
          if (!latCoordinate.isPositiveSign) {
            latitude *= -1.0;
          }
          point.latitude = latitude;
        }
      } else if (positionStrSize >= 15) {
        const coordinateList = this.verify(position);
        const latDms = coordinateList[0];
        const lonDms = coordinateList[1];
        if (lonDms && latDms) {
          // 度2位、分2位、秒（可能含小数）
          const dLat = parseFloat(latDms.substring(0, 2));
          const mLat = parseFloat(latDms.substring(2, 4));
          const sLat =
            position.length == 15
              ? latDms.substring(4, 6)
              : latDms.substring(4);
          const latitude = dLat + mLat / 60 + parseFloat(sLat) / 3600;
          // 解析失败（如秒为空）时避免出现 NaN
          point.latitude = isNaN(latitude) ? null : latitude;

          // 经度3位、分2位、秒（可能含小数）
          const dLon = parseFloat(lonDms.substring(0, 3));
          const mLon = parseFloat(lonDms.substring(3, 5));
          const sLon =
            position.length == 15
              ? lonDms.substring(5, 7)
              : lonDms.substring(5);
          const longitude = dLon + mLon / 60 + parseFloat(sLon) / 3600;
          point.longitude = isNaN(longitude) ? null : longitude;
        }
      }
    }
    return point;
  }
  /**degreesToDegrees60方法object数据格式化处理 */
  degrees60ObjectFormat(option) {
    let newOption = Object.assign({}, option);
    // if (newOption.latDegree > 0) {
    //   newOption.latType = "N";
    // } else {
    //   newOption.latType = "S";
    // }
    // if (newOption.longDegree > 0) {
    //   newOption.longType = "E";
    // } else {
    //   newOption.longType = "W";
    // }
    const keys = [
      "longDegree",
      "longMinute",
      "longSecond",
      "latDegree",
      "latMinute",
      "latSecond"
    ];
    for (let key in newOption) {
      if (keys.includes(keys)) {
        newOption[key] = Number(newOption[key]);
      }
    }
    newOption.latDegree =
      newOption.latDegree < 10
        ? "0" + newOption.latDegree
        : "" + newOption.latDegree;
    newOption.latMinute =
      newOption.latMinute < 10
        ? "0" + newOption.latMinute
        : "" + newOption.latMinute;
    newOption.latSecond =
      newOption.latSecond < 10
        ? "0" + newOption.latSecond
        : "" + newOption.latSecond;
    newOption.longDegree =
      newOption.longDegree < 10
        ? "00" + newOption.longDegree
        : newOption.longDegree < 100
        ? "0" + newOption.longDegree
        : "" + newOption.longDegree;
    newOption.longMinute =
      newOption.longMinute < 10
        ? "0" + newOption.longMinute
        : "" + newOption.longMinute;
    newOption.longSecond =
      newOption.longSecond < 10
        ? "0" + newOption.longSecond
        : "" + newOption.longSecond;
    if (newOption.latSecond.toString().indexOf(".") < 0) {
      newOption.latSecond += ".000";
    }
    if (newOption.longSecond.toString().indexOf(".") < 0) {
      newOption.longSecond += ".000";
    }
    newOption.longString = `${newOption.longType}${newOption.longDegree}${newOption.longMinute}${newOption.longSecond}`;
    newOption.latString = `${newOption.latType}${newOption.latDegree}${newOption.latMinute}${newOption.latSecond}`;
    newOption.showLongString = `${newOption.longType}${newOption.longDegree}°${newOption.longMinute}′${option.longSecond}″`;
    newOption.showLatString = `${newOption.latType}${newOption.latDegree}°${newOption.latMinute}′${option.latSecond}″`;
    return newOption;
  }
  /**经纬度转换
   * @param longitude 经度
   * @param latitude  纬度
   * @return
   */
  degreesToDegrees60(longitude, latitude, isObject) {
    if (longitude && latitude) {
      if (longitude % 1 === 0) {
        longitude += 0.0000001;
      }
      if (latitude % 1 === 0) {
        latitude += 0.0000001;
      }
      this.longitudeNormalize(longitude);
      latitude = this.clamp(latitude, -90.0, 90.0);
      const isEast = longitude >= 0.0;
      const isNorth = latitude >= 0.0;
      const longitudeCoordinate = this.getAngleCoordinate(longitude, isEast);
      const latitudeCoordinate = this.getAngleCoordinate(latitude, isNorth);
      if (longitudeCoordinate.isValid(180) && latitudeCoordinate.isValid(90)) {
        const longType = longitudeCoordinate.isPositiveSign ? "E" : "W";
        const latType = latitudeCoordinate.isPositiveSign ? "N" : "S";
        let latitudeMillisecond =
          (latitudeCoordinate.second - Math.floor(latitudeCoordinate.second)) *
          1000.0;
        let longitudeMillisecond =
          (longitudeCoordinate.second -
            Math.floor(longitudeCoordinate.second)) *
          1000.0;
        if (latitudeMillisecond >= 5) {
          latitudeCoordinate.second = Math.ceil(latitudeCoordinate.second);
          latitudeMillisecond = 0;
        }
        if (longitudeMillisecond >= 5) {
          longitudeCoordinate.second = Math.ceil(longitudeCoordinate.second);
          longitudeMillisecond = 0;
        }
        // 秒/分进位，避免出现60秒或60分
        this.carryAngleCoordinate(latitudeCoordinate);
        this.carryAngleCoordinate(longitudeCoordinate);
        if (latitudeMillisecond >= 1000) {
          latitudeMillisecond = 999;
        }
        if (longitudeMillisecond >= 1000) {
          longitudeMillisecond = 999;
        }
        const latDegree = latitudeCoordinate.degree.toString().padStart(2, "0");
        const latMinute = latitudeCoordinate.minute.toString().padStart(2, "0");
        const latSecond = Math.floor(latitudeCoordinate.second)
          .toString()
          .padStart(2, "0");
        const latMillisecond = parseInt(latitudeMillisecond)
          .toString()
          .padStart(3, "0");
        const longDegree = longitudeCoordinate.degree
          .toString()
          .padStart(2, "0");
        const longMinute = longitudeCoordinate.minute
          .toString()
          .padStart(2, "0");
        const longSecond = Math.floor(longitudeCoordinate.second)
          .toString()
          .padStart(2, "0");
        const longMillisecond = parseInt(longitudeMillisecond)
          .toString()
          .padStart(3, "0");
        const longString = `${longType}${longDegree}${longMinute}${longSecond}.${longMillisecond}`;
        const latString = `${latType}${latDegree}${latMinute}${latSecond}.${latMillisecond}`;
        const formattedString = `${latString}${longString}`;
        const showLongString = `${longType}${longDegree}°${longMinute}′${longSecond}″`;
        const showLatString = `${latType}${latDegree}°${latMinute}′${latSecond}″`;
        const formattedObject = {
          longType,
          longDegree,
          longMinute,
          longSecond,
          longMillisecond,
          latType,
          latDegree,
          latMinute,
          latSecond,
          latMillisecond,
          longString,
          latString,
          showLongString,
          showLatString
        };
        if (isObject) {
          return formattedObject;
        } else {
          return formattedString;
        }
      }
    }
  }
  /**经度坐标处理
   * @param x
   */
  longitudeNormalize(x) {
    while (x > this.ONE_HUNDRED_AND_EIGHTY) {
      x -= this.THREE_HUNDRED_AND_SIXTY;
    }
    while (x < -this.ONE_HUNDRED_AND_EIGHTY) {
      x += this.THREE_HUNDRED_AND_SIXTY;
    }
  }
  /**纬度坐标处理
   * @param x
   * @param low
   * @param high
   * @return
   */
  clamp(x, low, high) {
    return x < low ? low : Math.min(x, high);
  }
  /**
   * 度分秒进位：60秒进1分，60分进1度，避免出现60分/60秒
   * @param angleCoordinate
   */
  carryAngleCoordinate(angleCoordinate) {
    if (angleCoordinate.second >= 60.0) {
      angleCoordinate.second -= 60.0;
      angleCoordinate.minute += 1;
    }
    if (angleCoordinate.minute >= 60) {
      angleCoordinate.minute -= 60;
      angleCoordinate.degree += 1;
    }
  }
  /**经纬度坐标转度分秒
   * @param coordinate
   * @param isNorthOrEast
   * @return
   */
  getAngleCoordinate(coordinate, isNorthOrEast) {
    const angleCoordinate = Object.create(this.AngleCoordinate);
    //拆分坐标
    coordinate = Math.abs(coordinate) + this.SECOND_PRECISION_COMPARE_VALUE;
    //度
    angleCoordinate.degree = parseInt(coordinate);
    //分
    const miniature = (coordinate - angleCoordinate.degree) * 60.0;
    angleCoordinate.minute = parseInt(miniature);
    //秒
    angleCoordinate.second = (miniature - angleCoordinate.minute) * 60.0;
    //控制小数点后三位精度
    angleCoordinate.second = angleCoordinate.second * 1000.0 * 0.001;
    // 浮点误差可能导致秒/分为60，需向前进位
    this.carryAngleCoordinate(angleCoordinate);
    angleCoordinate.isPositiveSign = isNorthOrEast;
    return angleCoordinate;
  }
  /**
   * 校验坐标格式并返回度分秒
   * @param {*} coordinates
   * @returns
   */
  verify(coordinates) {
    // 使用matchAll获取所有匹配项，然后映射为数组
    const matchResult = [...coordinates.matchAll(/[NSWE]+/g)].map(
      match => match[0]
    );
    // 坐标格式不匹配
    if (matchResult.length < 1) {
      return [];
    }
    // 秒数支持整数或小数（如 00.5），匹配时保留小数部分
    const regex = /([NSWE])(\d+(?:\.\d+)?)/g;
    const pointResult = [];
    let match;
    // 正则表达式匹配非NSWE字符的部分
    while ((match = regex.exec(coordinates)) !== null) {
      pointResult.push(match[2]);
    }
    return pointResult;
  }
}
const coordinateConversionTool = new CoordinateConversionTool();
export { coordinateConversionTool };
