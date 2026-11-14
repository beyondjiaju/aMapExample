<template>
  <TechButton :active="!mapStore.mapModeIs2D" @click="switchMapMode">
    {{ mapStore.mapModeIs2D ? "3D" : "2D" }}
  </TechButton>
</template>

<script setup lang="ts">
import TechButton from "./TechButton.vue";
import mapData from "@/3dMap/store/map";
import { switchMapMode } from "./switchMode";

const mapStore = mapData();
</script>
