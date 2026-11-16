<template>
  <div class="draw-edit-box" :style="cssText">
    <!-- header -->
    <div class="header">
      <img :src="headerData.img" alt />
      <span class="text">{{ headerData.text }}</span>
      <el-tooltip
        class="box-item"
        effect="light"
        :content="headerData.info"
        placement="top"
      >
        <el-icon>
          <InfoFilled />
        </el-icon>
      </el-tooltip>
    </div>
    <!-- slot  content before -->
    <slot name="content-before" />
    <!-- content -->
    <el-row style="justify-content: space-between">
      <el-col :span="11">
        <div class="row-list">
          <p class="label" :style="{ width: `${labelWidth}px` }">坐标格式：</p>
          <el-select
            :style="{ width: `calc(100% - ${labelWidth}px)` }"
            v-model="positionType"
          >
            <el-option
              v-for="t in positionTypes"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </div>
      </el-col>
      <el-col :span="11">
        <div class="row-list">
          <p class="label" :style="{ width: `${labelWidth}px` }">坐标顺序：</p>
          <el-select
            :style="{ width: `calc(100% - ${labelWidth}px)` }"
            v-model="positionSort"
          >
            <el-option
              v-for="t in positionSorts"
              :key="t.value"
              :label="t.label"
              :value="t.value"
            />
          </el-select>
        </div>
      </el-col>
    </el-row>
    <div class="row-list" v-if="isEditDefault">
      <p class="label" :style="{ width: `${labelWidth}px` }">文本录入：</p>
      <el-checkbox v-model="isInputTextArea" />
      <template v-if="isInputTextArea">
        <p class="ml-2 textareaTip" v-if="editData.type == 'polyline'">
          请输入折线坐标
          <span class="tip">{{ textAreaTip }}</span
          >文本，坐标不低于 <span class="tip">两</span>个
        </p>
        <p class="ml-2 textareaTip" v-else>
          请输入面坐标
          <span class="tip">{{ textAreaTip }}</span
          >文本，坐标不低于 <span class="tip">三</span>个
        </p>
      </template>
    </div>
    <el-scrollbar
      ref="contentScrollbarRef"
      class="content"
      :key="updataContent"
    >
      <template v-if="isEditDefault">
        <EditDefaultTextarea
          v-if="isInputTextArea"
          ref="editRef"
          :data="editData"
          v-model:positionType="positionType"
          v-model:positionSort="positionSort"
          @change="domEditChange"
        />
        <EditDefault
          v-else
          ref="editRef"
          :data="editData"
          v-model:positionType="positionType"
          v-model:positionSort="positionSort"
          v-model:highlightIndex="highlightIndex"
          @change="domEditChange"
        />
      </template>
      <EditCircle
        ref="editRef"
        v-if="['circle'].indexOf(editData.type) >= 0"
        :labelWidth="labelWidth"
        :data="editData"
        v-model:positionType="positionType"
        v-model:positionSort="positionSort"
        @change="domEditChange"
      />
      <EditPoint
        ref="editRef"
        v-if="['point'].indexOf(editData.type) >= 0"
        :labelWidth="labelWidth"
        :data="editData"
        v-model:positionType="positionType"
        v-model:positionSort="positionSort"
        @change="domEditChange"
      />
      <EditLabel
        ref="editRef"
        v-if="['label'].indexOf(editData.type) >= 0"
        :labelWidth="labelWidth"
        :data="editData"
        v-model:positionType="positionType"
        v-model:positionSort="positionSort"
        @change="domEditChange"
      />
      <EditSector
        ref="editRef"
        v-if="['sector'].indexOf(editData.type) >= 0"
        :labelWidth="labelWidth"
        :data="editData"
        v-model:positionType="positionType"
        v-model:positionSort="positionSort"
        @change="domEditChange"
      />
      <EditRectangleCircle
        ref="editRef"
        v-if="['rectangleCircle'].indexOf(editData.type) >= 0"
        :labelWidth="labelWidth"
        :data="editData"
        v-model:positionType="positionType"
        v-model:positionSort="positionSort"
        @change="domEditChange"
      />
    </el-scrollbar>
    <!-- slot  content after -->
    <slot name="content-after" />
    <!-- 操作按钮 -->
    <div class="footer" v-if="hasFooter">
      <div>
        <template v-if="isEditDefault && isInputTextArea">
          <el-button size="small" type="primary" @click="textAreaConfirm"
            >文本识别</el-button
          >
          <span class="text-area-tip">文本录入后请先文本识别，再确定</span>
        </template>
      </div>
      <div>
        <el-button size="small" type="info" @click="cancel">取消</el-button>
        <el-button size="small" type="primary" @click="confirm">确定</el-button>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import {
  ref,
  nextTick,
  onBeforeMount,
  onMounted,
  watch,
  onBeforeUnmount,
  computed
} from "vue";
import { InfoFilled } from "@element-plus/icons-vue";
import { cloneDeep, message } from "@/3dMap/interface";
import { titleData } from "./config";
import { shapeCoordinates } from "@/3dMap/sdk/cesiumUtils";
import { DrawCustomEdit } from "@/3dMap/utils/business/drawCustom";
import { locateToCoordinates } from "@/3dMap/sdk/publicUtils";
// component
import EditDefault from "./EditDefault.vue";
import EditDefaultTextarea from "./EditDefaultTextarea.vue";
import EditCircle from "./EditCircle.vue";
import EditPoint from "./EditPoint.vue";
import EditLabel from "./EditLabel.vue";
import EditSector from "./EditSector.vue";
import EditRectangleCircle from "./EditRectangleCircle.vue";
import { indexOf } from "lodash";
// data
const headerData = ref({});
const editData = ref({
  type: ""
});
const updataContent = ref(0);
const editRef = ref(null);
const contentScrollbarRef = ref(null);
/** 当前高亮的坐标行索引，仅 EditDefault 模式下使用 */
const highlightIndex = ref(-1);
const isInputTextArea = ref(false);
const positionType = ref("degrees60");
const positionSort = ref("latLon");
const positionTypes = ref([
  {
    label: "度",
    value: "degrees"
  },
  {
    label: "度分秒",
    value: "degrees60"
  }
]);
const positionSorts = ref([
  {
    label: "经度纬度",
    value: "lonLat"
  },
  {
    label: "纬度经度",
    value: "latLon"
  }
]);
/**
 * drawResult 绘制返回结果
 * cssText 组件行内样式设置
 * labelWidth label宽度
 * hasFooter 底部是否展示
 */
