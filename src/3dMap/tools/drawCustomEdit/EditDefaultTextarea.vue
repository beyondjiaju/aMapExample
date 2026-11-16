<template>
  <el-input
    class="coordinate-text-area"
    type="textarea"
    v-model="coordinatesText"
    :placeholder="placeholder"
    :rows="7"
  />
</template>
<script setup lang="ts">
import { ref, onBeforeMount, computed, watch } from "vue";
import { Plus, Minus } from "@element-plus/icons-vue";
import { cloneDeep, message } from "@/3dMap/interface";
import { coordinateConversionTool } from "@/3dMap/sdk/cesiumUtils";
// component
import { position60_default } from "./config";
// data
let editData = ref({});
const props = defineProps({
  data: {
    type: Object,
    default: () => {
      return {};
    }
  },
  type: {
    type: String,
    default: () => {
      return "";
    }
  }
});
const emits = defineEmits(["change"]);
const positionType = defineModel<string>("positionType");
const positionSort = defineModel<string>("positionSort");
const coordinatesText = ref("");
/**变化更新图形 */
const validateCoord_lonLat = item => {
  const p = item.indexOf("，") >= 0 ? item.split("，") : item.split(",");
  if (p.length != 2 || !p[0] || !p[1]) {
    return true;
  }
  const lon = Number(p[0]);
  const lat = Number(p[1]);
  return !(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90);
};
const validateCoord_latLon = item => {
  const p = item.indexOf("，") >= 0 ? item.split("，") : item.split(",");
  if (p.length != 2 || !p[0] || !p[1]) {
    return true;
  }
  const lon = Number(p[1]);
  const lat = Number(p[0]);
  return !(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90);
};
// 度分秒格式正则：秒数支持整数或小数（小数点后最多 3 位）
const airportNameCoordinateReg60_lonLat =
  /^\s*[EW]\d{1,3}°\d{1,2}[′']\d{1,2}(?:\.\d{1,3})?[″"][NS]\d{1,2}°\d{1,2}[′']\d{1,2}(?:\.\d{1,3})?[″"]\s*$/i;
const airportNameCoordinateReg60_latLon =
  /^\s*[NS]\d{1,2}°\d{1,2}[′']\d{1,2}(?:\.\d{1,3})?[″"][EW]\d{1,3}°\d{1,2}[′']\d{1,2}(?:\.\d{1,3})?[″"]\s*$/i;
const positionLdentify = (p, index) => {
  let coordinatesNew = [];
  let coordinatesDMSNew = [];
  if (positionType.value == "degrees") {
    let coordinates = coordinatesText.value.split("、");
    const invalid = coordinates.find(item => {
      if (item == "" || (item.indexOf("，") < 0 && item.indexOf(",") < 0)) {
        return true;
      }
      return positionSort.value == "lonLat"
        ? validateCoord_lonLat(item)
        : validateCoord_latLon(item);
    });
    if (invalid) {
      setCoordinatesText();
      message("坐标格式或顺序有误", { type: "warning" });
      return;
    }
    coordinates.forEach(c => {
      if (!c) return;
      const p = c.indexOf("，") >= 0 ? c.split("，") : c.split(",");
      const lon = positionSort.value == "lonLat" ? Number(p[0]) : Number(p[1]);
      const lat = positionSort.value == "lonLat" ? Number(p[1]) : Number(p[0]);
      coordinatesNew.push([lon, lat]);
      const degrees60 = coordinateConversionTool.degreesToDegrees60(
        lon,
        lat,
        true
      );
      coordinatesDMSNew.push(degrees60);
    });
  } else {
    let coordinates = coordinatesText.value.split("、");
    const invalid = coordinates.find(item =>
      positionSort.value == "lonLat"
        ? !airportNameCoordinateReg60_lonLat.test(item)
        : !airportNameCoordinateReg60_latLon.test(item)
    );
    if (invalid) {
      setCoordinatesText();
      message("坐标格式或顺序有误", { type: "warning" });
      return;
    }
    coordinates.forEach(coordStr => {
      if (!coordStr) return;
      let p60 = coordStr.replace(/\s+/g, "").replace(/[°′″'"]/g, "");
      if (positionSort.value == "lonLat") {
        const p60LonLat = coordStr.replace(/\s+/g, "").replace(/[°′″'"]/g, "");
        if (p60LonLat.indexOf("N") > 0) {
          p60 =
            p60LonLat.slice(p60LonLat.indexOf("N")) +
            p60LonLat.slice(0, p60LonLat.indexOf("N"));
        } else {
          p60 =
            p60LonLat.slice(p60LonLat.indexOf("S")) +
            p60LonLat.slice(0, p60LonLat.indexOf("S"));
        }
      } else {
        p60 = coordStr.replace(/\s+/g, "").replace(/[°′″'"]/g, "");
      }
      const point = coordinateConversionTool.degrees60ToDegrees(p60);
      const lon = point.longitude;
      const lat = point.latitude;
      const location = [lon, lat];
      coordinatesNew.push(location);
      const degrees60 = coordinateConversionTool.degreesToDegrees60(
        lon,
        lat,
        true
      );
      coordinatesDMSNew.push(degrees60);
    });
  }
  if (editData.value.type == "polyline" && coordinatesNew.length < 2) {
    setCoordinatesText();
    message("折线坐标不可少于两个", { type: "warning" });
    return;
  }
  if (editData.value.type !== "polyline" && coordinatesNew.length < 3) {
    setCoordinatesText();
    message("面坐标不可少于三个", { type: "warning" });
    return;
  }
  editData.value.coordinates = coordinatesNew;
  editData.value.coordinatesDMS = coordinatesDMSNew;
  emits("change", editData.value);
  // 返回识别出的经纬度坐标集合（[[lon, lat], ...]），供定位使用；失败时已提前 return
  return coordinatesNew;
};
const setCoordinatesText = () => {
  if (positionType.value == "degrees") {
    const coordinates = editData.value.coordinates;
    if (positionSort.value == "lonLat") {
      coordinatesText.value = coordinates
        .map(c => `${c[0]}，${c[1]}`)
        .join("、");
    } else {
      coordinatesText.value = coordinates
        .map(c => `${c[1]}，${c[0]}`)
        .join("、");
    }
  } else {
    const coordinates = editData.value.coordinatesDMS;
    if (positionSort.value == "lonLat") {
      coordinatesText.value = coordinates
        .map(c => `${c.showLongString}${c.showLatString}`)
        .join("、");
    } else {
      coordinatesText.value = coordinates
        .map(c => `${c.showLatString}${c.showLongString}`)
        .join("、");
    }
  }
};
const placeholder = computed(() => {
  let pText =
    positionSort.value == "lonLat" ? "经度、纬度顺序" : "纬度、经度顺序";
  if (positionType.value != "degrees") {
    pText += "度分秒";
  }
  return `请输入${pText}格式坐标数据`;
});
/**设置修改数据 */
const setData = data => {
  editData.value = cloneDeep(data);
  setCoordinatesText();
};
watch(
  () => [positionSort.value, positionType.value],
  () => {
    setCoordinatesText();
  }
);
onBeforeMount(() => {
  setData(props.data);
});
defineExpose({ setData, positionLdentify });
</script>
<style lang="scss" scoped>
ul {
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 3px;
    .position {
      width: calc(100% - 40px);
    }
    .button {
      width: 35px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      .el-icon {
        font-size: 14px;
        font-weight: bold;
      }
    }
  }
}
.noEvent {
  cursor: no-drop;
}
</style>
