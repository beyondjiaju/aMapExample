import * as Cesium from "@/3dMap/sdk/cesium";
const geoJsonDataSourceFromUrl = (data, options) => {
  const defaultOptions = {};
  options = Object.assign(defaultOptions, options);
  return new Promise((resolve, reject) => {
    if (data) {
      Cesium.GeoJsonDataSource.load(data).then(datasource => {
        const retDataSource = new Cesium.CustomDataSource();
        // name
        datasource.name = Cesium.defaultValue(options.name, datasource.name);
        // 矢量
        datasource.entities.values.forEach(entity => {
          if (entity.polygon) {
            retDataSource.entities.add({
              polyline: Object.assign(options.polyline, {
                positions: entity.polygon.hierarchy.getValue().positions
              }),
              polygon: Object.assign(options.polygon, {
                hierarchy: entity.polygon.hierarchy.getValue().positions
              })
            });
          }
          if (entity.polyline) {
            retDataSource.entities.add({
              polyline: Object.assign(options.polyline, {
                positions: entity.polyline.positions.getValue()
              })
            });
          }
          // for (const [type, typeStyle] of Object.entries(options)) {
          //   if (type != "name" && entity[type]) {
          //     for (const [key, value] of Object.entries(typeStyle)) {
          //       entity[type][key] = value;
          //     }
          //   }
          // }
        });
        resolve(retDataSource);
      });
    }
  });
};
export { geoJsonDataSourceFromUrl };
