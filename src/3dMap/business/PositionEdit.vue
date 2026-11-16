<template>
  <div class="position-box" type="degrees" v-if="showType == 'degrees'">
    <template v-if="positionSort == 'lonLat'">
      <el-input-number
        v-model="positionObject.lon"
        :min="-180"
        :max="180"
        @change="change"
      />
      <el-input-number
        v-model="positionObject.lat"
        :min="-90"
        :max="90"
        @change="change"
      />
    </template>
    <template v-else>
      <el-input-number
        v-model="positionObject.lat"
        :min="-90"
        :max="90"
        @change="change"
      />
      <el-input-number
        v-model="positionObject.lon"
        :min="-180"
        :max="180"
        @change="change"
      />
    </template>
  </div>
  <div class="position-box" type="degrees60" v-if="showType == 'degrees60'">
    <template v-if="positionSort == 'lonLat'">
      <el-select v-model="positionObject.longType" @change="change">
        <el-option label="W" value="W" />
        <el-option label="E" value="E" />
      </el-select>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.longDegree"
        autoFocusActive="179"
        @change="change"
        @input="degrees60Input"
      />
      <span>°</span>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.longMinute"
        autoFocusActive="59"
        @change="change"
        @input="degrees60Input"
      />
      <span>′</span>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.longSecond"
        autoFocusActive="59"
        @change="change"
        @input="degrees60Input"
      />
      <span>″</span>
      <el-select v-model="positionObject.latType" @change="change">
        <el-option label="S" value="S" />
        <el-option label="N" value="N" />
      </el-select>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.latDegree"
        autoFocusActive="89"
        @change="change"
        @input="degrees60Input"
      />
      <span>°</span>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.latMinute"
        autoFocusActive="59"
        @change="change"
        @input="degrees60Input"
      />
      <span>′</span>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.latSecond"
        autoFocusActive="59"
        @change="change"
        @input="degrees60Input"
      />
      <span>″</span>
    </template>
    <template v-else>
      <el-select v-model="positionObject.latType" @change="change">
        <el-option label="S" value="S" />
        <el-option label="N" value="N" />
      </el-select>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.latDegree"
        autoFocusActive="89"
        @change="change"
        @input="degrees60Input"
      />
      <span>°</span>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.latMinute"
        autoFocusActive="59"
        @change="change"
        @input="degrees60Input"
      />
      <span>′</span>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.latSecond"
        autoFocusActive="59"
        @change="change"
        @input="degrees60Input"
      />
      <span>″</span>
      <el-select v-model="positionObject.longType" @change="change">
        <el-option label="W" value="W" />
        <el-option label="E" value="E" />
      </el-select>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.longDegree"
        autoFocusActive="179"
        @change="change"
        @input="degrees60Input"
      />
      <span>°</span>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.longMinute"
        autoFocusActive="59"
        @change="change"
        @input="degrees60Input"
      />
      <span>′</span>
      <input
        type="text"
        class="autoFocusActiveInput"
        v-model="positionObject.longSecond"
        autoFocusActive="59"
        @change="change"
        @input="degrees60Input"
      />
      <span>″</span>
    </template>
  </div>
</template>
<script setup lang="ts">
import { ref, onBeforeMount } from "vue";
import { coordinateConversionTool } from "@/3dMap/sdk/cesiumUtils";
import { cloneDeep } from "@/3dMap/interface";
/**坐标对象
 * {lon, lat} degrees
 * 度分秒
 * {
        longType: "E",
        longDegree: "",
        longMinute: "",
        longSecond: "",
        latType: "N",
        latDegree: "",
        latMinute: "",
        latSecond: ""
    } 
 */
const positionObject = ref({});
const showType = ref("");
const props = defineProps({
  index: {
    type: Number,
    default: () => {
      return 0;
    }
  },
  position: {
    type: Object,
    default: () => ({})
  },
  positionSort: {
    type: String,
    default: () => "lonLat"
  }
});
/**坐标变化 */
const emits = defineEmits(["change"]);
const change = () => {
  if (showType.value == "degrees") {
    degreesChange();
  }
  if (showType.value == "degrees60") {
    degrees60Change();
  }
};
/**经纬度变化 */
const degreesChange = () => {
  if (!positionObject.value.lon || !positionObject.value.lat) return;
  const degrees60 = coordinateConversionTool.degreesToDegrees60(
    positionObject.value.lon,
    positionObject.value.lat,
    true
  );
  if (!degrees60) return;
  const ret = {
    degrees: positionObject.value,
    degrees60
  };
  emits("change", ret, props.index);
};
const degrees60Input = () => {
  for (let key in positionObject.value) {
    // 完整正则：全部由数字组成，不能为空
    const regAllNum = /^\d+$/;
    if (
      !regAllNum.test(positionObject.value[key]) &&
      [
        "longDegree",
        "longMinute",
        "longSecond",
        "latDegree",
        "latMinute",
        "latSecond"
      ].includes(key)
    ) {
      positionObject.value[key] = 0;
    }
    if (key == "longDegree" && positionObject.value[key] > 179) {
      positionObject.value[key] = 179;
    }
    if (key == "latDegree" && positionObject.value[key] > 89) {
      positionObject.value[key] = 89;
    }
    if (
      ["longMinute", "longSecond", "latMinute", "latSecond"].includes(key) &&
      positionObject.value[key] > 59
    ) {
      positionObject.value[key] = 59;
    }
  }
};
/**度分秒变化 */
const degrees60Change = () => {
  // 转数组
  for (let key in positionObject.value) {
    if (
      [
        "longDegree",
        "longMinute",
        "longSecond",
        "latDegree",
        "latMinute",
        "latSecond"
      ].includes(key)
    ) {
      positionObject.value[key] = Number(positionObject.value[key]);
    }
  }
  const degrees60New = coordinateConversionTool.degrees60ObjectFormat(
    cloneDeep(positionObject.value)
  );
  const point = coordinateConversionTool.degrees60ToDegrees(
    `${degrees60New.latString}${degrees60New.longString}`
  );
  if (!point) return;
  const ret = {
    degrees: {
      lon: point.longitude,
      lat: point.latitude
    },
    degrees60: degrees60New
  };
  emits("change", ret, props.index);
};
onBeforeMount(() => {
  if (props.position.longType && props.position.latType) {
    showType.value = "degrees60";
  } else {
    showType.value = "degrees";
  }
  for (let key in props.position) {
    if (["longType", "latType"].indexOf(key) >= 0) {
      positionObject.value[key] = props.position[key];
    } else {
      positionObject.value[key] = Number(props.position[key]);
    }
  }
});
</script>
<style lang="scss" scoped>
.autoFocusActiveInput {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 2px;
  padding: 0 5px;
  width: 55px;
}
.position-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  :deep(.el-input) {
    height: 100%;
  }
  :deep(.el-input-number) {
    margin: 2px;
    height: 100%;
    .el-input__wrapper {
      height: 100% !important;
      padding: 0 5px;
      .el-input__inner {
        height: 100%;
      }
    }
    .el-input-number__decrease,
    .el-input-number__increase {
      display: none;
    }
  }
  :deep(.el-select) {
    width: 35px;
    height: 100%;
    .el-select__placeholder {
      width: auto;
    }
    .el-select__wrapper {
      height: 100%;
      min-height: auto;
      padding: 2px 3px;
    }
    .el-icon {
      font-size: 12px;
    }
  }
}
.position-box[type="degrees"] {
  :deep(.el-input-number) {
    width: 50%;
  }
}
.position-box[type="degrees60"] {
  :deep(.el-input-number) {
    width: 35px;
  }
}
</style>
