import { ErrorTypes, ErrorLevels } from "../../constants";
import { formatTime } from "../handleErrorStack";
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

  const logData = {
    // 元信息
    meta: {
      kind: "stability",
      type: success ? ErrorLevels.info : ErrorLevels.error,
      timestamp: formatTime(now()),
      duration, // 请求持续时间(ms)
      success, // 请求是否成功
    },

    // 请求信息
    request: {
      url: request.url,
      method: request.method,
      data: request.data,
      params: request.params,
    },

    // 响应信息
    response: {
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      size: response.size || 0,
    },

    // 上下文信息
    context: {
      page: window.location.pathname,
      env: process.env.NODE_ENV,
      ...context,
    },

    // 错误信息（如果有）
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }),
  };

  // 打印日志
  const icon = success ? "✅" : "❌";
  console.log(
    `${icon} [${request.method}] ${request.url} - ${
      response.status || "Failed"
    } - ${duration}`,
    logData
  );

  return logData;
}
