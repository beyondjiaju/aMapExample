<template>
  <TechButton @click="switchMapMode">
    {{ mapStore.mapModeIs2D ? "3D" : "2D" }}
  </TechButton>
</template>

<script setup lang="ts">
import TechButton from "@/3dMap/components/techButton/index.vue";
import mapData from "@/3dMap/store/map";
import { switchMapMode } from "./switchMode";

const mapStore = mapData();
</script>
