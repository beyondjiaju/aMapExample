<template>
  <ul>
    <li>
      <p class="label" :style="{ width: `${labelWidth}px` }">中心点：</p>
      <div
        class="position"
        :style="{ width: `calc(100% - ${labelWidth}px)` }"
        :key="editData"
        v-autoFocusActive
      >
        <PositionEdit
          v-if="positionType == 'degrees'"
          :position="{
            lon: editData.points.first[0],
            lat: editData.points.first[1]
          }"
          :positionSort="positionSort"
          @change="positionChange"
        />
        <PositionEdit
          v-else
          :position="editData.pointsDMS.first"
          :positionSort="positionSort"
          @change="positionChange"
        />
      </div>
    </li>
    <li>
      <p class="label" :style="{ width: `${labelWidth}px` }">半径：</p>
      <div class="position" :style="{ width: `calc(100% - ${labelWidth}px)` }">
        <el-input-number
          v-model="editData.radius"
          :min="1"
          @change="defaultChange"
        />m
      </div>
    </li>
    <li>
      <p class="label" :style="{ width: `${labelWidth}px` }">开始角度：</p>
      <div class="position" :style="{ width: `calc(100% - ${labelWidth}px)` }">
        <el-input-number
          v-model="editData.startAngle"
          :min="0"
          @change="defaultChange"
        />°
      </div>
    </li>
    <li>
      <p class="label" :style="{ width: `${labelWidth}px` }">结束角度：</p>
      <div class="position" :style="{ width: `calc(100% - ${labelWidth}px)` }">
        <el-input-number
          v-model="editData.endAngle"
          :min="0"
          :max="359"
          @change="defaultChange"
        />°
      </div>
    </li>
  </ul>
</template>
<script setup lang="ts">
import { ref, onBeforeMount, computed } from "vue";
import { cloneDeep } from "@/3dMap/interface";
// component
import PositionEdit from "@/3dMap/business/PositionEdit.vue";
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
  },
  labelWidth: {
    type: Number,
    default: 80
  }
});
const emits = defineEmits(["change"]);
const positionType = defineModel<string>("positionType");
const positionSort = defineModel<string>("positionSort");
/**变化更新图形 */
const positionChange = (p, index) => {
  editData.value.points.first = [p.degrees.lon, p.degrees.lat];
  editData.value.pointsDMS.first = p.degrees60;
  emits("change", editData.value);
};
const defaultChange = () => {
  emits("change", editData.value);
};
/**设置修改数据 */
const setData = data => {
  editData.value = cloneDeep(data);
};
onBeforeMount(() => {
  editData.value = cloneDeep(props.data);
});
defineExpose({ setData });
</script>
<style lang="scss" scoped>
ul {
  li {
    display: flex;
    align-items: center;
    margin-bottom: 3px;
  }
}
</style>
