import * as Cesium from "@/3dMap/sdk/cesium";
/**创建GraticulesCode 经纬度网格线编码
 */
class GraticulesCode {
  /**
   * 初始化GraticulesCode
   * @param {Object} viewer - viewer对象
   * @param {Number} unit 以分为单位的度数 default:30 支持参数 30 15 5
   */
  constructor(viewer, unit) {
    const that = this;
    // 记录viewer
    that.viewer = viewer;
    that.unit = Cesium.defaultValue(unit, 30);
    // 显示div
    const div = document.createElement("div");
    div.style.cssText =
      "position: absolute;color:#fff;white-space: nowrap;right: 1rem; bottom: 0.4rem";
    that.dom = that.viewer.container.appendChild(div);
    // 纬度计算全部编码英文
    that.allLetters = [];
    const letter_first = [],
      letter_second = [];
    for (let i = 0; i < 26; i++) {
      const code = String.fromCharCode(65 + i);
      if (code != "O" && code != "I") {
        // 第一位截取到Q
        if (i < 17) {
          letter_first.push(code);
        }
        // 第二位拿全部
        letter_second.push(code);
      }
    }
    letter_first.forEach(firstCode => {
      letter_second.forEach(secondCode => {
        that.allLetters.push(firstCode + secondCode);
      });
    });
    // 添加鼠标移动监听
    const scene = that.viewer.scene,
      globe = scene.globe;
    // mousemove
    that.mousemove = function (moveEvent) {
      if (that.unit) {
        moveEvent = moveEvent || window.event;
        // 获取鼠标位置信息
        if (moveEvent) {
          // console.log(moveEvent.clientX - that.viewer.container.offsetLeft,  moveEvent.clientY - that.viewer.container.offsetTop);
          // 获取鼠标在container中位置
          const moveX = moveEvent.clientX - that.viewer.container.offsetLeft,
            moveY = moveEvent.clientY - that.viewer.container.offsetTop;
          // 坐标转换并赋值
          let movePositionClient = new Cesium.Cartesian2(moveX, moveY),
            pickRay = that.viewer.camera.getPickRay(movePositionClient),
            movePositionCartographic;
          // getPickRay 在画布尺寸为 0 或场景过渡中会返回 undefined
          if (!pickRay) {
            // 设置显示code
            that.dom.innerText = "";
            return;
          }
          let movePositionCartesian3 = globe.pick(pickRay, scene);
          if (!movePositionCartesian3) {
            // 设置显示code
            that.dom.innerText = "";
            return;
          }
          movePositionCartographic = globe.ellipsoid.cartesianToCartographic(
            movePositionCartesian3
          );
          const move_lon = Cesium.Math.toDegrees(
              movePositionCartographic.longitude
            ),
            move_lat = Cesium.Math.toDegrees(movePositionCartographic.latitude);
          // 经度计算编码数字
          let code_num_30, code_letter_30;
          if (move_lon > 0) {
            code_num_30 = Math.floor(361 + (move_lon * 60) / 30);
          } else if (move_lon < 0) {
            code_num_30 = Math.floor(1 + (Math.abs(move_lon + 180) * 60) / 30);
          }
          // 纬度计算编码英文 索引
          let letterIndex;
          if (move_lat > 0) {
            letterIndex = Math.floor((Math.abs(move_lat - 90) * 60) / 30);
          } else if (move_lat < 0) {
            letterIndex = Math.floor(((Math.abs(move_lat) + 90) * 60) / 30);
          }
          code_letter_30 = that.allLetters[letterIndex];
          // 不同网格设置
          if (that.unit == 30) {
            // 设置显示code
            that.dom.innerText = "网格编码：" + code_num_30 + code_letter_30;
            return;
          }
          // 15分编号计算
          const steep_30 = 30 / 60;
          const steep_15 = 15 / 60;
          const move_lon_string = String(move_lon),
            move_lat_string = String(move_lat);
          let move_lon_decimal_30 =
              "0" + move_lon_string.substr(move_lon_string.indexOf(".")),
            move_lat_decimal_30 =
              "0" + move_lat_string.substr(move_lat_string.indexOf("."));
          let numArr_15, num_15;
          // 经度确定数组
          if (move_lon_decimal_30 > steep_30) {
            move_lon_decimal_30 %= steep_30;
          }
          if (move_lon > 0) {
            if (move_lon_decimal_30 < steep_15) {
              // 1/3
              numArr_15 = [1, 3];
            } else {
              // 2/4
              numArr_15 = [2, 4];
            }
          } else {
            if (move_lon_decimal_30 > steep_15) {
              // 1/3
              numArr_15 = [1, 3];
            } else {
              // 2/4
              numArr_15 = [2, 4];
            }
          }
          // 纬度确定数值
          if (move_lat_decimal_30 > steep_30) {
            move_lat_decimal_30 %= steep_30;
          }
          if (move_lat > 0) {
            if (move_lat_decimal_30 < steep_15) {
              // 3/4
              num_15 = numArr_15[1];
            } else {
              // 1/2
              num_15 = numArr_15[0];
            }
          } else {
            if (move_lat_decimal_30 > steep_15) {
              // 3/4
              num_15 = numArr_15[1];
            } else {
              // 1/2
              num_15 = numArr_15[0];
            }
          }
          if (that.unit == 15) {
            // 设置显示code
            that.dom.innerText =
              "网格编码：" + code_num_30 + code_letter_30 + num_15;
            return;
          }
          // 5分编号计算
          const steep_5 = 5 / 60;
          const move_lon_decimal_15 = move_lon_decimal_30 % steep_15,
            move_lat_decimal_15 = move_lat_decimal_30 % steep_15;
          let numArr_5, num_5;
          if (move_lon > 0) {
            if (move_lon_decimal_15 < steep_5) {
              numArr_5 = [1, 4, 7];
            } else if (
              move_lon_decimal_15 >= steep_5 &&
              move_lon_decimal_15 <= steep_5 * 2
            ) {
              numArr_5 = [2, 5, 8];
            } else if (move_lon_decimal_15 > steep_5 * 2) {
              numArr_5 = [3, 6, 9];
            }
          } else {
            if (move_lon_decimal_15 > steep_5 * 2) {
              numArr_5 = [1, 4, 7];
            } else if (
              move_lon_decimal_15 >= steep_5 &&
              move_lon_decimal_15 <= steep_5 * 2
            ) {
              numArr_5 = [2, 5, 8];
            } else if (move_lon_decimal_15 < steep_5) {
              numArr_5 = [3, 6, 9];
            }
          }
          if (move_lat > 0) {
            if (move_lat_decimal_15 < steep_5) {
              num_5 = numArr_5[2];
            } else if (
              move_lat_decimal_15 >= steep_5 &&
              move_lat_decimal_15 <= steep_5 * 2
            ) {
              num_5 = numArr_5[1];
            } else if (move_lat_decimal_15 > steep_5 * 2) {
              num_5 = numArr_5[0];
            }
          } else {
            if (move_lat_decimal_15 < steep_5) {
              num_5 = numArr_5[0];
            } else if (
              move_lat_decimal_15 >= steep_5 &&
              move_lat_decimal_15 <= steep_5 * 2
            ) {
              num_5 = numArr_5[1];
            } else if (move_lat_decimal_15 > steep_5 * 2) {
              num_5 = numArr_5[2];
            }
          }
          if (that.unit == 5) {
            // 设置显示code
            that.dom.innerText =
              "网格编码：" + code_num_30 + code_letter_30 + num_15 + num_5;
          }
        }
      }
    };
    // mouseout
    that.mouseout = function () {
      if (that.dom.innerText) {
        // 设置显示code
        that.dom.innerText = "";
      }
    };
    that.viewer.container.addEventListener("mousemove", that.mousemove);
    that.viewer.container.addEventListener("mouseout", that.mouseout);
  }
  /**设置计算单位 */
  setUnit(unit) {
    this.unit = unit;
    if (!unit) {
      // 设置显示code
      this.dom.innerText = "";
    }
  }
  /**
   * 注销集合
   */
  destroy() {
    this.viewer.container.removeEventListener("mousemove", this.mousemove);
    this.viewer.container.removeEventListener("mouseout", this.mouseout);
    this.viewer = null;
  }
}
export { GraticulesCode };
