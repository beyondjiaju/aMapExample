<template>
  <!-- pick tool -->
  <ul class="tool-box" :style="props.cssText">
    <li
      v-for="(list, key) in drawData"
      :key="key"
      :class="{ active: activeDrawType == list.type }"
      :title="list.name + '选取'"
      @click="start(list.type)"
    >
      <img :src="list.img" />
    </li>
    <template v-if="!autoConfirm">
      <li type="confirm" @click="confirm">确定</li>
      <li type="cancel" @click="cancel">取消</li>
    </template>
  </ul>
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
      <div class="input-title">选取图形输入</div>
      <ul class="tool-box tool-box-input">
        <template v-for="(list, key) in drawData" :key="key">
          <li
            v-if="['point', 'input'].indexOf(list.type) < 0"
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
        :labelWidth="drawCustomEditLabelWidth"
        :cssText="'position: relative;'"
        :inputTextArea="props.editInputTextArea"
        :options="drawCustomEditOptions"
        @cancel="inputCancel"
        @confirm="inputConfirm"
        @editChange="drawCustomEditChange"
      >
        <template #content-before>
          <div class="buffer-box" v-if="inputDrawResult.type == 'polyline'">
            <span :style="{ width: `${drawCustomEditLabelWidth}px` }"
              >外扩距离：</span
            >
            <div
              :style="{
                width: `calc(100% - ${drawCustomEditLabelWidth}px - 30px)`,
                height: '100%'
              }"
            >
              <el-input-number
                style="width: 100%"
                v-model="bufferData.number"
                :min="0"
                @change="bufferDataFeedBack"
              />
            </div>
            <p>m</p>
          </div>
        </template>
      </DrawCustomEdit>
    </template>
  </ToolSelect>
</template>
<script setup lang="ts">
import { ref, onBeforeMount, onMounted, onUnmounted } from "vue";
import { message, mapEmitter, cloneDeep } from "@/3dMap/interface";
import { DrawCustomFeedBack } from "@/3dMap/sdkUtils/drawCustom";
// components
import { pick } from "./drawPick";
import ToolSelect from "@/3dMap/components/toolSelect/index.vue";
import DrawCustomEdit from "@/3dMap/tools/drawCustomEdit/index.vue";
import getBufferShap from "./getBufferShap";
// data
import { defaultDrawData } from "./config";
import { editDataByType } from "@/3dMap/tools/drawCustom/config";
const drawData = ref([]);
const activeDrawType = ref("");
const activeInputType = ref(null);
const inputDrawResult = ref(null);
const _resultFilter = ref({});
let newPick;
/**emits
 * @param { Array } types 可选取类型输入 ["point", "polyline", "polygon", "rectangle", "circle", "sector", "rectangleCircle"]
 * @param { Object } resultFilter 选取图形数据过滤 pick默认选择全部类型数据 通过图形加载properties过滤
 * @param { String } cssText pick工具条样式已设置position: absolute;
 * @param { Boolean } autoConfirm 自动返回选取图形 设置为true 必须绑定autoConfirm方法，方法中会输入过滤后的选中图形Array
 */
const emits = defineEmits(["cancel", "confirm", "autoConfirm"]);
/**props
 * @param { Array } types 可选取类型输入 ["point", "polyline", "polygon", "rectangle", "circle", "sector", "rectangleCircle"]
 * @param { Array } pointIsDrillPick 点选是否深度 默认false
 * @param { Object } resultFilter 选取图形数据过滤 pick默认选择全部类型数据 通过图形加载properties过滤
 * @param { String } cssText pick工具条样式已设置position: absolute;
 * @param { Boolean } autoStart 自动开启拾取default:false;组件加载默认开启types[0]类型pick
 * @param { Boolean } autoConfirm 自动返回选取图形 设置为true 必须绑定autoConfirm方法，方法中会输入过滤后的选中图形Array
 * @param { String } color 高亮颜色，透传 mapEvents:airDataHightLight
 * @param { Number } alpha 高亮透明度，透传 mapEvents:airDataHightLight，默认 0.8
 */
const props = defineProps({
  types: {
    type: Array,
    default: () => ["point"]
  },
  pointIsDrillPick: {
    type: Boolean,
    default: () => false
  },
  resultFilter: {
    type: Object,
    default: () => ({})
  },
  cssText: {
    type: String,
    default: "left: 10px;bottom: 45px;"
  },
  autoStart: {
    type: Boolean,
    default: () => {
      false;
    }
  },
  autoConfirm: {
    type: Boolean,
    default: () => {
      false;
    }
  },
  drawCustomEditLabelWidth: {
    type: Number,
    default: 80
  },
  drawCustomEditOptions: {
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
  },
  // 高亮颜色，初始化 Pick 后在 airDataHightLight 时传入
  color: {
    type: String,
    default: undefined
  },
  // 高亮透明度，初始化 Pick 后在 airDataHightLight 时传入
  alpha: {
    type: Number,
    default: 0.8
  }
});
/** --- Function --- */
/**开启拾取
 * @param {String} draw_type
 * @param {Object} draw_options
 */
