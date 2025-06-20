// 监听 AJAX 错误
import { createApiLog } from "../utils/LogFunc/createApiLog";
import { ErrorTypes, ErrorLevels } from "../constants";

/**
 * 创建基础请求日志
 * @param {Object} params 请求参数
 * @returns {Object} 基础日志对象
 */
function createBaseLog(params) {
  const { url, method, data, headers, startTime } = params;

  const urlObj = new URL(url, window.location.origin);
  return {
    request: {
      url,
      method,
      data,
      headers,
      params: Object.fromEntries(urlObj.searchParams),
      startTime,
    },
  };
}

/**
 * 处理请求日志
 * @param {Object} params 请求参数
 */
async function handleRequestLog(params) {
  const {
    success,
    error = null,
    baseLog,
    endTime,
    response = {},
    type = "unknown",
    phase = "request",
  } = params;

  return await createApiLog({
    success,
    error: error
      ? Object.assign(error, {
          type,
          phase,
          [type]: true,
        })
      : null,
    ...baseLog,
    response: {
      ...response,
      endTime,
    },
    performance: {
      startTime: baseLog.request.startTime,
      endTime,
    },
  });
}

export function initXhrErrorCapture() {
  // 重写 XHR
  const originalXHR = window.XMLHttpRequest;
  window.XMLHttpRequest = function () {
    const xhr = new originalXHR();
    const originalOpen = xhr.open;
    const originalSend = xhr.send;

    // 存储请求信息
    let requestInfo = {};

    xhr.open = function (...args) {
      const [method, url] = args;
      requestInfo = {
        method,
        url,
        startTime: performance.now(),
      };
      originalOpen.apply(xhr, args);
    };

    xhr.send = function (data) {
      requestInfo.data = data;
      requestInfo.headers = {};

      // 成功回调
      xhr.addEventListener("load", async function () {
        const endTime = performance.now();

        await createApiLog({
          request: {
            ...requestInfo,
            headers: xhr
              .getAllResponseHeaders()
              .split("\r\n")
              .reduce((acc, line) => {
                const [key, value] = line.split(": ");
                if (key && value) acc[key.toLowerCase()] = value;
                return acc;
              }, {}),
          },
          response: {
            status: xhr.status,
            statusText: xhr.statusText,
            data: xhr.response,
            headers: xhr.getAllResponseHeaders(),
            endTime,
          },
        });
      });

      // 错误处理
      xhr.addEventListener("error", async () => {
        await createApiLog({
          request: requestInfo,
          response: {
            status: 0,
            statusText: "Network Error",
            endTime: performance.now(),
          },
          error: new Error("Network Error"),
        });
      });

      xhr.addEventListener("timeout", async () => {
        await createApiLog({
          request: requestInfo,
          response: {
            status: 0,
            statusText: "Timeout",
            endTime: performance.now(),
          },
          error: new Error("Request Timeout"),
        });
      });

      xhr.addEventListener("abort", async () => {
        await createApiLog({
          request: requestInfo,
          response: {
            status: 0,
            statusText: "Aborted",
            endTime: performance.now(),
          },
          error: new Error("Request Aborted"),
        });
      });

      originalSend.call(xhr, data);
    };

    return xhr;
  };

  // 重写 Fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const startTime = performance.now();
    const request = args[0] instanceof Request ? args[0] : new Request(...args);

    try {
      const response = await originalFetch.apply(this, args);
      const endTime = performance.now();
      const responseClone = response.clone();

      await createApiLog({
        request: {
          url: request.url,
          method: request.method,
          data:
            request.method !== "GET"
              ? await request
                  .clone()
                  .text()
                  .catch(() => null)
              : null,
          headers: Object.fromEntries(request.headers),
          startTime,
        },
        response: {
          status: response.status,
          statusText: response.statusText,
          data: await responseClone.text().catch(() => null),
          headers: Object.fromEntries(response.headers),
          endTime,
        },
      });

      return response;
    } catch (error) {
      await createApiLog({
        request: {
          url: request.url,
          method: request.method,
          data:
            request.method !== "GET"
              ? await request
                  .clone()
                  .text()
                  .catch(() => null)
              : null,
          headers: Object.fromEntries(request.headers),
          startTime,
        },
        response: {
          status: 0,
          statusText: "Network Error",
          endTime: performance.now(),
        },
        error,
      });
      throw error;
    }
  };
}
