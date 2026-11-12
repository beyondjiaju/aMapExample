import * as Cesium from "@/3dMap/sdk/cesium";
import {
  gridObj,
  TOLER,
  m_vGridLevelRenderParam,
  Double_Precision_CompareValue,
  Float_Precision_CompareValue,
  m_fLatitudeMaxLimit
} from "./config";
import {
  cartesian3ToLonLat,
  Longitude_Normalize,
  gainCameraRelativeHeightRefValue,
  setTheodoliteCoordAndLevel
} from "./hook";
let recordI = 0,
  recordJ = 0;
class CameraGrid {
  viewer: any;
  listener: any;
  gridLevelKey: any;
  gridCodeVisible: any;
  gridLines: any;
  gridLabels: any;
  constructor(viewer) {
    this.viewer = viewer;
    this.gridLevelKey = "15分";
    this.gridCodeVisible = true;
    this.gridLines = new Cesium.PolylineCollection();
    this.viewer.scene.primitives.add(this.gridLines);
    this.gridLabels = new Cesium.CustomDataSource("gridCodeLabel");
    this.viewer.dataSources.add(this.gridLabels);
  }
  start() {
    const that = this;
    this.stop();
    this.listener = () => {
      // 获取当前相机的位置
      let cameraPosition = that.viewer.camera.position;
      // 获取当前相机查看的中心点
      let ray = that.viewer.camera.getPickRay(
        new Cesium.Cartesian2(
          that.viewer.canvas.clientWidth / 2,
          that.viewer.canvas.clientHeight / 2
        )
      );
      // getPickRay 在画布尺寸为 0 或场景过渡中会返回 undefined
      if (!ray) return;
      let center = that.viewer.scene.globe.pick(ray, that.viewer.scene);
      that.gridLines.removeAll();
      that.gridLabels.entities.removeAll();
      if (Cesium.defined(center)) {
        // 计算两点之间的距离
        let distance = Cesium.Cartesian3.distance(cameraPosition, center);
        // 把当前 屏幕中心 坐标转为经纬度
        let center_degrees = cartesian3ToLonLat(center);
        // 把当前 相机位置 坐标转为经纬度
        let cameraPosition_degrees = cartesian3ToLonLat(cameraPosition);
        // 计算边界
        that.calculateBoundary(
          cameraPosition_degrees[2],
          distance,
          center_degrees
        );
      } else {
        // console.log('与地球没有交集。');
      }
    };
    this.listener();
    // 监听相机变化事件
    this.viewer.camera.changed.addEventListener(this.listener);
  }
  stop() {
    if (this.listener)
      this.viewer.camera.changed.removeEventListener(this.listener);
    this.gridLines.removeAll();
    this.gridLabels.entities.removeAll();
  }
  setLevelKey(key) {
    this.gridLevelKey = key;
    this.start();
  }
  /**
   * @param cameraHeight 当前视角高度
   * @param cameraDistanceToCenter 当前视角位置与屏幕中心点地面位置距离
   * @param centerDegrees 屏幕中心点地面位置
   */
  calculateBoundary(cameraHeight, cameraDistanceToCenter, centerDegrees) {
    // 地球赤道半径
    const fEquatorSceneRadius = Cesium.Ellipsoid.WGS84.maximumRadius;
    // 计算视域可见地球范围
    let fLatCosViewZoneAngle =
      (fEquatorSceneRadius + cameraHeight) / Math.abs(cameraDistanceToCenter);
    fLatCosViewZoneAngle = Math.min(
      Math.max(fLatCosViewZoneAngle, 0.0),
      1.0 - TOLER
    );
    fLatCosViewZoneAngle = Math.acos(fLatCosViewZoneAngle) * (180 / Math.PI);
    let fInputLatitude = Cesium.Math.clamp(
      centerDegrees[1],
      -89.999999,
      89.999999
    );
    // 计算经度视角角度的余弦值
    let fLongCosViewZoneAngle =
      fLatCosViewZoneAngle *
      (1.0 + Math.abs(Math.tan(Cesium.Math.toRadians(fInputLatitude))));
    // 限制经度视角角度的余弦值
    fLongCosViewZoneAngle = Math.min(fLongCosViewZoneAngle, 180.0);
    let fCameraRelativeHeightRefValue = gainCameraRelativeHeightRefValue(
      centerDegrees[1],
      fLongCosViewZoneAngle,
      fLatCosViewZoneAngle,
      cameraHeight
    );
    let fCurGridModelingHeight = 0.0,
      fCurViewZoneAngleScale = 0.0,
      nRenderParamIndex = 0,
      m_nCurrentLevel = 0;
    for (let i = 0; i < m_vGridLevelRenderParam.length; ++i) {
      if (
        fCameraRelativeHeightRefValue >
          m_vGridLevelRenderParam[i].fGridVisibleCameraMinHeight &&
        fCameraRelativeHeightRefValue <=
          m_vGridLevelRenderParam[i].fGridVisibleCameraMaxHeight
      ) {
        let fFactor = 0.0;
        let fAltRange = Math.abs(
          m_vGridLevelRenderParam[i].fGridVisibleCameraMaxHeight -
            m_vGridLevelRenderParam[i].fGridVisibleCameraMinHeight
        );

        if (fAltRange > Float_Precision_CompareValue) {
          fFactor = Math.max(
            0.0,
            Math.min(
              (m_vGridLevelRenderParam[i].fGridVisibleCameraMaxHeight -
                fCameraRelativeHeightRefValue) /
                fAltRange,
              1.0
            )
          );
        }

        fCurGridModelingHeight =
          m_vGridLevelRenderParam[i].fGridModelingMaxHeight +
          (m_vGridLevelRenderParam[i].fGridModelingMinHeight -
            m_vGridLevelRenderParam[i].fGridModelingMaxHeight) *
            fFactor;
        fCurViewZoneAngleScale =
          m_vGridLevelRenderParam[i].fViewZoneAngleMaxScale +
          (m_vGridLevelRenderParam[i].fViewZoneAngleMinScale -
            m_vGridLevelRenderParam[i].fViewZoneAngleMaxScale) *
            fFactor;
        m_nCurrentLevel = m_vGridLevelRenderParam[i].nGridLevel;
        nRenderParamIndex = i;
        break;
      }
    }
    let fLongCellSpan = gridObj[this.gridLevelKey],
      fLatCellSpan = gridObj[this.gridLevelKey];
    let fLongHalfCellSpan = fLongCellSpan * 0.5;
    let fLatHalfCellSpan = fLatCellSpan * 0.5;
    // 转换为场景高度
    fCurGridModelingHeight = fCurGridModelingHeight / cameraDistanceToCenter;
    fLongCosViewZoneAngle *= fCurViewZoneAngleScale;
    fLatCosViewZoneAngle *= fCurViewZoneAngleScale;
    let bIsAllLongitude =
      Math.abs(fLongCosViewZoneAngle - 180.0) <= Double_Precision_CompareValue;
    let fGridStartLongitude = bIsAllLongitude
      ? -180.0
      : centerDegrees[0] - fLongCosViewZoneAngle;
    let fGridEndLongitude = bIsAllLongitude
      ? 180.0
      : centerDegrees[0] + fLongCosViewZoneAngle;
    let fGridStartLatitude = Math.max(
      Math.min(centerDegrees[1] - fLatCosViewZoneAngle, m_fLatitudeMaxLimit),
      -m_fLatitudeMaxLimit
    );
    let fGridEndLatitude = Math.max(
      Math.min(centerDegrees[1] + fLatCosViewZoneAngle, m_fLatitudeMaxLimit),
      -m_fLatitudeMaxLimit
    );
    // 区域获取结束
    if (!bIsAllLongitude) {
      let fMod = Math.abs(fGridStartLongitude % fLongCellSpan);
      if (fMod > 0.0) {
        if (fGridStartLongitude > 0.0) {
          fGridStartLongitude -= fMod;
        } else if (fGridStartLongitude < 0.0) {
          fGridStartLongitude += fMod - fLongCellSpan;
        }
      }
      fMod = Math.abs(fGridEndLongitude % fLongCellSpan);
      if (fMod > 0.0) {
        if (fGridEndLongitude > 0.0) {
          fGridEndLongitude += fLongCellSpan - fMod;
        } else if (fGridEndLongitude < 0.0) {
          fGridEndLongitude += fMod;
        }
      }
      //增加网格尺寸裕度
      let fExtentSize = fLongCellSpan * 2.0;
      let fLongDiff = Math.abs(fGridEndLongitude - fGridStartLongitude);
      if (
        fLongDiff > Double_Precision_CompareValue &&
        fLongDiff + fExtentSize < 360.0 - Double_Precision_CompareValue
      ) {
        fGridEndLongitude += fExtentSize;
      }
    }
    let fMod = Math.abs(fGridStartLatitude % fLatCellSpan);
    if (fMod > 0.0) {
      if (fGridStartLatitude > 0.0) {
        fGridStartLatitude -= fMod;
      } else if (fGridStartLatitude < 0.0) {
        fGridStartLatitude += fMod - fLatCellSpan;
      }

      fGridStartLatitude = Math.max(
        -m_fLatitudeMaxLimit,
        Math.min(fGridStartLatitude, m_fLatitudeMaxLimit)
      );
    }
    fMod = Math.abs(fGridEndLatitude % fLatCellSpan);
    if (fMod > 0.0) {
      if (fGridEndLatitude > 0.0) {
        fGridEndLatitude += fLatCellSpan - fMod;
      } else if (fGridEndLatitude < 0.0) {
        fGridEndLatitude += fMod;
      }

      fGridEndLatitude = Math.max(
        -m_fLatitudeMaxLimit,
        Math.min(fGridEndLatitude, m_fLatitudeMaxLimit)
      );
    }
    //增加网格尺寸裕度
    let fExtentSize = fLatCellSpan * 2.0;
    if (
      fGridEndLatitude + fExtentSize <
      m_fLatitudeMaxLimit - Double_Precision_CompareValue
    ) {
      fGridEndLatitude += fExtentSize;
    }
    let fGridLongValidRange = fGridEndLongitude - fGridStartLongitude;
    let fGridLatValidRange = fGridEndLatitude - fGridStartLatitude;
    fLongCellSpan /=
      m_vGridLevelRenderParam[nRenderParamIndex].nCellLongPartition;
    fLatCellSpan /=
      m_vGridLevelRenderParam[nRenderParamIndex].nCellLatPartition;
    // 经度线数量
    let nAllLongReserveSize = Math.floor(fGridLongValidRange / fLongCellSpan);
    // 纬度线数量
    let nAllLatReserveSize = Math.floor(fGridLatValidRange / fLatCellSpan);
    recordI = 0;
    recordJ = 0;
    if (nAllLongReserveSize && nAllLatReserveSize) {
      this.getLonLatValue(
        recordI,
        recordJ,
        nAllLongReserveSize,
        fGridStartLongitude,
        fLongCellSpan,
        nRenderParamIndex,
        nAllLatReserveSize,
        fGridStartLatitude,
        fLatCellSpan,
        fLongHalfCellSpan,
        fLatHalfCellSpan,
        m_nCurrentLevel
      );
    }
  }
  /**获取经纬度
   * @param { Number } nowI 0
   * @param { Number } nowJ 0
   * @param { Number } nAllLongReserveSize 经度线数量
   * @param { Number } fGridStartLongitude 开始经度
   * @param { Number } fLongCellSpan 网格经度step
   * @param { Number } nRenderParamIndex 渲染参数索引
   * @param { Number } nAllLatReserveSize 纬度线数量
   * @param { Number } fGridStartLatitude 开始纬度
   * @param { Number } fLatCellSpan 网格纬度step
   * @param { Number } fLongHalfCellSpan 网格经度step 一半
   * @param { Number } fLatHalfCellSpan 网格纬度step 一半
   * @param { Number } m_nCurrentLevel 当前渲染网格级别
   */
  getLonLatValue(
    nowI,
    nowJ,
    nAllLongReserveSize,
    fGridStartLongitude,
    fLongCellSpan,
    nRenderParamIndex,
    nAllLatReserveSize,
    fGridStartLatitude,
    fLatCellSpan,
    fLongHalfCellSpan,
    fLatHalfCellSpan,
    m_nCurrentLevel
  ) {
    const vAllLongValue = [],
      vAllLatValue = [],
      vKeyLongValue = [],
      vKeyLatValue = [];
    // 记录经度值
    for (let i = nowI; i < nAllLongReserveSize; ++i) {
      let fCurLong = fGridStartLongitude + i * fLongCellSpan;
      vAllLongValue.push(fCurLong);
      if (
        i % m_vGridLevelRenderParam[nRenderParamIndex].nCellLongPartition ==
          0 ||
        i == nAllLongReserveSize - 1
      ) {
        vKeyLongValue.push(fCurLong);
      }
      recordI = i;
      // if (vAllLongValue.length > max_length || vKeyLongValue.length > max_length) break;
    }
    // 记录纬度值
    for (let j = nowJ; j < nAllLatReserveSize; ++j) {
      let fCurLat = fGridStartLatitude + j * fLatCellSpan;
      vAllLatValue.push(fCurLat);
      if (
        j % m_vGridLevelRenderParam[nRenderParamIndex].nCellLatPartition == 0 ||
        j == nAllLatReserveSize - 1
      ) {
        vKeyLatValue.push(fCurLat);
      }
      recordJ = j;
      // if (vAllLatValue.length > max_length || vKeyLatValue.length > max_length) break;
    }
    this.addLonLatLine(
      vAllLongValue,
      vKeyLongValue,
      vAllLatValue,
      vKeyLatValue,
      fLongHalfCellSpan,
      fLatHalfCellSpan,
      m_nCurrentLevel
    );
    if (
      recordI !== nAllLongReserveSize - 1 &&
      recordJ !== nAllLatReserveSize - 1
    ) {
      this.getLonLatValue(
        recordI,
        recordJ,
        nAllLongReserveSize,
        fGridStartLongitude,
        fLongCellSpan,
        nRenderParamIndex,
        nAllLatReserveSize,
        fGridStartLatitude,
        fLatCellSpan,
        fLongHalfCellSpan,
        fLatHalfCellSpan,
        m_nCurrentLevel
      );
    }
  }
  addLonLatLine(
    vAllLongValue,
    vKeyLongValue,
    vAllLatValue,
    vKeyLatValue,
    fLongHalfCellSpan,
    fLatHalfCellSpan,
    m_nCurrentLevel
  ) {
    // if (radio1.value !== '1秒') {
    /**
     * 第一种方式 ———— 画primitive线
     */
    // 绘制经度线
    for (let i = 0; i < vKeyLongValue.length; ++i) {
      const lon_positions = [];

      vKeyLongValue[i] = Longitude_Normalize(vKeyLongValue[i]);
      for (let j = 0; j < vAllLatValue.length; ++j) {
        const position = Cesium.Cartesian3.fromDegrees(
          vKeyLongValue[i],
          vAllLatValue[j]
        );
        lon_positions.push(position);
      }

      this.createPolyline(lon_positions);
    }

    // var num2 = 0;
    // 绘制纬度线
    for (let i = 0; i < vKeyLatValue.length; ++i) {
      const lat_positions = [];

      for (let j = 0; j < vAllLongValue.length; ++j) {
        vAllLongValue[j] = Longitude_Normalize(vAllLongValue[j]);
        const position = Cesium.Cartesian3.fromDegrees(
          vAllLongValue[j],
          vKeyLatValue[i]
        );
        lat_positions.push(position);
      }

      this.createPolyline(lat_positions);
    }

    // 绘制标牌
    if (this.gridCodeVisible) {
      for (let i = 0; i < vKeyLongValue.length - 1; ++i) {
        let x = vKeyLongValue[i] + fLongHalfCellSpan;
        x = Longitude_Normalize(x);

        for (let j = 0; j < vKeyLatValue.length - 1; ++j) {
          let y = vKeyLatValue[j] + fLatHalfCellSpan;
          this.gainGridCellMark(m_nCurrentLevel, x, y);
        }
      }
    }
  }
  gainGridCellMark(nGridLevel, fLongitude, fLatitude) {
    const GARSCell = setTheodoliteCoordAndLevel(
      fLongitude,
      fLatitude,
      nGridLevel
    );
    if (GARSCell) this.createLabel([fLongitude, fLatitude], GARSCell);
  }
  createLabel(position, text) {
    this.gridLabels.entities.add({
      position: Cesium.Cartesian3.fromDegrees(position[0], position[1]),
      label: {
        text: text,
        font: "bold 15px sans-serif",
        fillColor: Cesium.Color.fromCssColorString("white"),
        outlineColor: Cesium.Color.fromCssColorString("#000"),
        outlineWidth: 4,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        scale: 1.0,
        show: true
      }
    });
  }
  createPolyline(geometryInstances) {
    this.gridLines.add({
      positions: geometryInstances,
      width: 1,
      material: new Cesium.Material({
        fabric: {
          type: "Color",
          uniforms: {
            color: Cesium.Color.fromCssColorString("white")
          }
        }
      })
    });
  }
}
export { CameraGrid };
