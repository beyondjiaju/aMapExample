import { viewer, olMap } from "@/3dMap/global";
import { LevelGridCesium } from "@/3dMap/utils/business/airspaceGridLevelLines/cameraGrid/cesium";
import { LevelGridOl } from "@/3dMap/utils/business/airspaceGridLevelLines/cameraGrid/ol";
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
export default {
  cameraGrid: {},
  checkedLevels: [],
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
  },
  upDataGridByCheckedLevels() {
    // 根据记录重新加载
    this.loadGridByLevels(this.checkedLevels);
  }
};
