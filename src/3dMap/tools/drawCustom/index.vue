<template>
  <!-- 绘制工具条 -->
  <ul
    class="tool-box"
    :style="props.cssText"
    v-show="drawData.length > 1 && !drawCustomEdit.panelShow"
  >
    <li
      v-for="(list, key) in drawData"
      :key="key"
      :class="{ active: activeDrawType == list.type }"
      :title="list.name + '绘制'"
      @click="start(list.type)"
    >
      <img :src="list.img" />
    </li>
    <li
      class="custom-draw-cancel"
      type="cancel"
      @click="cancel"
      v-show="drawData.length > 1 && hasCancel"
    >
      取消
    </li>
  </ul>
  <!-- 图形编辑 -->
  <DrawCustomEdit
    ref="editPanelRef"
    :cssText="props.editCssText || props.cssText"
    v-if="drawCustomEdit.panelShow"
    :key="drawCustomEdit.properties"
    :drawResult="drawCustomEdit.properties"
    :options="editOptions"
    @cancel="cancelEdit"
    @confirm="confirmEdit"
  >
    <template #content-before>
      <slot name="edit-content-before" />
    </template>
  </DrawCustomEdit>
  <!-- input tool -->
  <ToolSelect
    v-if="activeDrawType == 'input'"
    :position="[]"
    v-drag="{
      size: false,
      position: 'fixed',
      top: '40%',
      right: 'auto',
      left: '50%',
      transformY: 80,
      zIndex: 9999
    }"
  >
    <template v-slot:content>
      <div class="input-title">绘制图形输入</div>
      <ul class="tool-box tool-box-input">
        <template v-for="(list, key) in drawData" :key="key">
          <li
            v-if="['point', 'label', 'input'].indexOf(list.type) < 0"
            :class="{ active: activeInputType == list.type }"
            :title="list.name + '输入图形'"
            @click="changeInput(list.type)"
          >
            <img :src="list.img" />
          </li>
        </template>
      </ul>
      <DrawCustomEdit
        ref="inputEditRef"
        v-if="inputDrawResult"
        :key="inputDrawResult.type"
        :drawResult="inputDrawResult"
        :cssText="'position: relative;'"
        :inputTextArea="props.editInputTextArea"
        :options="editOptions"
        @cancel="inputCancel"
        @confirm="inputConfirm"
      />
    </template>
  </ToolSelect>
</template>
<script setup lang="ts">
import { ref, watch, toRaw, onBeforeMount, onMounted, onUnmounted } from "vue";
import { defaultDrawData } from "./config";
// component
import DrawCustomEdit from "@/3dMap/tools/drawCustomEdit/index.vue";
import ToolSelect from "@/3dMap/components/toolSelect/index.vue";
// hook
const emits = defineEmits(["cancel", "confirm"]);
// data
/**
 * types 绘制类型
 * cssText 工具条cssTest
 * endStartEdit 绘制结束自动开启编辑
 * editCssText 编辑面板样式
 * continuity 连续绘制
 * hasCancel 取消按钮
 * options 绘制初始化参数，与 DrawHandler 入参一致
 */
const props = defineProps({
  types: {
    type: Array,
    default: () => {
      return [];
    }
  },
  cssText: {
    type: String,
    default: "bottom: 45px; left: 10px;"
  },
  autoStart: {
    type: Boolean,
    default: () => {
      false;
    }
  },
  autoStartType: {
    type: String,
    default: () => {
      ("");
    }
  },
  endStartEdit: {
    type: Boolean,
    default: () => {
      return true;
    }
  },
  editCssText: {
    type: String,
    default: ""
  },
  continuity: {
    type: Boolean,
    default: () => {
      return false;
    }
  },
  hasCancel: {
    type: Boolean,
    default: () => {
      return true;
    }
  },
  options: {
    type: Object,
    default: () => {
      return {};
    }
  },
  editInputTextArea: {
    type: Boolean,
    default: () => {
      return false;
    }
  }
});
import Hook from "./hook";
const {
  drawData,
  activeDrawType,
  startEdit,
  drawCustomEdit,
  newDrawHandlerByModeDestroy,
  start,
  stop,
  upDataOptions,
  cancel,
  cancelEdit,
  confirmEdit,
  activeInputType,
  inputDrawResult,
  changeInput,
  inputCancel,
  inputConfirm
} = Hook(emits, props);
const editPanelRef = ref(null);
const inputEditRef = ref(null);
// 传给编辑组件的样式，与绘制 options 同步更新
const editOptions = ref({ ...(props.options || {}) });
/** 更新绘制样式，并同步到当前编辑组件 */
const syncUpDataOptions = options => {
  editOptions.value = { ...editOptions.value, ...(options || {}) };
  upDataOptions(options);
  editPanelRef.value?.upDataOptions?.(options);
  inputEditRef.value?.upDataOptions?.(options);
};
// Function
onBeforeMount(() => {
  // 拾取类型设置
  if (props.types.length < 1) {
    defaultDrawData.forEach(item => {
      if (["point", "label", "input"].indexOf(item.type) < 0) {
        drawData.value.push(item);
      }
    });
  } else {
    props.types.map(type => {
      let defaultOption = defaultDrawData.find(item => {
        return item.type == type;
      });
      if (defaultOption) drawData.value.push(defaultOption);
    });
  }
  // 绘制结束开启编辑
  startEdit.value = props.endStartEdit;
});
onMounted(() => {
  if (props.autoStart) start(props.autoStartType);
});
onUnmounted(() => {
  newDrawHandlerByModeDestroy();
});
// defineExpose
defineExpose({ start, stop, upDataOptions: syncUpDataOptions });
</script>
<style lang="scss" scoped>
.tool-box {
  position: absolute;
  z-index: 10;
  overflow: hidden;
  background: var(--color-bg-panel);
  color: var(--color-font);
  border-radius: 4px;
  li {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    cursor: default;
    margin: 5px;
    background: var(--color-bg-3);
    border-radius: 4px;
    overflow: hidden;
    img {
      width: 60%;
      transform: translateY(-100px);
      filter: drop-shadow(var(--color-font) 0 100px);
    }
  }
  li.active {
    background: var(--color-main-1);
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px var(--color-border-4);
    img{
      filter: drop-shadow(var(--color-font-select) 0 100px);
    }
  }
  li[type="confirm"] {
    margin-right: 0;
    color: var(--color-main-1);
  }
  li[type="cancel"] {
    margin-left: 0;
    background: none;
    color: var(--color-grey-3);
  }
}
.input-title {
  padding: 0 5px;
  height: 35px;
  line-height: 30px;
  font-weight: bold;
  color: var(--color-font);
}
.tool-box-input {
  position: relative;
  display: flex;
}
</style>
