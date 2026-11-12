const gridObj = {
  "30分": 0.5,
  "15分": 0.25,
  "5分": 5.0 / 60.0,
  "1分": 1.0 / 60.0,
  "30秒": 0.5 / 60.0,
  "15秒": 0.25 / 60.0,
  "5秒": 5.0 / 60.0 / 60.0,
  "1秒": 1.0 / 60.0 / 60.0
};
const TOLER = 0.0001; // 定义TOLER常量
const m_vGridLevelRenderParam = [
  {
    nGridLevel: 0, // 网格级别
    fGridModelingMaxHeight: 40000.0, // 网格建模最大高度
    fGridModelingMinHeight: 40000.0, // 网格建模最小高度
    fGridVisibleCameraMaxHeight: 20000000.0, // 网格可见相机最大高度
    fGridVisibleCameraMinHeight: 12000000.0, // 网格可见相机最小高度
    fLabelVisibleCameraMaxHeight: 600000.0, // 标签可见相机最大高度
    fViewZoneAngleMaxScale: 2.0, // 视域角度最大缩放比例
    fViewZoneAngleMinScale: 2.0 // 视域角度最小缩放比例
  },
  {
    nGridLevel: 1,
    fGridModelingMaxHeight: 4000.0,
    fGridModelingMinHeight: 2000.0,
    fGridVisibleCameraMaxHeight: 12000000.0,
    fGridVisibleCameraMinHeight: 1500000.0,
    fLabelVisibleCameraMaxHeight: 600000.0,
    fViewZoneAngleMaxScale: 1.2,
    fViewZoneAngleMinScale: 0.4
  },
  {
    nGridLevel: 1,
    nCellLongPartition: 1,
    nCellLatPartition: 1,
    fGridModelingMaxHeight: 2000.0,
    fGridModelingMinHeight: 1000.0,
    fGridVisibleCameraMaxHeight: 1500000.0,
    fGridVisibleCameraMinHeight: 600000.0,
    fLabelVisibleCameraMaxHeight: 150000.0,
    fViewZoneAngleMaxScale: 0.4,
    fViewZoneAngleMinScale: 0.3
  },
  {
    nGridLevel: 2,
    nCellLongPartition: 1,
    nCellLatPartition: 1,
    fGridModelingMaxHeight: 1000.0,
    fGridModelingMinHeight: 500.0,
    fGridVisibleCameraMaxHeight: 600000.0,
    fGridVisibleCameraMinHeight: 150000.0,
    fLabelVisibleCameraMaxHeight: 60000.0,
    fViewZoneAngleMaxScale: 0.3,
    fViewZoneAngleMinScale: 0.2
  },
  {
    nGridLevel: 3,
    nCellLongPartition: 1,
    nCellLatPartition: 1,
    fGridModelingMaxHeight: 500.0,
    fGridModelingMinHeight: 20.0,
    fGridVisibleCameraMaxHeight: 150000.0,
    fGridVisibleCameraMinHeight: 0.0,
    fLabelVisibleCameraMaxHeight: 15000.0,
    fViewZoneAngleMaxScale: 0.2,
    fViewZoneAngleMinScale: 0.1
  }
];
const Double_Precision_CompareValue = 0.0000000000001;
const Float_Precision_CompareValue = 0.000001;
const m_fLatitudeMaxLimit = 90.0;
export {
  gridObj,
  TOLER,
  m_vGridLevelRenderParam,
  Double_Precision_CompareValue,
  Float_Precision_CompareValue,
  m_fLatitudeMaxLimit
};
