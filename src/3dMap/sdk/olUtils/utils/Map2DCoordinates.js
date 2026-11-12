import { getHeight } from "./HeightTool";
import { coordinateConversionTool } from "@/3dMap/sdk/cesiumUtils";
class Map2DCoordinates {
  constructor(option) {
    const that = this;
    // 记录viewer
    that.map = option.map;
    if (!that.map) return;
    that.type = option.type || 0;
    that.show = true;
    // 创建、设置
    if (option.id) {
      that.dom = document.getElementById(option.id);
    } else {
      let div = document.createElement("div");
      div.id = that.map.container.id + "Map3DCoordinates";
      that.dom = that.map.container.appendChild(div);
    }
    that.dom.className = "map2DCoordinates";
    that.dom.innerHTML = `
            <p class="map3DCoordinates_scale"></p>
            <p class="map3DCoordinates_eyeHeight">视点高:</p>
            <p class="map3DCoordinates_latitude">0</p>
            <p class="map3DCoordinates_longitude">0</p>
        `;
    const distanceLegendDiv =
      document.getElementsByClassName("ol-scale-line")[0];
    if (distanceLegendDiv) {
      document
        .getElementsByClassName("ol-overlaycontainer-stopevent")[0]
        .removeChild(distanceLegendDiv);
      that.dom
        .querySelector(".map3DCoordinates_scale")
        .appendChild(distanceLegendDiv);
    }
    const positionDiv = document.getElementsByClassName("ol-mouse-position")[0];
    positionDiv.style.display = "none";
    const setPosition = () => {
      const coordinates = positionDiv.innerText.split(",");
      if (coordinates.length < 2) return;
      let longitude,
        latitude,
        longitude_unit,
        latitude_unit,
        showLongitude,
        showLatitude;
      // 根据展示类型保留小数
      if (that.type == 0) {
        longitude = Number(coordinates[0]).toFixed(5);
        latitude = Number(coordinates[1]).toFixed(5);
      } else {
        longitude = Number(coordinates[0]).toFixed(7);
        latitude = Number(coordinates[1]).toFixed(7);
      }
      // 单位处理
      if (longitude > 0) {
        longitude_unit = "E";
      } else if (longitude < 0) {
        longitude_unit = "W";
      }
      if (latitude > 0) {
        latitude_unit = "N";
      } else if (latitude < 0) {
        latitude_unit = "S";
      }
      // 根据类型展示
      if (that.type == 0) {
        showLongitude = `${longitude_unit} ${longitude}`;
        showLatitude = `${latitude_unit} ${latitude}`;
      } else {
        const degrees_new = coordinateConversionTool.degreesToDegrees60(
          longitude,
          latitude,
          true
        );
        showLongitude = `${degrees_new.showLongString}`;
        showLatitude = `${degrees_new.showLatString}`;
      }
      that.dom.querySelector(".map3DCoordinates_longitude").innerHTML =
        showLongitude;
      that.dom.querySelector(".map3DCoordinates_latitude").innerHTML =
        showLatitude;
    };
    // 创建一个 MutationObserver 实例
    const observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) {
        if (mutation.type === "childList") {
          setPosition();
        }
      }
    });
    // 启动观察
    observer.observe(positionDiv, {
      childList: true,
      attributes: true,
      subtree: true
    });
    that.map.on("moveend", () => {
      const h = getHeight(that.map);
      let heightText;
      if (h < 10000) {
        heightText = h.toFixed(2) + " m";
      } else {
        heightText = (h / 1000).toFixed(2) + " km";
      }
      that.dom.querySelector(".map3DCoordinates_eyeHeight").innerHTML =
        "视点高: " + heightText;
    });
  }
}
const map2DCoordinates = option => {
  return new Map2DCoordinates(option);
};
export { map2DCoordinates };
