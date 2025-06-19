import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.js"),
      name: "MonitorSDK",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "umd", "cjs"],
    },
    rollupOptions: {
      // 确保外部化处理那些你不想打包进库的依赖
      external: [],
      output: {
        // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
        globals: {
          // 例如，为了使用 lodash 的防抖功能，我们可以用 'lodash' 作为全局变量名
        },
      },
    },
    sourcemap: true,
    minify: "terser",
    target: ["es2015", "chrome58", "firefox57", "safari11"],
    outDir: "dist",
    emptyOutDir: true,
    // 构建时显示详细信息
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
  },
  // 预览配置
  preview: {
    port: 4173,
    open: true,
  },
});
