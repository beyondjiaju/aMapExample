import { createRouter, createWebHashHistory } from "vue-router";
import ExampleShell from "@/views/ExampleShell.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/example/draw-handler" },
    { path: "/example/:id", component: ExampleShell }
  ]
});
