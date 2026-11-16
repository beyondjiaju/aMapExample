import { cloneDeep } from "@/3dMap/interface";
import * as Cesium from "@/3dMap/sdk/cesium";
import { viewer } from "@/3dMap/global";
import {
  HeightLightEntity,
  PolylineAntialiasingMaterialProperty,
  shapeCoordinates,
  HtmlTag,
  HtmlTagCollection,
  PolylineVolumeFromPolygon
} from "@/3dMap/sdk/cesiumUtils";
import { getCenterByCoordinates } from "@/3dMap/sdk/publicUtils";
import { labelOption } from "@/3dMap/const/graphicOption";
import { getRectangleByDatasource } from "../utils/getRectangleByDatasource";
/**监听 */
class DrawCustomFeedBack {
  datasource: any;
  htmlTagCollection: any;
  newHeightLightEntity: any;
  polylineVolumeFromPolygon: any;
  constructor() {
    // 高亮对象
    this.newHeightLightEntity = new HeightLightEntity(viewer);
    // route
    this.polylineVolumeFromPolygon = new PolylineVolumeFromPolygon(viewer);
    // 回显存储
    this.datasource = new Cesium.CustomDataSource();
    viewer.dataSources.add(this.datasource);
    this.htmlTagCollection = new HtmlTagCollection(viewer);
  }
  /**添加回显
   * @param { Object } option {data, style, callback}
   */
  add(option) {
    // data
    const data = Object.assign(
      {
        lineRoute: null // 带宽度航线数据
      },
      option.data
    );
    // style
    const style = Object.assign(
      {
        color: "#FF4500",
        alpha: 0.7,
        image: "",
        imageColor: "",
        imageScale: 1,
        text: "",
        textColor: "",
        textTranslate: [0, 0],
        textScale: 1,
        html: "",
        htmlIsDrag: false,
        htmlDragLineColor: "#ffffff",
        htmlDragLineWidth: 1.5,
        htmlAlignmentMode: 7,
        htmlTranslate: [0, -25],
        outline: true,
        lineWidth: 5,
        lineType: "solid",
        lineClampToGround: true,
        lineRouteShowCenterLine: false,
        dashLength: 16,
        glowPower: 0.2,
        lineOutlineColor: "#ffffff",
        lineOutlineWidth: 4,
        minHeight: 0,
        maxHeight: 1
      },
      option.style
    );
    // entityOption
    let entityOption;
    if (data.type == "point") {
      entityOption = this.getPointOption(data, style);
    }
    if (data.type == "polyline") {
      if (data.lineRoute) {
        // polyline route
        this.addPolylineRoute(data, style);
      }
      if (!data.lineRoute || style.lineRouteShowCenterLine) {
        // poolyline
        entityOption = this.getPolylineOption(data, style);
      }
    }
    if (data.type == "circle") {
      entityOption = this.getCircleOption(data, style);
    }
    if (
      ["rectangle", "polygon", "sector", "rectangleCircle"].indexOf(
        data.type
      ) >= 0
    ) {
      entityOption = this.getPolygonOption(data, style);
    }
    // 添加
    if (entityOption) this.datasource.entities.add(entityOption);
    // 回显结束回调
    if (option.callback && option.callback instanceof Function)
      option.callback(this.datasource);
  }
  /**定位 */
  flyTo(id = null) {
    if (id) {
      const entity = this.datasource.entities.getById(id);
      viewer.flyTo(entity);
      return;
    }
    if (!this.datasource?.entities?.values.length) return;
    const rectangle = getRectangleByDatasource(this.datasource);
    viewer.camera.flyTo({
      destination: rectangle,
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    });
  }
  setView(id = null) {
    if (id) {
      const entity = this.datasource.entities.getById(id);
      viewer.zoomTo(entity);
      return;
    }
    if (!this.datasource?.entities?.values.length) return;
    const rectangle = getRectangleByDatasource(this.datasource);
    viewer.camera.setView({
      destination: rectangle,
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-90),
        roll: 0
      }
    });
  }
  /**根据id高亮 */
  heightLightById(id, color = "#DC143C") {
    const hlOption = {
      color,
      alpha: 0.9
    };
    const heightLightEntity = this.datasource.entities.getById(id);
    if (heightLightEntity) {
      this.newHeightLightEntity.add(heightLightEntity, hlOption);
      return;
    }
    const heightEntities = this.getRouteEntitiesById(id);
    heightEntities?.forEach(entity => {
      this.newHeightLightEntity.add(entity, hlOption);
    });
  }
  /**根据id移除高亮 */
  removeHeightLightById(id) {
    const heightLightEntity = this.datasource.entities.getById(id);
    if (heightLightEntity) {
      this.newHeightLightEntity.removeById(id);
      return;
    }
    const heightEntities = this.getRouteEntitiesById(id);
    heightEntities?.forEach(entity => {
      this.newHeightLightEntity.removeById(entity.id);
    });
  }
  /**移除全部高亮 */
  removeAllHeightLight() {
    this.newHeightLightEntity.removeAll();
  }
  /**根据id移除 */
  removeById(id) {
    this.htmlTagCollection.removeById(id, true);
    if (this.datasource.entities.getById(id)) {
      this.datasource.entities.removeById(id);
      return;
    }
    const removeEntities = this.getRouteEntitiesById(id);
    removeEntities?.forEach(entity => {
      this.datasource.entities.remove(entity);
    });
  }
  /**移除全部回显 */
  removeAll() {
    this.datasource.entities.removeAll();
    this.htmlTagCollection.removeAll(true);
  }
  /**添加点 */
  getPointOption(data, option) {
    const position = Cesium.Cartesian3.fromDegrees(
      data.coordinate[0],
      data.coordinate[1]
    );
    const label = this.getLabel(option);
    const properties = this.getProperties(option);
    let ret = {
      id: data.id,
      position,
      billboard: null,
      point: null,
      label,
      properties
    };
    if (option.image) {
      ret.billboard = {
        image: option.image,
        width: 60,
        height: 60,
        scaleByDistance: new Cesium.NearFarScalar(
          0,
          option.imageScale,
          1000000,
          0
        ),
        disableDepthTestDistance: Number.MAX_VALUE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM
      };
      if (option.imageColor) {
        ret.billboard.color = Cesium.Color.fromCssColorString(
          option.imageColor
        );
      }
    } else {
      ret.point = {
        pixelSize: 10,
        color: Cesium.Color.fromCssColorString(option.color).withAlpha(
          option.alpha
        ),
        outline: true,
        outlineWidth: 3,
        outlineColor: Cesium.Color.fromCssColorString(option.color)
      };
    }
    if (option.html) this.addHtmlTag(data.id, position, option);
    return ret;
  }
  /**添加route */
  addPolylineRoute(data, option) {
    let routeData = [];
    data.lineRoute.forEach((point, index) => {
      routeData.push(
        Object.assign(
          {
            fillColor: option.color,
            fillAlpha: option.alpha,
            properties: {
              id: data.id
            }
          },
          point
        )
      );
    });
    this.polylineVolumeFromPolygon.add({
      data: routeData,
      addToViewer: false,
      datasource: this.datasource
    });
    // if (option.html) this.addHtmlTag(data.id, position, option);
  }
  /**获取加载航路数据 */
  getRouteEntitiesById(id) {
    return this.datasource.entities.values.filter(entity => {
      const entityId = entity.properties.getValue(viewer.clock.currentTime).id;
      return entityId == id;
    });
  }
  /**添加线 */
  getPolylineOption(data, option) {
    // 坐标
    const positions =
      data.coordinates[0].length > 2
        ? Cesium.Cartesian3.fromDegreesArrayHeights(
            data.coordinates.flat(Infinity)
          )
        : Cesium.Cartesian3.fromDegreesArray(data.coordinates.flat(Infinity));
    let position;
    if (data.coordinates.length > 2) {
      const centerIndex = Math.floor(data.coordinates.length / 2);
      const coorCenter = data.coordinates[centerIndex];
      position = Cesium.Cartesian3.fromDegrees(coorCenter[0], coorCenter[1]);
    } else {
      const center = Cesium.BoundingSphere.fromPoints(positions).center;
      const center_carto = Cesium.Cartographic.fromCartesian(center);
      position = Cesium.Cartesian3.fromRadians(
        center_carto.longitude,
        center_carto.latitude
      );
    }
    const label = this.getLabel(option);
    const billboard = this.getBillboard(option);
    const lineData = this.getLineData(option);
    const properties = this.getProperties(option);
    let ret = {
      id: data.id,
      position,
      polyline: {
        positions,
        material: lineData.material,
        width: lineData.lineWidth,
        clampToGround: option.lineClampToGround
      },
      billboard,
      label,
      properties
    };
    if (option.html && !data.lineRoute)
      this.addHtmlTag(data.id, position, option);
    return ret;
  }
  /**添加面 */
  getPolygonOption(data, option) {
    let coordinates = data.coordinates;
    // 扇形坐标计算
    if (data.type == "sector") {
      const center = data.points.first,
        radius = data.radius,
        startAngle = data.startAngle,
        endAngle = data.endAngle;
      coordinates = shapeCoordinates.getSectorPositionsByRadius({
        center,
        radius,
        startAngle,
        endAngle
      });
    }
    // 长圆坐标计算
    if (data.type == "rectangleCircle") {
      const first = data.points.first,
        second = data.points.second,
        radius = data.radius;
      // 获取长圆边界坐标
      coordinates = shapeCoordinates.getRectangleCirclePositionsByRadius({
        first,
        second,
        radius
      });
    }
    // 坐标
    const hierarchy =
      coordinates[0].length > 2
        ? Cesium.Cartesian3.fromDegreesArrayHeights(coordinates.flat(Infinity))
        : Cesium.Cartesian3.fromDegreesArray(coordinates.flat(Infinity));
    const center = getCenterByCoordinates(coordinates);
    const position = Cesium.Cartesian3.fromDegrees(center[0], center[1]);
    const label = this.getLabel(option);
    const billboard = this.getBillboard(option);
    const properties = this.getProperties(option);
    let polyline = null;
    if (option.outline) {
      let polylinePositions = [];
      coordinates.map(p => {
        polylinePositions.push([p[0], p[1], option.minHeight]);
      });
      polylinePositions.push(polylinePositions[0]);
      const lineData = this.getLineData(option);
      polyline = {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(
          polylinePositions.flat(Infinity)
        ),
        width: lineData.lineWidth,
        material: lineData.material
      };
    }
    let ret = {
      id: data.id,
      position,
      polygon: {
        hierarchy,
        material: Cesium.Color.fromCssColorString(option.color).withAlpha(
          option.alpha
        ),
        height: option.minHeight,
        extrudedHeight: option.maxHeight
      },
      polyline,
      billboard,
      label,
      properties
    };
    if (option.html) this.addHtmlTag(data.id, position, option);
    return ret;
  }
  /**添加圆 */
  getCircleOption(data, option) {
    const position = Cesium.Cartesian3.fromDegrees(
      data.center[0],
      data.center[1]
    );
    const label = this.getLabel(option);
    const billboard = this.getBillboard(option);
    const properties = this.getProperties(option);
    let polyline = null;
    if (option.outline) {
      let polylinePositions = shapeCoordinates.getCirclePositions(
        data.center,
        data.radius,
        "degrees"
      );
      polylinePositions.forEach(item => {
        item[2] = option.minHeight;
      });
      // 样式
      const lineData = this.getLineData(option);
      polyline = {
        positions: Cesium.Cartesian3.fromDegreesArrayHeights(
          polylinePositions.flat(Infinity)
        ),
        width: lineData.lineWidth,
        material: lineData.material
      };
    }
    let ret = {
      id: data.id,
      position,
      ellipse: {
        semiMajorAxis: data.radius,
        semiMinorAxis: data.radius,
        material: Cesium.Color.fromCssColorString(option.color).withAlpha(
          option.alpha
        ),
        height: option.minHeight,
        extrudedHeight: option.maxHeight
      },
      polyline,
      billboard,
      label,
      properties
    };
    if (option.html) this.addHtmlTag(data.id, position, option);
    return ret;
  }
  /**获取label option */
  getLabel(option) {
    const color = Cesium.Color.fromCssColorString(
      option.textColor || option.color
    );
    let label = null;
    if (option.text) {
      label = cloneDeep(labelOption);
      label.text = String(option.text);
      label.fillColor = color;
      label.pixelOffset = new Cesium.Cartesian2(
        option.textTranslate[0],
        option.textTranslate[1]
      );
      label.scaleByDistance = new Cesium.NearFarScalar(
        0,
        option.textScale,
        1000000,
        0
      );
      label.verticalOrigin = Cesium.VerticalOrigin.TOP;
    }
    return label;
  }
  /**获取billboard option */
  getBillboard(option) {
    let billboard = null;
    if (option.image) {
      billboard = {
        image: option.image,
        width: 60,
        height: 60,
        scaleByDistance: new Cesium.NearFarScalar(0, 1, 1000000, 0)
      };
      if (option.imageColor) {
        billboard.color = Cesium.Color.fromCssColorString(option.imageColor);
      }
    }
    return billboard;
  }
  getLineData(option) {
    // 样式
    let material;
    switch (option.lineType) {
      case "dash":
        material = new Cesium.PolylineDashMaterialProperty({
          color: Cesium.Color.fromCssColorString(option.color),
          dashLength: option.dashLength
        });
        break;
      case "arrow":
        material = new Cesium.PolylineArrowMaterialProperty(
          Cesium.Color.fromCssColorString(option.color)
        );
        break;
      case "glow":
        material = new Cesium.PolylineGlowMaterialProperty({
          color: Cesium.Color.fromCssColorString(option.color),
          glowPower: option.glowPower
        });
        break;
      case "outline":
        material = new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.fromCssColorString(option.color),
          outlineColor: Cesium.Color.fromCssColorString(
            option.lineOutlineColor
          ),
          outlineWidth: option.lineOutlineWidth
        });
        break;
      default:
        // solid
        material = new PolylineAntialiasingMaterialProperty({
          color: Cesium.Color.fromCssColorString(option.color)
        });
        break;
    }
    return {
      material,
      lineWidth: option.lineWidth
    };
  }
  /**获取properties */
  getProperties(option) {
    return Object.assign(option, {
      fillColor: option.color,
      fillAlpha: option.alpha,
      outlineColor: option.color,
      outlineAlpha: 1,
      polylineReplaceOutline: true
    });
  }
  /**添加htmlTag */
  addHtmlTag(id, position, option) {
    const htmlTag = new HtmlTag(viewer, {
      id,
      position,
      html: option.html,
      show: true,
      noEvent: false,
      isDrag: option.htmlIsDrag,
      dragLineColor: option.htmlDragLineColor,
      dragLineWidth: option.htmlDragLineWidth,
      alignmentMode: option.htmlAlignmentMode,
      translate: option.htmlTranslate,
      maxVisibleDistance: 1000000,
      zIndex: 5
    });
    // 添加到集合
    this.htmlTagCollection.add(htmlTag);
  }
  destroy() {
    viewer.dataSources.remove(this.datasource, true);
    this.htmlTagCollection?.destroy();
    this.newHeightLightEntity.destroy();
  }
}
export { DrawCustomFeedBack };
