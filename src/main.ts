import { createApp } from "vue";
import ElementPlus from "element-plus";
import App from "./App.vue";
import router from "./router";
import { store } from "./store";
import "ol/ol.css";
import "element-plus/dist/index.css";
import "./style/index.css";

const app = createApp(App);
app.use(store);
app.use(router);
/** 绘制、测量、拾取等工具组件使用 element-plus */
app.use(ElementPlus);
app.mount("#app");
