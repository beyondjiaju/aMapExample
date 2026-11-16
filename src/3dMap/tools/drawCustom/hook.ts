// map
import { ref } from "vue";
import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer, olMap } from "@/3dMap/global";
import {
  coordinateConversionTool,
  DrawHandler as DrawHandlerCesium
} from "@/3dMap/sdk/cesiumUtils";
import { DrawHandler as DrawHandlerOl } from "@/3dMap/sdk/olUtils";
import { cloneDeep } from "@/3dMap/interface";
import { editDataByType } from "./config";
import mapData from "@/3dMap/store/map";
export default (emits, props) => {
  const drawData = ref([]);
  const activeDrawType = ref("");
  const startEdit = ref(true);
  const drawCustomEdit = ref({
    panelShow: false,
    properties: {}
  });
  let newDrawHandlerByMode;
  /**获取坐标字符串 */
  const getDegreesString = (lon, lat) => {
    return coordinateConversionTool.degreesToDegrees60(lon, lat, true);
  };
  /**绘制结束监听 */
  const drawFinishEndEvent = shap => {
    let properties;
    if (mapData().mapMode === "cesium") {
      properties = shap.properties.getValue(viewer.clock.currentTime);
    }
    if (mapData().mapMode === "ol") {
      properties = shap.get("properties");
    }
    if (properties.radius) {
      properties.radius = Number(properties.radius.toFixed(2));
    }
    if (properties.startAngle) {
      properties.startAngle = Number(properties.startAngle.toFixed(2));
    }
    if (properties.endAngle) {
      properties.endAngle = Number(properties.endAngle.toFixed(2));
    }
    // coordinate
    if (properties.coordinate) {
      properties.coordinateDMS = getDegreesString(
        properties.coordinate[0],
        properties.coordinate[1]
      );
    }
    // center
    if (properties.center) {
      properties.centerDMS = getDegreesString(
        properties.center[0],
        properties.center[1]
      );
    }
    // coordinates
    if (properties.coordinates) {
      properties.coordinatesDMS = [];
      properties.coordinates.forEach(coordinate => {
        const coordinateDMS = getDegreesString(coordinate[0], coordinate[1]);
        properties.coordinatesDMS.push(coordinateDMS);
      });
    }
    // points
    if (properties.points) {
      properties.pointsDMS = {};
      for (let [key, value] of Object.entries(properties.points)) {
        const isCs = value instanceof Cesium.Cartesian3;
        const carto = isCs ? Cesium.Cartographic.fromCartesian(value) : value;
        properties.points[key] = isCs
          ? [
              Cesium.Math.toDegrees(carto.longitude),
              Cesium.Math.toDegrees(carto.latitude)
            ]
          : value;
        properties.pointsDMS[key] = getDegreesString(
          properties.points[key][0],
          properties.points[key][1]
        );
      }
    }
    // 停止绘制
    if (!props.continuity) stop();
    // 删除图形
    newDrawHandlerByMode.remove(shap);
    setTimeout(() => {
      if (startEdit.value) {
        if (properties.type == "rectangle") properties.type = "polygon";
        drawCustomEdit.value.properties = properties;
        drawCustomEdit.value.panelShow = true;
        return;
      }
      emits("confirm", properties);
    }, 300);
  };
  /**初始化绘制工具 */
  const setDrawHandlerByMode = () => {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium") {
      newDrawHandlerByMode = new DrawHandlerCesium(viewer);
    }
    if (mapMode === "ol") {
      newDrawHandlerByMode = new DrawHandlerOl(olMap);
    }
    newDrawHandlerByMode.drawFinished.addEventListener(drawFinishEndEvent);
  };
  /**开启绘制
   * @param {String} draw_type
   * @param {Object} draw_options
   */
  const start = (
    type = null,
    options = {
      endType: "contextmenu",
      moveEvent: true
    }
  ) => {
    newDrawHandlerByMode.clear();
    if (type == "clear") {
      activeDrawType.value = "";
      return;
    }
    if (activeDrawType.value === type) {
      stop();
      return;
    }
    activeDrawType.value = type ? type : drawData.value[0].type;
    if (type == "input") {
      // 停止
      newDrawHandlerByMode.stop();
      drawData.value.forEach(list => {
        if (
          !activeInputType.value &&
          ["point", "label", "input"].indexOf(list.type) < 0
        ) {
          changeInput(list.type);
        }
      });
      return;
    }
    // 绘制
    newDrawHandlerByMode.start(activeDrawType.value, options);
  };
  /**停止绘制 */
  const stop = () => {
    activeDrawType.value = "";
    // 停止
    newDrawHandlerByMode.stop();
  };
  /**注销 */
  const newDrawHandlerByModeDestroy = () => {
    newDrawHandlerByMode.destroy();
  };
  /**取消 */
  const cancel = () => {
    newDrawHandlerByModeDestroy();
    emits("cancel");
  };
  /**退出编辑 */
  const cancelEdit = () => {
    drawCustomEdit.value.properties = {};
    drawCustomEdit.value.panelShow = false;
  };
  /**确认编辑 */
  const confirmEdit = properties => {
    cancelEdit();
    emits("confirm", properties);
  };
  // 直接自定义编辑
  const activeInputType = ref(null);
  const inputDrawResult = ref(null);
  /**输入change */
  const changeInput = type => {
    activeInputType.value = type;
    inputDrawResult.value = cloneDeep(editDataByType[type]);
  };
  /**输入取消 */
  const inputCancel = () => {
    if (props.hasCancel) {
      cancel();
      return;
    }
    activeInputType.value = null;
    inputDrawResult.value = null;
    activeDrawType.value = null;
  };
  /**输入确认 */
  const inputConfirm = inputShap => {
    if (!inputShap) return;
    const { ...other } = inputShap;
    confirmEdit({
      ...other,
      isInputData: true
    });
    inputCancel();
  };
  return {
    drawData,
    activeDrawType,
    startEdit,
    drawCustomEdit,
    setDrawHandlerByMode,
    newDrawHandlerByModeDestroy,
    start,
    stop,
    cancel,
    cancelEdit,
    confirmEdit,
    activeInputType,
    inputDrawResult,
    changeInput,
    inputCancel,
    inputConfirm
  };
};
