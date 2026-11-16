/**img */
import { drawImageByType } from "@/3dMap/tools/drawCustom/config";
export const titleData = {
  point: {
    text: "点位",
    img: drawImageByType.point,
    info: "拖动圆点调整位置；"
  },
  label: {
    text: "文字",
    img: drawImageByType.label,
    info: "拖动文字调整位置；"
  },
  polyline: {
    text: "折线",
    img: drawImageByType.polyline,
    info: "拖动圆点调整，双击圆点删除，边线上任意位置拖拽添加坐标；"
  },
  polygon: {
    text: "多边形",
    img: drawImageByType.polygon,
    info: "拖动圆点调整，双击圆点删除，边线上任意位置拖拽添加坐标，拖动图形平移；"
  },
  rectangle: {
    text: "矩形",
    img: drawImageByType.rectangle,
    info: "拖动圆点调整，双击圆点删除，边线上任意位置拖拽添加坐标，拖动图形平移；"
  },
  circle: {
    text: "圆形",
    img: drawImageByType.circle,
    info: "拖动圆点调整，拖动图形平移；"
  },
  sector: {
    text: "扇形",
    img: drawImageByType.sector,
    info: "拖动圆点调整，拖动图形平移；"
  },
  rectangleCircle: {
    text: "长圆",
    img: drawImageByType.rectangleCircle,
    info: "拖动圆点调整，拖动图形平移；"
  }
};
export const position60_default = {
  longType: "E",
  longDegree: "",
  longMinute: "",
  longSecond: "",
  latType: "N",
  latDegree: "",
  latMinute: "",
  latSecond: ""
};
