<template>
  <TechButton :active="!mapStore.mapModeIs2D" @click="switchMapMode">
    {{ mapStore.mapModeIs2D ? "2D" : "3D" }}
  </TechButton>
</template>

<script setup lang="ts">
import TechButton from "@/components/TechButton.vue";
import mapData from "@/3dMap/store/map";
import { switchMapMode } from "@/map/switchMode";

const mapStore = mapData();
</script>
