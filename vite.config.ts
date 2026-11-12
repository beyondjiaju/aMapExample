import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { viteExternalsPlugin } from "vite-plugin-externals";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      path: resolve(__dirname, "src/shims/path.ts")
    }
  },
  plugins: [
    vue(),
    // 使用官方打包好的 Cesium.js，避免源码依赖在 Vite 6 下无法解析
    viteExternalsPlugin({
      cesium: "Cesium"
    })
  ],
  server: {
    host: "0.0.0.0",
    port: 5180
  }
});
