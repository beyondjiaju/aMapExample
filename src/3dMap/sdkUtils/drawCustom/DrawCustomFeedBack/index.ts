import { cloneDeep, mapEmitter } from "@/3dMap/interface";
import * as Cesium from "@/3dMap/sdk/cesium";
import { DrawCustomFeedBack as DrawCustomFeedBackCesium } from "./DrawCustomFeedBackCesium";
import { DrawCustomFeedBack as DrawCustomFeedBackOl } from "./DrawCustomFeedBackOl";
import mapData from "@/3dMap/store/map";
/**监听 */
class DrawCustomFeedBack {
  newDrawHandlerFeedBackByMode: any;
  mapEmitterOff: any;
  historyData: any;
  constructor() {
    this.historyData = {};
    this.setDrawHandlerFeedBackByMode();
    // 2\3d切换更新
    this.mapEmitterOff = mapEmitter.on(
      "mapEvents:mapModeChangeSetSdkUtilsByCurrentMode",
      () => {
        this.newDrawHandlerFeedBackByMode?.destroy();
        this.newDrawHandlerFeedBackByMode = null;
        this.setDrawHandlerFeedBackByMode();
        for (let value of Object.values(this.historyData)) {
          this.add(value);
        }
      }
    );
  }
  setDrawHandlerFeedBackByMode() {
    const mapMode = mapData().mapMode;
    if (mapMode === "cesium") {
      this.newDrawHandlerFeedBackByMode = new DrawCustomFeedBackCesium();
    }
    if (mapMode === "ol") {
      this.newDrawHandlerFeedBackByMode = new DrawCustomFeedBackOl();
    }
  }
  /**添加回显
   * @param { Object  } option {data, style, callback}
   * @param { Object  } option.data point,polyline,circle,polygon,rectangle,sector,rectangleCircle
   * @param { String  } data.lineRoute polyline类型存在此数据绘制航路 style中lineRouteShowCenterLine设置位true同时展示
   * @param { Object  } option.style
   * @param { String  } style.color 颜色 全部生效
   * @param { Number  } style.alpha polyline以外使用
   * @param { String  } style.image point传递image会加载一个图标，不传自动绘制点，polyline，polygon，circle计算中心点并加载图标
   * @param { String  } style.imageColor
   * @param { Number  } style.imageScale
   * @param { String  } style.text 文字label
   * @param { String  } style.textColor 文字颜色 不输入默认使用color
   * @param { Array   } style.textTranslate 文字偏移
   * @param { Number  } style.textScale 文字大小
   * @param { String  } style.html
   * @param { Boolean } style.htmlIsDrag html可拖拽
   * @param { Boolean } style.htmlDragLineColor html 拖拽线颜色
   * @param { Boolean } style.htmlDragLineWidth html 拖拽线宽度
   * @param { Number  } style.htmlAlignmentMode 对齐方式 默认底部中心 0，1，2，3，4，5，6，7，8
   * @param { Array   } style.htmlTranslate html偏移
   * @param { Boolean } style.outline 边线
   * @param { Number  } style.lineWidth 边线宽度
   * @param { String  } style.lineType 边线样式 solid dash arrow glow outline
   * @param { Boolean } style.lineClampToGround 边线是否贴地
   * @param { Boolean } style.lineRouteShowCenterLine data.lineRoute 有数据默认不展示航线 设置true 同时展示
   * @param { Number  } style.dashLength 边线样式为dash 设置dash距离
   * @param { Number  } style.glowPower 边线样式为glow 发光占比 0-1
   * @param { Number  } style.lineOutlineColor outline边线颜色
   * @param { Number  } style.lineOutlineWidth outline边线宽度
   * @param { Number  } style.minHeight circle,polygon,rectangle,sector,rectangleCircle 绘制体最低高度
   * @param { Number  } style.maxHeight circle,polygon,rectangle,sector,rectangleCircle 绘制体最高高度
   */
  add(option) {
    if (!option.data) {
      console.warn("feedback回显数据data缺失");
      return;
    }
    if (!option.data.id) {
      option.data.id = Cesium.createGuid();
    }
    this.newDrawHandlerFeedBackByMode?.add(cloneDeep(option));
    // 回显数据记录
    this.historyData[option.data.id] = option;
  }
  /**定位 */
  flyTo(id = null) {
    this.newDrawHandlerFeedBackByMode?.flyTo(id);
  }
  setView(id = null) {
    this.newDrawHandlerFeedBackByMode?.setView(id);
  }
  /**根据id高亮 */
  heightLightById(id, color = "#DC143C") {
    if (!id) {
      console.warn("feedback未输入高亮id，无法执行高亮");
      return;
    }
    this.newDrawHandlerFeedBackByMode?.heightLightById(id, color);
  }
  /**根据id移除高亮 */
  removeHeightLightById(id) {
    this.newDrawHandlerFeedBackByMode?.removeHeightLightById(id);
  }
  /**移除全部高亮 */
  removeAllHeightLight() {
    this.newDrawHandlerFeedBackByMode?.removeAllHeightLight();
  }
  /**根据id移除 */
  removeById(id) {
    this.newDrawHandlerFeedBackByMode?.removeById(id);
    delete this.historyData[id];
  }
  /**移除全部回显 */
  removeAll() {
    this.newDrawHandlerFeedBackByMode?.removeAll();
    this.historyData = {};
  }
  destroy() {
    this.newDrawHandlerFeedBackByMode?.destroy();
    this.newDrawHandlerFeedBackByMode = null;
    this.mapEmitterOff();
    this.mapEmitterOff = null;
    this.historyData = null;
  }
}
export { DrawCustomFeedBack };
