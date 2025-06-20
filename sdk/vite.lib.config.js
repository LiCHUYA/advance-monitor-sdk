import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.js"),
      name: "MonitorSDK",
      fileName: (format) => `monitor-sdk.${format}.js`,
      formats: ["es", "umd", "cjs", "iife", "system"],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        // 添加文件头注释
        banner: `/*!
 * 前端监控 SDK v1.0.0
 * Build Time: ${new Date().toLocaleString()}
 * https://github.com/your-repo/monitor-sdk
 */`,
        // 添加文件尾注释
        footer: `/*! End of MonitorSDK */`,
      },
    },
    sourcemap: true,
    minify: "terser",
    terserOptions: {
      compress: {
        // drop_console: true,
        // drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    target: ["es2015", "chrome58", "firefox57", "safari11"],
    outDir: "dist",
    emptyOutDir: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    // 构建时显示进度
    write: true,
  },
  define: {
    "process.env.NODE_ENV": '"production"',
    "process.env.VERSION": '"1.0.0"',
  },
  // 优化配置
  optimizeDeps: {
    include: [],
  },
  // 解析配置
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
