import PointerInteraction from "ol/interaction/Pointer";
import { mouseOnly } from "ol/events/condition";
import * as Cesium from "@/3dMap/sdk/cesium";
import { olMap, viewer } from "@/3dMap/global";

/** wheel：滚轮按下拖拽；right：右键拖拽。二三维使用同一按键旋转 */
export type DragRotateButton = "wheel" | "right";

const BUTTON_CODE = {
  wheel: 1,
  right: 2
};

/** 旋转用掉的按键，另一个按键用来拖拽缩放，与三维 tilt/zoom 对调一致 */
function zoomButtonOf(button: DragRotateButton): DragRotateButton {
  return button === "right" ? "wheel" : "right";
}

let currentButton: DragRotateButton = "wheel";
const contextMenuHandler = new WeakMap<any, (event: Event) => void>();

/**
 * 二维拖拽旋转。按键由参数决定，计算方式与 OpenLayers 自带旋转一致。
 */
class DragRotate extends PointerInteraction {
  button: number;
  lastAngle: number | undefined;
  constructor(button: DragRotateButton) {
    super({
      stopDown: () => false
    });
    this.button = BUTTON_CODE[button];
    this.lastAngle = undefined;
    this.set("mapDragRotate", true);
  }
  handleDownEvent(event) {
    const originalEvent = event.originalEvent;
    if (!mouseOnly(event) || originalEvent.button !== this.button) return false;
    originalEvent.preventDefault();
    event.map.getView().beginInteraction();
    this.lastAngle = undefined;
    return true;
  }
  handleDragEvent(event) {
    if (!mouseOnly(event)) return;
    const map = event.map;
    const size = map.getSize();
    if (!size) return;
    const [x, y] = event.pixel;
    const theta = Math.atan2(size[1] / 2 - y, x - size[0] / 2);
    if (this.lastAngle !== undefined) {
      map.getView().adjustRotationInternal(this.lastAngle - theta);
    }
    this.lastAngle = theta;
  }
  handleUpEvent(event) {
    if (!mouseOnly(event)) return true;
    event.map.getView().endInteraction(250);
    this.lastAngle = undefined;
    return false;
  }
}

/**
 * 二维拖拽缩放。按键与当前旋转按键相反：
 * 滚轮旋转时右键缩放，右键旋转时滚轮按下缩放。向下拖拽放大。
 */
class DragZoom extends PointerInteraction {
  button: number;
  lastY: number | undefined;
  constructor(button: DragRotateButton) {
    super({
      stopDown: () => false
    });
    this.button = BUTTON_CODE[button];
    this.lastY = undefined;
    this.set("mapDragZoom", true);
  }
  handleDownEvent(event) {
    const originalEvent = event.originalEvent;
    if (!mouseOnly(event) || originalEvent.button !== this.button) return false;
    originalEvent.preventDefault();
    event.map.getView().beginInteraction();
    this.lastY = event.pixel[1];
    return true;
  }
  handleDragEvent(event) {
    if (!mouseOnly(event) || this.lastY === undefined) return;
    const map = event.map;
    const size = map.getSize();
    if (!size?.[1]) return;
    const y = event.pixel[1];
    const dy = y - this.lastY;
    const view = map.getView();
    const zoom = view.getZoom() || 0;
    // 拖过整屏大约变化 6 级，方向与 Cesium 拖拽缩放一致
    view.setZoom(zoom + (dy / size[1]) * 6);
    this.lastY = y;
  }
  handleUpEvent(event) {
    if (!mouseOnly(event)) return true;
    event.map.getView().endInteraction(250);
    this.lastY = undefined;
    return false;
  }
}

/** 三维与二维共用同一拖拽键：该键旋转，另一键保留缩放 */
function applyCesiumDragRotate(target, button: DragRotateButton) {
  if (!target || target.isDestroyed?.()) return;
  const controller = target.scene?.screenSpaceCameraController;
  if (!controller) return;
  const rotateDrag =
    button === "right"
      ? Cesium.CameraEventType.RIGHT_DRAG
      : Cesium.CameraEventType.MIDDLE_DRAG;
  const zoomDrag =
    button === "right"
      ? Cesium.CameraEventType.MIDDLE_DRAG
      : Cesium.CameraEventType.RIGHT_DRAG;
  controller.tiltEventTypes = [
    rotateDrag,
    Cesium.CameraEventType.PINCH,
    {
      eventType: Cesium.CameraEventType.LEFT_DRAG,
      modifier: Cesium.KeyboardEventModifier.CTRL
    },
    {
      eventType: zoomDrag,
      modifier: Cesium.KeyboardEventModifier.CTRL
    }
  ];
  controller.zoomEventTypes = [
    zoomDrag,
    Cesium.CameraEventType.WHEEL,
    Cesium.CameraEventType.PINCH
  ];
}

/** 右键要么旋转要么缩放，拖拽时不弹出浏览器菜单 */
function bindContextMenu(map) {
  const viewport = map.getViewport?.();
  if (!viewport || contextMenuHandler.has(map)) return;
  const handler = (event: Event) => event.preventDefault();
  viewport.addEventListener("contextmenu", handler);
  contextMenuHandler.set(map, handler);
}

function applyOlDragRotate(map, button: DragRotateButton) {
  if (!map) return;
  const interactions = map.getInteractions?.();
  if (!interactions) return;
  const stale = [];
  interactions.forEach(item => {
    if (item?.get?.("mapDragRotate") || item?.get?.("mapDragZoom")) {
      stale.push(item);
    }
  });
  stale.forEach(item => map.removeInteraction(item));
  map.addInteraction(new DragRotate(button));
  // 与三维相同：旋转键的另一个键负责拖拽缩放
  map.addInteraction(new DragZoom(zoomButtonOf(button)));
  bindContextMenu(map);
}

/** 按当前按键同时改二维、三维的旋转操作 */
export function applyDragRotate(button: DragRotateButton = currentButton) {
  applyOlDragRotate(olMap, button);
  applyCesiumDragRotate(viewer, button);
}

/** 切换旋转按键。之后新建的地图也会沿用这个按键 */
export function setDragRotateButton(button: DragRotateButton) {
  currentButton = button === "right" ? "right" : "wheel";
  applyDragRotate(currentButton);
}
