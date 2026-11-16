<template>
  <ul>
    <li>
      <p class="label" :style="{ width: `${labelWidth}px` }">坐标：</p>
      <div
        class="position"
        :style="{ width: `calc(100% - ${labelWidth}px)` }"
        :key="editData"
        v-autoFocusActive
      >
        <PositionEdit
          v-if="positionType == 'degrees'"
          :position="{
            lon: editData.coordinate[0],
            lat: editData.coordinate[1]
          }"
          :positionSort="positionSort"
          @change="positionChange"
        />
        <PositionEdit
          v-else
          :position="editData.coordinateDMS"
          :positionSort="positionSort"
          @change="positionChange"
        />
      </div>
    </li>
    <li>
      <p class="label" :style="{ width: `${labelWidth}px` }">文字：</p>
      <div
        class="position"
        :style="{ width: `calc(100% - ${labelWidth}px)` }"
        :key="editData"
      >
        <el-input v-model="editData.text" @input="defaultChange" />
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
  editData.value.coordinate = [p.degrees.lon, p.degrees.lat];
  editData.value.coordinateDMS = p.degrees60;
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
