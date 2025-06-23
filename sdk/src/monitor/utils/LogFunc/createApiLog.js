import { ErrorTypes, ErrorLevels } from "../../constants";
import { formatTime, simplifyUrl } from "../handleErrorStack";
import now from "performance-now";

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
export function createApiLog(params) {
  const { request = {}, response = {}, error = null, context = {} } = params;

  // 判断请求是否成功
  const success = error ? false : isSuccess(response.status);

  // 计算请求持续时间
  const duration =
    request.startTime && response.endTime
      ? formatDuration(response.endTime - request.startTime)
      : "0ms";

  return {
    // ==================== 1. 元信息层 ====================
    meta: {
      /**
       * 监控指标大类
       * - stability: 稳定性监控（错误、崩溃等）
       * - performance: 性能监控
       * - behavior: 用户行为监控
       * - api: API监控
       */
      kind: "api",

      /**
       * 日志类型
       * - error: 错误日志
       * - warning: 警告日志
       * - info: 信息日志
       */
      type: success ? ErrorLevels.info : ErrorLevels.error,

      /**
       * 日志记录时间戳（毫秒）
       */
      timestamp: formatTime(now()),
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
      /**
       * 当前页面完整URL
       */
      url: simplifyUrl(window.location.href),

      /**
       * 页面标题
       */
      title: document.title,

      /**
       * 页面来源
       */
      referrer: simplifyUrl(document.referrer),
    },

    // ==================== 4. 设备层 ====================
    device: {
      /**
       * 操作系统类型
       */
      os: navigator.platform,

      /**
       * 设备类型
       */
      type: /Mobile|Tablet/.test(navigator.userAgent) ? "mobile" : "desktop",

      /**
       * 设备型号
       */
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
      /**
       * 完整UserAgent字符串
       */
      ua: navigator.userAgent,

      /**
       * 浏览器渲染引擎
       */
      engine: navigator.userAgent.match(/(WebKit|Gecko|Blink)/)?.[0],

      /**
       * 浏览器主版本号
       */
      version: navigator.userAgent.match(
        /(Chrome|Firefox|Safari|Edge)\/(\d+)/
      )?.[2],

      /**
       * 浏览器语言
       */
      language: navigator.language,
    },

    // ==================== 6. 网络层 ====================
    network: {
      /**
       * 网络连接类型
       */
      type: navigator.connection?.effectiveType || "unknown",

      /**
       * 网络往返时延（毫秒）
       */
      rtt: navigator.connection?.rtt || 0,

      /**
       * 预估下行速度（Mbps）
       */
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
}
