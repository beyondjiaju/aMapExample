<template>
  <el-tree
    :props="props"
    :data="gridTreeData"
    show-checkbox
    @check="treeCheck"
  />
</template>
<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { mapEmitter } from "@/3dMap/interface";
// store
/**叠加网格 */
import gridLevelLines from "@/3dMap/utils/business/airspaceGridLevelLines";
const props = {
  label: "name",
  children: "children"
};
const gridTreeData = ref([
  {
    id: "gridLevelAll",
    name: "网格参考系",
    children: [
      {
        id: "gridLevelAll_30",
        name: "30分",
        level: 1
      },
      {
        id: "gridLevelAll_30",
        name: "15分",
        level: 2
      },
      {
        id: "gridLevelAll_30",
        name: "5分",
        level: 3
      },
      {
        id: "gridLevelAll_30",
        name: "1分",
        level: 4
      },
      {
        id: "gridLevelAll_30",
        name: "30秒",
        level: 5
      },
      {
        id: "gridLevelAll_30",
        name: "15秒",
        level: 6
      },
      {
        id: "gridLevelAll_30",
        name: "5秒",
        level: 7
      },
      {
        id: "gridLevelAll_30",
        name: "1秒",
        level: 8
      }
    ]
  }
]);
const treeCheck = (checkedNodes, checkedKeys) => {
  let levels = [];
  checkedKeys.checkedNodes.forEach(item => {
    if (item.level) {
      levels.push(item.level);
    }
  });
  gridLevelLines.loadGridByLevels(levels);
};
const gridLIneLevelTreeUpdataMapModeOff = mapEmitter.on(
  "mapEvents:mapModeChangeGridLIneLevelTreeUpdata",
  () => {
    gridLevelLines.upDataGridByCheckedLevels();
  }
);
onUnmounted(() => {
  gridLIneLevelTreeUpdataMapModeOff();
});
</script>
<style scoped lang="scss">
.style-panel {
  min-width: 130px;
  top: 30px;
  img {
    width: 15px;
  }
}
.el-checkbox-group {
  padding: 0 15px;
}
:deep(.el-checkbox__inner) {
  border: 1px solid var(--color-border-4);
}
:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  border-color: var(--color-main-1);
  background-color: var(--color-main);
}
:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: var(--color-main-1);
  font-weight: bold;
}
:deep(.style-panel .el-tree),
:deep(.style-panel .el-tree-node__content),
:deep(.style-panel .el-tree-node__children) {
  background: transparent !important;
}
:deep(.style-panel .el-tree-node__label),
:deep(.style-panel .el-tree-node__content .el-checkbox__label) {
  color: var(--color-font) !important;
}
:deep(.style-panel .el-tree-node__expand-icon) {
  color: var(--color-font);
}
:deep(.style-panel .el-tree-node__content:hover) {
  background-color: var(--color-bg-3) !important;
}
</style>