const props = defineProps({
  drawResult: {
    type: Object,
    default: () => {
      return {};
    }
  },
  cssText: {
    type: String,
    default: "bottom: 10px; left: 10px;"
  },
  labelWidth: {
    type: Number,
    default: 80
  },
  hasFooter: {
    type: Boolean,
    default: true
  },
  editGraphicStyle: {
    type: Object,
    default: () => {
      return {};
    }
  },
  inputTextArea: {
    type: Boolean,
    default: false
  }
});
// finction
const emits = defineEmits(["cancel", "confirm", "editChange"]);
/**默认坐标修改 */
const isEditDefault = computed(() => {
  return ["polyline", "polygon", "rectangle"].includes(editData.value.type);
});
const textAreaTip = computed(() => {
  let pText =
    positionSort.value == "lonLat" ? "经度、纬度顺序" : "纬度、经度顺序";
  if (positionType.value != "degrees") {
    pText += "度分秒";
  }
  return pText;
});
let newDrawCustomEdit;
/**设置map编辑数据 */
const setEditData = (data = null) => {
  // 开启编辑
  newDrawCustomEdit.start(data);
};
/**map 地图操作变化 */
const mapEditChange = (result, editInfo) => {
  if (result.radius) result.radius = Number(result.radius.toFixed(2));
  // 编辑数据更新
  editData.value = result;
  // 更新展示
  editRef?.value?.setData(result);
  // emits editChange
  emits("editChange", result);
  updataContent.value++;
  setHeightLight(editInfo);
};
/**dom 变化 */
const domEditChange = (result, editInfo) => {
  if (result.radius) result.radius = Number(result.radius.toFixed(2));
  // 编辑数据更新
  editData.value = result;
  // 更新编辑
  setEditData(result);
  // emits editChange
  emits("editChange", result);
  setHeightLight(editInfo);
};
/**多坐标模式下高亮行设置 */
const setHeightLight = editInfo => {
  // EditDefault 模式下：根据 pointIndex 判断并滚动到可视区域
  if (isEditDefault.value && editInfo?.pointIndex !== undefined) {
    highlightIndex.value = editInfo.pointIndex;
    nextTick(() => {
      scrollToPointIndex(editInfo.pointIndex);
    });
  }
};
/**文本识别 */
const textAreaConfirm = () => {
  // 解析文本并拿到识别出的经纬度坐标集合
  const coordinates = editRef?.value?.positionLdentify?.();
  // 识别成功后，使用通用二三维定位方法按识别坐标定位
  if (Array.isArray(coordinates) && coordinates.length) {
    locateToCoordinates(coordinates);
  }
};
/**取消 */
const cancel = () => {
  setEditData();
  emits("cancel");
};
/**
 * 将指定索引的坐标行滚动到 el-scrollbar 内容区域的最后行位置
 * 仅在 EditDefault 模式下调用
 */