const start = (type = null, options = {}) => {
  if (type == "clear") {
    activeDrawType.value = "";
    return;
  }
  if (activeDrawType.value === type) {
    stop();
    return;
  }
  activeDrawType.value = type ? type : drawData.value[0].type;
  if (type == "input") {
    // 停止选取
    newPick.stop();
    drawData.value.forEach(list => {
      if (!activeInputType.value && ["point", "input"].indexOf(list.type) < 0) {
        changeInput(list.type);
      }
    });
    return;
  }
  // 绘制
  newPick.start(activeDrawType.value, options);
};
/**停止拾取 */
const stop = () => {
  activeDrawType.value = "";
  // 停止
  newPick.stop();
};
/**方法添加默认选取的空域 */
const addById = id => {
  newPick.addById(id);
};
/**移除选取的空域 */
const removeById = id => {
  newPick.removeById(id);
};
/**清空已选取 */
const removeAll = () => {
  newPick.removeAll();
};
/**确定 */
const confirm = () => {
  // 拾取数据获取
  const pickData = newPick.getPickData();
  if (pickData.length > 0) {
    emits("confirm", pickData);
  } else {
    message("请选择空域！", { type: "info" });
  }
};
/**取消 */
const cancel = () => {
  emits("cancel");
};
/**自动确认返回拾取 */
const autoConfirmFn = data => {
  emits("autoConfirm", data);
};
/**输入项 */
const defaultBufferData = {
  number: 0,
  shap: null,
  types: ["polyline"],
  bufferShap: null
};
const bufferData = ref(cloneDeep(defaultBufferData));
/**输入change */
const changeInput = type => {
  activeInputType.value = type;
  inputDrawResult.value = cloneDeep(editDataByType[type]);
  newDrawCustomFeedBack.removeAll();
  bufferData.value = cloneDeep(defaultBufferData);
};
/**输入取消 */
const inputCancel = () => {
  activeInputType.value = null;
  inputDrawResult.value = null;
  activeDrawType.value = null;
  newDrawCustomFeedBack.removeAll();
  bufferData.value = cloneDeep(defaultBufferData);
};
/**输入确认 */
const inputConfirm = inputShap => {
  if (bufferData.value.bufferShap) {
    newPick.filterFromTypeCoordinates(
      bufferData.value.bufferShap.coordinates,
      bufferData.value.bufferShap.type
    );
  } else {
    newPick.filterFromTypeCoordinates(inputShap.coordinates, inputShap.type);
  }
  inputCancel();
};
/**自定义编辑 change */
const drawCustomEditChange = shap => {
  if (bufferData.value.types.indexOf(shap.type) >= 0) {
    bufferData.value.shap = shap;
    bufferDataFeedBack();
  }
};
/**缓冲 change */
let newDrawCustomFeedBack = new DrawCustomFeedBack();
const bufferDataFeedBack = () => {
  bufferData.value.bufferShap = getBufferShap(
    bufferData.value.shap,
    bufferData.value.number
  );
  newDrawCustomFeedBack.removeAll();
  newDrawCustomFeedBack.add({
    data: bufferData.value.bufferShap,
    style: {
      color: "#ffff00",
      alpha: 0.2
    }
  });
};
let mapEmitterOffs = {};
onBeforeMount(() => {
  // 网格切换清空拾取从新记录
  mapEmitterOffs["gridModeChange"] = mapEmitter.on(
    "mapEvents:gridModeChange",
    result => {
      newPick.removeAll();
    }
  );
  // 2、3d切换
  mapEmitterOffs["mapModeChangePickUpdata"] = mapEmitter.on(
    "mapEvents:mapModeChangePickUpdata",
    () => {
      const modePickType = activeDrawType.value;
      if (!modePickType) return;
      stop();
      start(modePickType);
    }
  );
  // 筛选条件获取
  for (const [key, value] of Object.entries(props.resultFilter)) {
    _resultFilter.value[key] = value;
  }
  // 初始化拾取对象（传入高亮 color、alpha）
  if (props.autoConfirm) {
    newPick = pick({
      pointIsDrillPick: props.pointIsDrillPick,
      filterData: _resultFilter.value,
      endCallBack: autoConfirmFn,
      color: props.color,
      alpha: props.alpha
    });
  } else {
    newPick = pick({
      pointIsDrillPick: props.pointIsDrillPick,
      filterData: _resultFilter.value,
      color: props.color,
      alpha: props.alpha
    });
  }
  // 拾取类型设置
  if (props.types.length < 1) {
    drawData.value = defaultDrawData;
  } else {
    props.types.map(type => {
      const defaultOption = defaultDrawData.find(item => {
        return item.type == type;
      });
      drawData.value.push(defaultOption);
    });
  }
});
onMounted(() => {
  if (props.autoStart) start();
});
onUnmounted(() => {
  newDrawCustomFeedBack.removeAll();
  // 注销模块对象
  newPick.destroy();
  for (let key in mapEmitterOffs) {
    mapEmitterOffs[key]();
  }
});
/**defineExpose
 * @param start(type)
 * @param stop
 * @param addById(id)
 * @param removeById(id)
 * @param removeAll
 */
defineExpose({ start, stop, addById, removeById, removeAll });
</script>
<style lang="scss" scoped>
.buffer-box {
  display: flex;
  align-items: center;
  height: 25px;
  margin-bottom: 5px;
  justify-content: space-between;
  span {
    text-align: right;
  }
  p {
    width: 30px;
    text-align: right;
    padding-right: 6px;
  }
}
.tool-box {
  position: absolute;
  z-index: 20;
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
