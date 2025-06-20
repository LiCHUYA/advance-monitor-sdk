import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    {
      name: "mock-api",
      configureServer: (server) => {
        server.middlewares.use((req, res, next) => {
          // 添加CORS头
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader(
            "Access-Control-Allow-Methods",
            "GET, POST, PUT, DELETE, OPTIONS"
          );
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");

          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.end();
            return;
          }
          next();
        });

        // 模拟正常请求
        server.middlewares.use("/api/success", (req, res) => {
          setTimeout(() => {
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                code: 200,
                message: "success",
                data: { id: 1, name: "test" },
              })
            );
          }, 200); // 200ms延迟
        });

        // 模拟404错误
        server.middlewares.use("/api/404", (req, res) => {
          res.statusCode = 404;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              code: 404,
              message: "Not Found",
              error: "Resource not found",
            })
          );
        });

        // 模拟500错误
        server.middlewares.use("/api/500", (req, res) => {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              code: 500,
              message: "Internal Server Error",
              error: "Something went wrong",
            })
          );
        });
      },
    },
  ],
});
