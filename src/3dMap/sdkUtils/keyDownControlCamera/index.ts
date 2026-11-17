import { viewer, olMap } from "@/3dMap/global";
import { KeyDownControlCamera as KeyDownControlCameraCesium } from "@/3dMap/sdk/cesiumUtils";
import { KeyDownControlCamera as KeyDownControlCameraOl } from "@/3dMap/sdk/olUtils";
import mapData from "@/3dMap/store/map";

/** 二三维通用键盘控制，方向键只驱动当前模式对应的相机 */
class KeyDownControlCamera {
  newKeyDownControlCameraByMode: any;
  onKeyDown: (event: KeyboardEvent) => void;
  constructor() {
    // 各自不监听，由这里按 mapMode 分发，避免二三维一起平移
    this.newKeyDownControlCameraByMode = {
      cesium: new KeyDownControlCameraCesium(viewer, { autoListen: false }),
      ol: new KeyDownControlCameraOl(olMap, { autoListen: false })
    };
    this.onKeyDown = event => {
      const mapMode = mapData().mapMode;
      const handled =
        this.newKeyDownControlCameraByMode[mapMode]?.handleKeyDown(event);
      if (!handled) return;
      event.preventDefault();
      event.stopPropagation();
    };
    document.addEventListener("keydown", this.onKeyDown, true);
  }
  destroy() {
    document.removeEventListener("keydown", this.onKeyDown, true);
    this.newKeyDownControlCameraByMode?.cesium?.destroy?.();
    this.newKeyDownControlCameraByMode?.ol?.destroy?.();
    this.newKeyDownControlCameraByMode = null;
  }
}
export { KeyDownControlCamera };
