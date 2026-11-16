import * as Cesium from "@/3dMap/sdk/cesium";
const cartesian3ToLonLat = cartesian3 => {
  // 将 Cartesian3 坐标转换为 Cartographic 坐标
  let cartographic = Cesium.Cartographic.fromCartesian(cartesian3);
  // 获取经度、纬度和高度
  let longitude = Cesium.Math.toDegrees(cartographic.longitude);
  let latitude = Cesium.Math.toDegrees(cartographic.latitude);
  let height = cartographic.height;
  return [longitude, latitude, height];
};
export { cartesian3ToLonLat };
