<template>
  <ul
    :key="updataPosition"
    v-autoFocusActive="{
      enterCallback: addRow
    }"
  >
    <li
      v-for="(item, key) in editData.coordinates"
      :key="key"
      :class="{ 'coordinate-highlight': highlightIndex == key }"
    >
      <div class="position">
        <PositionEdit
          v-if="positionType == 'degrees'"
          :position="{ lon: item[0], lat: item[1] }"
          :positionSort="positionSort"
          :index="key"
          @change="positionChange"
        />
        <PositionEdit
          v-else
          :position="editData.coordinatesDMS[key]"
          :positionSort="positionSort"
          :index="key"
          @change="positionChange"
        />
      </div>
      <div class="button">
        <el-icon @click="deleteRow(key)" :class="{ noEvent: noEvent }">
          <Minus />
        </el-icon>
        <el-icon @click="addRow(key)">
          <Plus />
        </el-icon>
      </div>
    </li>
  </ul>
</template>
<script setup lang="ts">
import { ref, onBeforeMount, computed } from "vue";
import { Plus, Minus } from "@element-plus/icons-vue";
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
  }
});
const emits = defineEmits(["change"]);
const positionType = defineModel<string>("positionType");
const positionSort = defineModel<string>("positionSort");
// 当前高亮的坐标行索引（由父组件传入，-1 表示无高亮）
const highlightIndex = defineModel<number>("highlightIndex");
/**不可操作 */
const noEvent = computed(() => {
  if (
    editData.value.type == "polyline" &&
    editData.value.coordinates.length <= 2
  ) {
    return true;
  }
  if (
    editData.value.type !== "polyline" &&
    editData.value.coordinates.length <= 3
  ) {
    return true;
  }
  return false;
});
/**变化更新图形 */
const positionChange = (p, index) => {
  const oldHeight = editData.value.coordinates[index]?.[2];
  let coordinate = [p.degrees.lon, p.degrees.lat];
  if (editData.value.coordinates[index].length > 2) {
    coordinate[2] = oldHeight;
  }
  editData.value.coordinates.splice(index, 1, coordinate);
  editData.value.coordinatesDMS.splice(index, 1, p.degrees60);
  emits("change", editData.value, {
    pointIndex: index
  });
};
/**添加行 */
const updataPosition = ref(0);
const addRow = index => {
  editData.value.coordinates.splice(index + 1, 0, [0, 0]);
  editData.value.coordinatesDMS.splice(
    index + 1,
    0,
    cloneDeep(position60_default)
  );
  updataPosition.value++;
};
/**删除行 */
const deleteRow = index => {
  if (noEvent.value) return;
  editData.value.coordinates.splice(index, 1);
  editData.value.coordinatesDMS.splice(index, 1);
  emits("change", editData.value);
  updataPosition.value++;
};
/**设置修改数据 */
const setData = data => {
  editData.value = cloneDeep(data);
};
onBeforeMount(() => {
  setData(props.data);
});
defineExpose({ setData });
</script>
<style lang="scss" scoped>
ul {
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 3px;
    padding: 2px 5px;
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
    /* 高亮当前编辑的坐标行 */
    &.coordinate-highlight {
      background-color: var(--color-bg-3);
      border-radius: 3px;
      outline: 1px solid var(--color-main-1, #409eff);
    }
  }
}
.noEvent {
  cursor: no-drop;
}
</style>