const scrollToPointIndex = pointIndex => {
  const scrollbarEl = contentScrollbarRef.value;
  if (!scrollbarEl) return;
  // 获取滚动容器（el-scrollbar 内部的可滚动 div）
  const wrapEl =
    scrollbarEl.wrapRef ||
    scrollbarEl.$el?.querySelector(".el-scrollbar__view");
  if (!wrapEl) return;

  // 获取所有坐标行 li 元素
  const listItems = wrapEl.querySelectorAll("ul li");
  if (!listItems || pointIndex >= listItems.length) return;

  const item = listItems[pointIndex];
  const itemOffsetTop = item.offsetTop;
  const scrollTop = wrapEl.scrollTop;
  const contentHeight = wrapEl.clientHeight;
  const itemHeight = item.offsetHeight;

  // 判断当前行是否在可视区域外（上方或下方）
  if (
    itemOffsetTop < scrollTop ||
    itemOffsetTop + itemHeight > scrollTop + contentHeight
  ) {
    // 将当前行定位到内容区域的最后行位置
    const targetScrollTop = itemOffsetTop - contentHeight + itemHeight;
    wrapEl.scrollTop = Math.max(0, targetScrollTop);
  }
};

/**确定 */
const confirm = () => {
  textAreaConfirm();
  setEditData();
  let result = cloneDeep(editData.value);
  let invalid = false;
  if (result.coordinates) {
    invalid = result.coordinates.find(item => {
      return !item[0] || !item[1];
    });
  }
  if (result.type == "circle") {
    result.coordinates = shapeCoordinates.getCirclePositions(
      result.center,
      result.radius,
      "degrees"
    );
    invalid = !result.center[0] || !result.center[1];
  }
  if (result.type == "sector") {
    result.coordinates = shapeCoordinates.getSectorPositionsByRadius({
      center: result.points.first,
      radius: result.radius,
      startAngle: result.startAngle,
      endAngle: result.endAngle
    });
    invalid = !result.points.first[0] || !result.points.first[1];
  }
  if (result.type == "rectangleCircle") {
    result.coordinates = shapeCoordinates.getRectangleCirclePositionsByRadius({
      first: result.points.first,
      second: result.points.second,
      radius: result.radius
    });
    invalid =
      !result.points.first[0] ||
      !result.points.first[1] ||
      !result.points.second[0] ||
      !result.points.second[1];
  }
  if (invalid) {
    message("请输入坐标", { type: "warning" });
    emits("confirm", null);
    return;
  }
  if (result.type == "polyline" && result.coordinates.length < 2) {
    message("折现坐标不可少于两个", { type: "warning" });
    emits("confirm", null);
    return;
  }
  if (result.type == "polygon" && result.coordinates.length < 3) {
    message("面坐标不可少于三个", { type: "warning" });
    emits("confirm", null);
    return;
  }
  emits("confirm", result);
};
/**获取数据 */
const getData = () => {
  return editData.value;
};
onBeforeMount(() => {
  const drawCustomEditOption = Object.assign(props.editGraphicStyle, {
    endCallback: mapEditChange
  });
  newDrawCustomEdit = new DrawCustomEdit(drawCustomEditOption);
});
onMounted(() => {
  upDataEditData(props.drawResult);
  // 图形编辑监听
  // mapEditChange();
});
onBeforeUnmount(() => {
  newDrawCustomEdit.destroy();
});
const upDataEditData = drawResult => {
  editData.value = cloneDeep(drawResult);
  highlightIndex.value = -1;
  headerData.value = titleData[editData.value.type];
  isInputTextArea.value = isEditDefault.value ? props.inputTextArea : false;
  // 开启编辑
  setEditData(editData.value);
  updataContent.value++;
};
defineExpose({ getData, upDataEditData });
</script>
<style scoped lang="scss">
.tip {
  color: var(--color-main-1);
  font-weight: bold;
}

