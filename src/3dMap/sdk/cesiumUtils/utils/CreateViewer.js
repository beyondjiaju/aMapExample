import * as Cesium from "@/3dMap/sdk/cesium";
class CreateViewer {
  constructor(id, options = {}) {
    if (!id) return;
    options = Object.assign(
      {
        baseLayerPicker: false,
        animation: false,
        fullscreenButton: false,
        vrButton: false,
        geocoder: false,
        homeButton: false,
        infoBox: false,
        sceneModePicker: false,
        selectionIndicator: false,
        timeline: false,
        navigationHelpButton: false,
        shadows: false,
        shouldAnimate: true,
        imageryProvider: true
      },
      options
    );
    return new Promise((resolve, reject) => {
      const result = new Cesium.Viewer(id, options);
      // 去除cesium ion logo
      result.cesiumWidget.creditContainer.style.display = "none";
      // 取消双击定位
      result.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK
      );
      // 三维颜色设置
      const newColor = "rgb(32, 35, 42)";
      result.scene.skyAtmosphere.show = false;
      result.scene.globe.baseColor = Cesium.Color.fromCssColorString(newColor);
      resolve(result);
    });
  }
}
const createViewer = (id, options) => {
  return new CreateViewer(id, options);
};
export { createViewer };
