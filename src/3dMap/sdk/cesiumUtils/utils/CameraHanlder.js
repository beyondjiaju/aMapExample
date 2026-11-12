import * as Cesium from "@/3dMap/sdk/cesium";
import { resolve } from "path";
/**相机使用工具 */
class CameraHanlder {
  constructor(viewer) {
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.camera = viewer.camera;
    this.minHeight = this.scene.screenSpaceCameraController.minimumZoomDistance;
    this.maxHeight = this.scene.screenSpaceCameraController.maximumZoomDistance;
  }
  /**设置相机俯仰角范围
   * @param { Object } option
   * @param { Object } option.min // 最小角度 0
   * @param { Object } option.max // 最大角度 90
   */
  setPitchLimit(option) {
    let pitchHandler = new Cesium.ScreenSpaceEventHandler(this.scene.canvas);
    const maxAngle = option.min ? -Number(option.min) : 0;
    const minAngle = option.max ? -Number(option.max) : -90;
    const maxPitch = Cesium.Math.toRadians(maxAngle);
    const minPitch = Cesium.Math.toRadians(minAngle);
    let outLimitType;
    // 中键down
    pitchHandler.setInputAction(down => {
      if (this.scene.mode == Cesium.SceneMode.SCENE2D) return;
      // 超出位置判断
      const down_carte3 = this.camera.pickEllipsoid(
        down.position,
        this.scene.globe.ellipsoid
      );
      if (!down_carte3) {
        this.scene.screenSpaceCameraController.enableTilt = false;
        return;
      } else {
        this.scene.screenSpaceCameraController.enableTilt = true;
      }
      // 限制
      const downY = down.position.y;
      pitchHandler.setInputAction(move => {
        // 超出位置判断
        const move_carte3 = this.camera.pickEllipsoid(
          move.endPosition,
          this.scene.globe.ellipsoid
        );
        if (!move_carte3) {
          pitchHandler.removeInputAction(
            Cesium.ScreenSpaceEventType.MOUSE_MOVE
          );
          this.scene.screenSpaceCameraController.enableTilt = false;
          return;
        }
        // 获取操作信息
        const moveY = move.endPosition.y;
        const currentPitch = this.camera.pitch;
        // 超出限制控制操作
        if (currentPitch >= maxPitch || currentPitch <= minPitch) {
          this.scene.screenSpaceCameraController.enableTilt = false;
        }
        // 超出类型记录
        if (currentPitch >= maxPitch) outLimitType = "maxLimit";
        if (currentPitch <= minPitch) outLimitType = "minLimit";
        // 恢复操作
        if (!this.scene.screenSpaceCameraController.enableTilt) {
          if (outLimitType == "maxLimit" && moveY > downY)
            this.scene.screenSpaceCameraController.enableTilt = true;
          if (outLimitType == "minLimit" && moveY < downY)
            this.scene.screenSpaceCameraController.enableTilt = true;
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }, Cesium.ScreenSpaceEventType.MIDDLE_DOWN);
    // 中键up
    pitchHandler.setInputAction(m => {
      pitchHandler.removeInputAction(Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    }, Cesium.ScreenSpaceEventType.MIDDLE_UP);
  }
  /**设置相机高度范围
   * @param { Object } option
   * @param { Object } option.min // 最小高度
   * @param { Object } option.max // 最大高度
   */
  setHeightLimit(option) {
    if (!option) option = {};
    this.minHeight = option.min ? option.min : 1;
    this.maxHeight = option.max ? option.max : Number.POSITIVE_INFINITY;
    this.scene.screenSpaceCameraController.minimumZoomDistance = this.minHeight;
    this.scene.screenSpaceCameraController.maximumZoomDistance = this.maxHeight;
  }
  /**在heightLimit限制中操作相机高度 执行camera zoomIn */
  zoomIn(zoomHeight) {
    const cameraHeight = this.camera.positionCartographic.height;
    if (!zoomHeight) zoomHeight = this.camera.positionCartographic?.height / 2;
    if (cameraHeight <= this.minHeight) {
      return;
    }
    let zoomInHeight = zoomHeight;
    if (cameraHeight - zoomHeight < this.minHeight) {
      zoomInHeight = cameraHeight - this.minHeight;
    }
    this.viewer.camera.zoomIn(zoomInHeight);
  }
  /**在heightLimit限制中操作相机高度 执行camera zoomOut*/
  zoomOut(zoomHeight) {
    const cameraHeight = this.camera.positionCartographic.height;
    if (!zoomHeight) zoomHeight = this.camera.positionCartographic?.height / 2;
    if (cameraHeight >= this.maxHeight) {
      return;
    }
    let zoomOutHeight = zoomHeight;
    if (cameraHeight + zoomHeight > this.maxHeight) {
      zoomOutHeight = this.maxHeight - cameraHeight;
    }
    this.viewer.camera.zoomOut(zoomOutHeight);
  }
}
export { CameraHanlder };
