export * from "./config";
export * as style from "ol/style";
export * as geom from "ol/geom";
export { default as Map } from "ol/Map";
export { default as View } from "ol/View";
export { default as Feature } from "ol/Feature";
export { default as Collection } from "ol/Collection";
export * as Extent from "ol/extent";
export {
  Image as ImageLayer,
  Tile as TileLayer,
  WebGLTile as WebGLTileLayer,
  Vector as VectorLayer
} from "ol/layer";
export {
  XYZ,
  OSM,
  ImageArcGISRest,
  Vector as VectorSource,
  ImageStatic
} from "ol/source";
export { ScaleLine, OverviewMap, MousePosition, Rotate } from "ol/control";
export { GeoJSON } from "ol/format";
export { toLonLat, fromLonLat, transform, transformExtent } from "ol/proj";
