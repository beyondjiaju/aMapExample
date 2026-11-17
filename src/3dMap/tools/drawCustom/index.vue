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
    :cssText="props.editCssText || props.cssText"
    v-if="drawCustomEdit.panelShow"
    :key="drawCustomEdit.properties"
    :drawResult="drawCustomEdit.properties"
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
        v-if="inputDrawResult"
        :key="inputDrawResult.type"
        :drawResult="inputDrawResult"
        :cssText="'position: relative;'"
        :inputTextArea="props.editInputTextArea"
        @cancel="inputCancel"
        @confirm="inputConfirm"
      />
    </template>
  </ToolSelect>
</template>
<script setup lang="ts">
import { ref, watch, toRaw, onBeforeMount, onMounted, onUnmounted } from "vue";
import { defaultDrawData } from "./config";
import { mapEmitter } from "@/3dMap/interface";
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
  setDrawHandlerByMode,
  newDrawHandlerByModeDestroy,
  start,
  stop,
  cancel,
  cancelEdit,
  confirmEdit,
  activeInputType,
  inputDrawResult,
  changeInput,
  inputCancel,
  inputConfirm
} = Hook(emits, props);
let mapModeChangeDrawCustomUpdataOff;
// Function
onBeforeMount(() => {
  setDrawHandlerByMode();
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
  mapModeChangeDrawCustomUpdataOff = mapEmitter.on(
    "mapEvents:mapModeChangeDrawCustomUpdata",
    () => {
      const modeDrawType = activeDrawType.value;
      stop();
      setDrawHandlerByMode();
      if (!modeDrawType) return;
      start(modeDrawType);
    }
  );
});
onMounted(() => {
  if (props.autoStart) start(props.autoStartType);
});
onUnmounted(() => {
  newDrawHandlerByModeDestroy();
  if (mapModeChangeDrawCustomUpdataOff) {
    mapModeChangeDrawCustomUpdataOff();
  }
});
// defineExpose
defineExpose({ start, stop });
</script>
<style lang="scss" scoped>
.tool-box {
  position: absolute;
  z-index: 10;
  // display: flex;
  overflow: hidden;
  // padding: 5px;
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
    background: #22273165;
    border-radius: 4px;
    img {
      width: 70%;
    }
  }
  li.active {
    background: var(--color-main);
    border-radius: 3px;
    box-shadow: inset 0 0 0 1px var(--color-border-4);
  }
  li[type="confirm"] {
    margin-right: 0;
    color: var(--color-main);
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
