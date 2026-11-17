import { viewer, olMap } from "@/3dMap/global";
import { mapEmitter } from "@/3dMap/interface";
import { LevelGridCesium } from "@/3dMap/sdkUtils/airspaceGridLevelLines/cameraGrid/cesium";
import { LevelGridOl } from "@/3dMap/sdkUtils/airspaceGridLevelLines/cameraGrid/ol";
import mapData from "@/3dMap/store/map";
const gridLevelKey = {
  "30分": 1,
  "15分": 2,
  "5分": 3,
  "1分": 4,
  "30秒": 5,
  "15秒": 6,
  "5秒": 7,
  "1秒": 8
};
/** 二三维网格层级线。按当前模式创建网格，并在切换时停掉另一边 */
class AirspaceGridLevelLines {
  cameraGrid: any;
  checkedLevels: any[];
  mapEmitterOff: any;
  constructor() {
    this.cameraGrid = {};
    this.checkedLevels = [];
    this.mapEmitterOff = null;
    // 模式切换后按已选层级，把网格同步到当前地图
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      () => {
        this.upDataGridByCheckedLevels();
      }
    );
  }
  loadGridByLevels(levels = []) {
    const mapMode = mapData().mapMode;
    // 根据地图类型创建
    if (!this.cameraGrid[mapMode]) this.cameraGrid[mapMode] = {};
    let cameraGridMode = this.cameraGrid[mapMode];
    // 移除另外地图加载
    if (mapMode === "cesium" && this.cameraGrid["ol"]) {
      for (let key in this.cameraGrid["ol"]) {
        this.cameraGrid["ol"][key].stop();
      }
    }
    if (mapMode === "ol" && this.cameraGrid["cesium"]) {
      for (let key in this.cameraGrid["cesium"]) {
        this.cameraGrid["cesium"][key].stop();
      }
    }
    // 更新当前未选中关闭
    for (let key in cameraGridMode) {
      if (levels.indexOf(key) < 0) {
        cameraGridMode[key].stop();
      }
    }
    // 当前选中创建并展示
    levels.forEach(level => {
      if (!cameraGridMode[level]) {
        if (mapMode === "cesium") {
          cameraGridMode[level] = new LevelGridCesium(viewer, {
            level
          });
        }
        if (mapMode === "ol") {
          cameraGridMode[level] = new LevelGridOl(olMap, {
            level
          });
        }
      }
      cameraGridMode[level].start();
    });
    // 记录当前level
    this.checkedLevels = levels;
  }
  upDataGridByCheckedLevels() {
    // 根据记录重新加载
    this.loadGridByLevels(this.checkedLevels);
  }
}
/** 保持原调用方式：直接使用这一个网格对象 */
const airspaceGridLevelLines = new AirspaceGridLevelLines();
export { AirspaceGridLevelLines, airspaceGridLevelLines, gridLevelKey };
export default airspaceGridLevelLines;
