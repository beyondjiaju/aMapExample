<template>
  <div class="path-toolbar">
    <el-button type="primary" :disabled="!ready" @click="emit('add')">添加</el-button>
    <el-button :disabled="!ready || !canClear" @click="emit('clear')">清空</el-button>
    <el-button type="primary" plain :disabled="!ready || !canPlay" @click="emit('toggle')">
      {{ playing ? "暂停" : "播放" }}
    </el-button>
    <el-button :disabled="!ready || !playing" @click="emit('stop')">停止</el-button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  ready: boolean;
  playing: boolean;
  canClear: boolean;
  canPlay: boolean;
}>();

const emit = defineEmits<{
  add: [];
  clear: [];
  toggle: [];
  stop: [];
}>();
</script>

<style scoped lang="scss">
.path-toolbar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
</style>
