import * as Cesium from "@/3dMap/sdk/cesium";
import { coordinateConversionTool } from "@/3dMap/sdk/cesiumUtils";
/**创建show3DCoordinates
 */
class Map3DCoordinates {
  /**
   * 初始化show3DCoordinates
   */
  constructor(option) {
    const that = this;
    // 记录viewer
    that.viewer = option.viewer;
    if (!that.viewer) return;
    that.type = Cesium.defaultValue(option.type, 0);
    that.show = true;
    // 创建、设置
    if (option.id) {
      that.dom = document.getElementById(option.id);
    } else {
      let div = document.createElement("div");
      div.id = that.viewer.container.id + "Map3DCoordinates";
      that.dom = that.viewer.container.appendChild(div);
    }
    that.dom.className = "map3DCoordinates";
    that.dom.innerHTML = `
            <p class="map3DCoordinates_scale"></p>
            <p class="map3DCoordinates_eyeHeight">视点高:</p>
            <p class="map3DCoordinates_latitude">0</p>
            <p class="map3DCoordinates_longitude">0</p>
            <p class="map3DCoordinates_height">0</p> 
        `;
    const distanceLegendDiv = document.getElementById("distanceLegendDiv");
    if (distanceLegendDiv) {
      document
        .getElementsByClassName("cesium-widget-cesiumNavigationContainer")[0]
        .removeChild(distanceLegendDiv);
      that.dom
        .querySelector(".map3DCoordinates_scale")
        .appendChild(distanceLegendDiv);
    }
    const scene = that.viewer.scene,
      globe = scene.globe;
    this.handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    this.handler.setInputAction(m => {
      const moveEvent = m.endPosition;
      // 获取鼠标位置信息
      if (moveEvent) {
        // 获取鼠标在container中位置
        const moveX = moveEvent.x - that.viewer.container.offsetLeft,
          moveY = moveEvent.y - that.viewer.container.offsetTop;
        // 坐标转换并赋值
        let movePositionClient = new Cesium.Cartesian2(moveX, moveY),
          pickRay = that.viewer.camera.getPickRay(movePositionClient),
          movePositionCartographic;
        // getPickRay 在画布尺寸为 0 或场景过渡中会返回 undefined，判空后再拾取
        if (!pickRay) return;
        let movePositionCartesian3 = globe.pick(pickRay, scene);
        if (!movePositionCartesian3) return;
        movePositionCartographic = globe.ellipsoid.cartesianToCartographic(
          movePositionCartesian3
        );
        let longitude,
          latitude,
          longitude_unit,
          latitude_unit,
          showLongitude,
          showLatitude;
        // 根据展示类型保留小数
        if (that.type == 0) {
          longitude = Cesium.Math.toDegrees(
            movePositionCartographic.longitude
          ).toFixed(5);
          latitude = Cesium.Math.toDegrees(
            movePositionCartographic.latitude
          ).toFixed(5);
        } else {
          longitude = Cesium.Math.toDegrees(
            movePositionCartographic.longitude
          ).toFixed(7);
          latitude = Cesium.Math.toDegrees(
            movePositionCartographic.latitude
          ).toFixed(7);
        }
        // 单位处理
        if (longitude > 0) {
          longitude_unit = "E";
        } else if (longitude < 0) {
          longitude_unit = "W";
        }
        if (latitude > 0) {
          latitude_unit = "N";
        } else if (latitude < 0) {
          latitude_unit = "S";
        }
        // 根据类型展示
        if (that.type == 0) {
          showLongitude = `${longitude_unit} ${longitude}`;
          showLatitude = `${latitude_unit} ${latitude}`;
        } else {
          const degrees_new = coordinateConversionTool.degreesToDegrees60(
            longitude,
            latitude,
            true
          );
          showLongitude = `${degrees_new.showLongString}`;
          showLatitude = `${degrees_new.showLatString}`;
          // 度数换算分 分换算秒
          // const newLongitude = String(longitude),
          //   newLatitude = String(latitude);
          // const longitude_text = newLongitude.substr(
          //     newLongitude.indexOf(".") + 1
          //   ),
          //   longitude_fen = ("0." + longitude_text) * 60,
          //   longitude_fen_string = String(longitude_fen),
          //   longitude_fen_text = longitude_fen_string.substr(
          //     longitude_fen_string.indexOf(".") + 1
          //   ),
          //   longitude_miao = ("0." + longitude_fen_text) * 60,
          //   latitude_text = newLatitude.substr(newLatitude.indexOf(".") + 1),
          //   latitude_fen = ("0." + latitude_text) * 60,
          //   latitude_fen_string = String(latitude_fen),
          //   latitude_fen_text = latitude_fen_string.substr(
          //     latitude_fen_string.indexOf(".") + 1
          //   ),
          //   latitude_miao = ("0." + latitude_fen_text) * 60;
          // showLongitude =
          //   longitude_unit +
          //   " " +
          //   Math.floor(longitude) +
          //   "°" +
          //   Math.floor(longitude_fen) +
          //   "′" +
          //   longitude_miao.toFixed(3) +
          //   "″";
          // showLatitude =
          //   latitude_unit +
          //   " " +
          //   Math.floor(latitude) +
          //   "°" +
          //   Math.floor(latitude_fen) +
          //   "′" +
          //   latitude_miao.toFixed(3) +
          //   "″";
        }
        that.dom.querySelector(".map3DCoordinates_longitude").innerHTML =
          showLongitude;
        that.dom.querySelector(".map3DCoordinates_latitude").innerHTML =
          showLatitude;
        that.dom.querySelector(".map3DCoordinates_height").innerHTML =
          movePositionCartographic.height.toFixed(2) + " m";
        // 设置当前视点高度显示状态
        // if (camera_Cartographic.height < 100000) {
        // if (movePositionCartographic.height > 0) {
        //   that.dom.querySelector(".map3DCoordinates_height").style.display =
        //     "block";
        // } else {
        //   that.dom.querySelector(".map3DCoordinates_height").style.display =
        //     "none";
        // }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    scene.postRender.addEventListener(() => {
      that.dom.style.display = that.show ? "block" : "none";
      // 获取并设置比例尺
      const geodesic = new Cesium.EllipsoidGeodesic(),
        width = that.viewer.container.clientWidth,
        height = that.viewer.container.clientHeight,
        left = scene.camera.getPickRay(new Cesium.Cartesian2(0, height / 2)),
        right = scene.camera.getPickRay(
          new Cesium.Cartesian2(width, height / 2)
        );
      // getPickRay 在画布尺寸为 0 或场景过渡中会返回 undefined
      if (!left || !right) return;
      const leftPosition = globe.pick(left, scene),
        rightPosition = globe.pick(right, scene);
      if (!leftPosition || !rightPosition) return;
      const leftCartographic =
          globe.ellipsoid.cartesianToCartographic(leftPosition),
        rightCartographic =
          globe.ellipsoid.cartesianToCartographic(rightPosition);
      geodesic.setEndPoints(leftCartographic, rightCartographic);
      // const pixelDistance = geodesic.surfaceDistance,
      //   resolution = pixelDistance / width,
      //   scale = (resolution * 96) / 0.0254;
      // that.dom.querySelector(".map3DCoordinates_scale").innerHTML =
      //   "比例尺: 1/" + Math.floor(scale);
      // 获取并设置视点高度
      const camera_Cartographic = that.viewer.camera.positionCartographic;
      let heightText;
      if (camera_Cartographic.height < 10000) {
        heightText = camera_Cartographic.height.toFixed(2) + " m";
      } else {
        heightText = (camera_Cartographic.height / 1000).toFixed(2) + " km";
      }
      that.dom.querySelector(".map3DCoordinates_eyeHeight").innerHTML =
        "视点高: " + heightText;
    });
  }
}
const map3DCoordinates = option => {
  return new Map3DCoordinates(option);
};
export { map3DCoordinates };
