import { drawImageByType } from "@/3dMap/tools/drawCustom/config";
// 绘制相关参数
export const defaultDrawData = [
  {
    type: "point",
    name: "点",
    img: drawImageByType.point
  },
  {
    type: "polyline",
    name: "线",
    img: drawImageByType.polyline
  },
  {
    type: "polygon",
    name: "多边形",
    img: drawImageByType.polygon
  },
  {
    type: "rectangle",
    name: "矩形",
    img: drawImageByType.rectangle
  },
  {
    type: "circle",
    name: "圆形",
    img: drawImageByType.circle
  },
  {
    type: "sector",
    name: "扇形",
    img: drawImageByType.sector
  },
  {
    type: "rectangleCircle",
    name: "长圆",
    img: drawImageByType.rectangleCircle
  },
  {
    type: "input",
    name: "输入",
    img: drawImageByType.input
  }
];
