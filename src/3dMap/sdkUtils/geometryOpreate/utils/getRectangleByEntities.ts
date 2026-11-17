import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer } from "@/3dMap/global";
export default entities => {
  let points = [];
  entities.forEach(entity => {
    if (entity.position) {
      points.push(entity.position.getValue(viewer.clock.currentTime));
    }
    if (entity.polygon) {
      points.push(
        entity.polygon.hierarchy.getValue(viewer.clock.currentTime).positions
      );
    }
    if (entity.polyline) {
      points.push(entity.polyline.positions.getValue(viewer.clock.currentTime));
    }
  });
  const rectangle = Cesium.Rectangle.fromCartesianArray(points.flat(Infinity));
  const buffer = Cesium.Math.toRadians(0.05);
  const ret = new Cesium.Rectangle(
    rectangle.west - buffer,
    rectangle.south - buffer,
    rectangle.east + buffer,
    rectangle.north + buffer
  );
  return ret;
};
