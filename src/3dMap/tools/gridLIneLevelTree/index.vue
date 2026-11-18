<template>
  <el-tree
    node-key="id"
    :props="treeProps"
    :data="gridTreeData"
    :default-expand-all="expand"
    :default-checked-keys="defaultCheckedKeys"
    show-checkbox
    @check="treeCheck"
  >
    <template #default="{ data }">
      <span class="grid-tree-node">
        <span>{{ data.name }}</span>
        <!-- 网格参考系这一行后面选颜色，改的是网格对象颜色；showColorPicker 控制是否展示 -->
        <el-color-picker
          v-if="showColorPicker && data.id === 'gridLevelAll' && !data.level"
          v-model="gridColor"
          :clearable="false"
          size="small"
          @click.stop
          @change="changeColor"
        />
      </span>
    </template>
  </el-tree>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from "vue";
// store
/**叠加网格 */
import gridLevelLines from "@/3dMap/sdkUtils/airspaceGridLevelLines";
import { viewer } from "@/3dMap/global";
/** expand 展开图层树；levels 默认勾选层级；color 默认颜色；showColorPicker 是否展示颜色选择器 */
const { expand, levels, color, showColorPicker } = defineProps({
  expand: {
    type: Boolean,
    default: false
  },
  levels: {
    type: Array,
    default: () => []
  },
  color: {
    type: String,
    default: "#ffffff"
  },
  showColorPicker: {
    type: Boolean,
    default: true
  }
});
const treeProps = {
  label: "name",
  children: "children"
};
const gridTreeData = ref([
  {
    id: "gridLevelAll",
    name: "网格参考系",
    children: [
      {
        id: "gridLevel_1",
        name: "30分",
        level: 1
      },
      {
        id: "gridLevel_2",
        name: "15分",
        level: 2
      },
      {
        id: "gridLevel_3",
        name: "5分",
        level: 3
      },
      {
        id: "gridLevel_4",
        name: "1分",
        level: 4
      },
      {
        id: "gridLevel_5",
        name: "30秒",
        level: 5
      },
      {
        id: "gridLevel_6",
        name: "15秒",
        level: 6
      },
      {
        id: "gridLevel_7",
        name: "5秒",
        level: 7
      },
      {
        id: "gridLevel_8",
        name: "1秒",
        level: 8
      }
    ]
  }
]);
/** 按层级找到节点 id，供树默认勾选 */
const defaultCheckedKeys = (levels || [])
  .map(level => `gridLevel_${level}`)
  .filter(id => gridTreeData.value[0].children.some(item => item.id === id));
const gridColor = ref(color);
/** 画布已有宽高才算能取视野。刷新时地图还在 0 尺寸宿主里 */
function mapCanvasReady() {
  const canvas = viewer?.canvas;
  return !!canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0;
}
let waitCanvas = 0;
let leavePage = false;
/** 按默认勾选加载。颜色先写入，后面新建的网格线跟着用 */
function loadCheckedLevels() {
  if (color) gridLevelLines.setColor(color);
  if (!levels?.length) return;
  gridLevelLines.loadGridByLevels(levels);
}
onMounted(() => {
  // 从别的示例切过来时画布已有尺寸，马上加载。
  // 停在本页刷新时，本组件比 MapView 更早挂上，画布宽高仍是 0；
  // 这时取到的是整球，30 分网格会一次建出几十万条线，三维直接崩掉。
  const loadWhenCanvasReady = () => {
    if (leavePage) return;
    if (mapCanvasReady()) {
      waitCanvas = 0;
      loadCheckedLevels();
      return;
    }
    waitCanvas = requestAnimationFrame(loadWhenCanvasReady);
  };
  loadWhenCanvasReady();
});
onBeforeUnmount(() => {
  leavePage = true;
  if (waitCanvas) cancelAnimationFrame(waitCanvas);
  // 组件注销时清掉二三维已加载的全部网格
  gridLevelLines.clear();
});
/** 颜色变化后走网格对象的 setColor，二三维已画出的线一起更新 */
const changeColor = color => {
  if (!color) return;
  gridLevelLines.setColor(color);
};
const treeCheck = (checkedNodes, checkedKeys) => {
  let levels = [];
  checkedKeys.checkedNodes.forEach(item => {
    if (item.level) {
      levels.push(item.level);
    }
  });
  gridLevelLines.loadGridByLevels(levels);
};
</script>
<style scoped lang="scss">
:deep(.el-tree-node__label) {
  flex: 1;
  min-width: 0;
}
.grid-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding-right: 4px;
}
</style>
