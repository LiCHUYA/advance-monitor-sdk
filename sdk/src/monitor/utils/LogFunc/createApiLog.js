import { ErrorTypes } from "../../constants/index.js";
import { simplifyUrl } from "../handleErrorStack.js";
import tracker from "../../utils/traker.js";

/**
 * 检查请求是否成功
 * @param {number} status - HTTP状态码
 * @returns {boolean} 是否成功
 */
function isSuccess(status) {
  return status >= 200 && status < 300;
}

/**
 * 格式化时间，添加单位
 * @param {number} time - 时间值
 * @returns {string} 带单位的时间
 */
function formatDuration(time) {
  return `${Math.round(time)}ms`;
}

/**
 * 创建API日志
 * @param {Object} params - API日志参数
 * @param {Object} params.request - 请求信息
 * @param {Object} params.response - 响应信息
 * @param {Error|null} [params.error] - 错误对象
 * @param {Object} [params.context] - 上下文信息
 */
export async function createApiLog(params) {
  const { request = {}, response = {}, error = null, context = {} } = params;

  // 判断请求是否成功
  const success = error ? false : isSuccess(response.status);

  // 计算请求持续时间
  const duration =
    request.startTime && response.endTime
      ? formatDuration(response.endTime - request.startTime)
      : "0ms";

  const log = {
    // ==================== 1. 元信息层 ====================
    meta: {
      kind: "stability",
      type: success ? "api" : "error",
      errorType: error ? ErrorTypes.ajax_error : undefined,
      timestamp: Date.now(),
    },

    // ==================== 2. API信息层 ====================
    apisInfo: {
      // 请求基本信息
      request: {
        url: request.url,
        method: request.method,
        data: request.data,
        params: request.params,
        startTime: request.startTime,
      },

      // 响应信息
      response: {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        size: response.size || 0,
        endTime: response.endTime,
      },

      // 性能指标
      performance: {
        duration, // 请求持续时间
        success, // 请求是否成功
      },

      // 错误信息（如果有）
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : null,
    },

    // ==================== 3. 页面环境层 ====================
    page: {
      url: simplifyUrl(window.location.href),
      title: document.title,
      referrer: simplifyUrl(document.referrer),
      loadTime:
        performance.timing?.loadEventStart -
        performance.timing?.navigationStart,
      viewport: {
        screen: `${window.screen.width}x${window.screen.height}`,
        window: `${window.innerWidth}x${window.innerHeight}`,
        scroll: `${window.scrollX},${window.scrollY}`,
      },
      visibility: document.visibilityState,
    },

    // ==================== 4. 设备层 ====================
    device: {
      os: navigator.platform,
      type: /Mobile|Tablet/.test(navigator.userAgent) ? "mobile" : "desktop",
      model: (() => {
        const ua = navigator.userAgent;
        if (/iPhone/.test(ua)) return "iPhone";
        if (/iPad/.test(ua)) return "iPad";
        if (/Android/.test(ua)) return "Android";
        return "unknown";
      })(),
    },

    // ==================== 5. 浏览器层 ====================
    browser: {
      ua: navigator.userAgent,
      engine: navigator.userAgent.match(/(WebKit|Gecko|Blink)/)?.[0],
      version: navigator.userAgent.match(
        /(Chrome|Firefox|Safari|Edge)\/(\d+)/
      )?.[2],
      language: navigator.language,
    },

    // ==================== 6. 网络层 ====================
    network: {
      type: navigator.connection?.effectiveType || "unknown",
      rtt: navigator.connection?.rtt || 0,
      downlink: navigator.connection?.downlink || 0,
    },

    // ==================== 7. 业务层 ====================
    biz: window.trackConfig?.enableBizFields
      ? {
          module: window.trackConfig?.module,
          customData: {
            ...window.trackConfig?.customData,
            ...context,
          },
        }
      : null,
  };

  // 发送日志

  console.log("logApi", log);

  await tracker.send(log);
}
