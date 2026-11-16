/**img */
import pointImg from "./image/point.png";
import labelImg from "./image/label.png";
import polylineImg from "./image/polyline.png";
import polygonImg from "./image/polygon.png";
import rectangleImg from "./image/rectangle.png";
import circleImg from "./image/circle.png";
import sectorImg from "./image/sector.png";
import rectangleCircleImg from "./image/rectangleCircle.png";
import inputImg from "./image/input.png";
export const drawImageByType = {
  point: pointImg,
  label: labelImg,
  polyline: polylineImg,
  polygon: polygonImg,
  rectangle: rectangleImg,
  circle: circleImg,
  sector: sectorImg,
  rectangleCircle: rectangleCircleImg,
  input: inputImg
};
// 绘制相关参数
export const defaultDrawData = [
  {
    type: "point",
    name: "点位",
    img: pointImg
  },
  {
    type: "label",
    name: "文字",
    img: labelImg
  },
  {
    type: "polyline",
    name: "折线",
    img: polylineImg
  },
  {
    type: "polygon",
    name: "多边形",
    img: polygonImg
  },
  {
    type: "rectangle",
    name: "矩形",
    img: rectangleImg
  },
  {
    type: "circle",
    name: "圆形",
    img: circleImg
  },
  {
    type: "sector",
    name: "扇形",
    img: sectorImg
  },
  {
    type: "rectangleCircle",
    name: "长圆",
    img: rectangleCircleImg
  },
  {
    type: "input",
    name: "输入",
    img: inputImg
  }
];
const dmsObject = {
  longType: "E",
  longDegree: "",
  longMinute: "",
  longSecond: "",
  longMillisecond: "",
  latType: "N",
  latDegree: "",
  latMinute: "",
  latSecond: "",
  latMillisecond: "",
  longString: "",
  latString: "",
  showLongString: "",
  showLatString: ""
};
export const editDataByType = {
  point: {
    type: "point",
    coordinate: ["", ""],
    coordinateDMS: dmsObject
  },
  label: {
    type: "label",
    coordinate: ["", ""],
    coordinateDMS: dmsObject
  },
  polyline: {
    type: "polyline",
    coordinates: [["", ""]],
    coordinatesDMS: [dmsObject]
  },
  polygon: {
    type: "polygon",
    coordinates: [["", ""]],
    coordinatesDMS: [dmsObject]
  },
  rectangle: {
    type: "polygon",
    coordinates: [["", ""]],
    coordinatesDMS: [dmsObject]
  },
  circle: {
    type: "circle",
    center: ["", ""],
    centerDMS: dmsObject,
    radius: 1000
  },
  sector: {
    type: "sector",
    points: {
      first: ["", ""]
    },
    pointsDMS: {
      first: dmsObject
    },
    radius: 1000,
    startAngle: 0,
    endAngle: 90
  },
  rectangleCircle: {
    type: "rectangleCircle",
    points: {
      first: ["", ""],
      second: ["", ""]
    },
    pointsDMS: {
      first: dmsObject,
      second: dmsObject
    },
    radius: 1000
  }
};
