import * as Cesium from "@/3dMap/sdk/cesium";
import * as turf from "@turf/turf";
class KeyDownControlCamera {
  constructor(viewer) {
    this.viewer = viewer;
    this.addEventListener();
  }
  addEventListener() {
    const that = this;
    document.addEventListener("keydown", event => {
      // 获取相机当前位置与视角
      const camera = that.viewer.camera,
        position_carto = camera.positionCartographic.clone(),
        heading = camera.heading;
      let distance = 1000,
        angle;
      switch (event.keyCode) {
        case 38:
          // 向前
          angle = Cesium.Math.toDegrees(heading);
          break;
        case 40:
          // 向后
          angle = Cesium.Math.toDegrees(heading - Math.PI);
          break;
        case 37:
          // 向左
          angle = Cesium.Math.toDegrees(heading - Math.PI / 2);
          break;
        case 39:
          // 向右
          angle = Cesium.Math.toDegrees(heading + Math.PI / 2);
          break;
        // case 73:
        //     // 向下
        //     camera.zoomIn();
        //     return
        // case 79:
        //     // 向上
        //     camera.zoomOut();
        //     return
        default:
          return;
      }
      // 计算新点位
      const point = turf.point([
          Cesium.Math.toDegrees(position_carto.longitude),
          Cesium.Math.toDegrees(position_carto.latitude)
        ]),
        newPoin = turf.destination(point, distance, angle, {
          units: "meters"
        });
      // 设置视角
      const destination = Cesium.Cartesian3.fromDegrees(
        newPoin.geometry.coordinates[0],
        newPoin.geometry.coordinates[1],
        position_carto.height
      );
      camera.setView({
        destination,
        orientation: {
          heading: camera.heading,
          pitch: camera.pitch,
          roll: camera.roll
        }
      });
    });
  }
}
const keyDownControlCamera = viewer => {
  return new KeyDownControlCamera(viewer);
};
export { keyDownControlCamera };