:deep(.coordinate-text-area) {
  .el-textarea__inner {
    color: var(--color-font);
  }
}

.draw-edit-box {
  position: absolute;
  z-index: 10;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  padding: 0 10px;
  border-radius: 5px;
  min-width: 500px;
  font-size: 14px;
  display: block;
  color: var(--color-font);
  --el-fill-color-blank: var(--color-bg);

  .header {
    display: flex;
    align-items: center;
    height: 40px;

    img {
      width: 15px;
    }

    .text {
      margin: 0 5px;
    }

    .el-icon {
      cursor: pointer;
    }
  }

  .row-list {
    display: flex;
    align-items: center;
    margin-bottom: 5px;
    height: 25px;

    .textareaTip {
      font-size: 12px;
    }
  }

  :deep(.el-input__wrapper),
  :deep(.el-input__wrapper:hover),
  :deep(.el-input__wrapper.is-focus),
  :deep(.el-input__wrapper:focus-within),
  :deep(.el-select__wrapper),
  :deep(.el-select__wrapper:hover),
  :deep(.el-select__wrapper.is-focused),
  :deep(.el-select__wrapper:focus-within) {
    background-color: var(--color-bg) !important;
    border: none !important;
    box-shadow: none !important;
  }

  :deep(.el-input__inner),
  :deep(.el-select__selection),
  :deep(.el-select__placeholder) {
    color: var(--color-font) !important;
    background-color: transparent !important;
  }

  .content {
    height: 160px;
  }

  .footer {
    display: flex;
    justify-content: space-between;
    margin: 10px 0;

    .el-button {
      height: 25px;
      padding: 0 6px;
    }

    .text-area-tip {
      font-size: 12px;
      margin-left: 5px;
    }
  }

  :deep(.label) {
    text-align: right;
    color: var(--color-font);
  }

  :deep(.position) {
    height: 25px;
  }

  // input
  :deep(.el-input) {
    height: 100%;
  }

  :deep(.el-input-number),
  :deep(.el-input) {
    height: 100%;

    .el-input__wrapper {
      height: 100% !important;
      padding: 0 5px;
      background-color: var(--color-bg) !important;
      border: none !important;
      box-shadow: none !important;

      .el-input__inner {
        height: 100%;
        background-color: transparent !important;
      }
    }

    .el-input-number__decrease,
    .el-input-number__increase {
      display: none;
    }
  }

  // select
  :deep(.el-select) {
    width: 40px;
    height: 100%;

    .el-select__wrapper {
      height: 100%;
      min-height: auto;
      padding: 2px 5px;

      .el-input__inner {
        height: 100%;
      }
    }
  }
}
</style>
