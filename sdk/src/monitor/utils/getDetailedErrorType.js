import { ErrorTypes, ErrorLevels, MonitorEvents } from "../constant/index.js";

// 获取具体的错误类型
export function getDetailedErrorType(error) {
  console.log(error);

  if (!error) return ErrorTypes.unknown_error;

  // 处理Promise相关错误
  if (error instanceof PromiseRejectionEvent) {
    // 如果是Promise rejection事件，获取具体的reason
    const reason = error.reason;
    // 递归调用以获取reason的具体错误类型
    const reasonType = getDetailedErrorType(reason);
    // 如果reason的类型不是js_error，则返回该具体类型
    if (reasonType !== ErrorTypes.js_error) {
      return reasonType;
    }
    // 否则标记为promise_error
    return ErrorTypes.promise_error;
  }

  // 处理Promise实例或UnhandledPromiseRejection
  if (
    error instanceof Promise ||
    error.name === "UnhandledPromiseRejectionWarning" ||
    (error.message && error.message.includes("Unhandled promise rejection"))
  ) {
    return ErrorTypes.promise_error;
  }

  // 处理框架特定错误
  if (isFrameworkError(error, "vue")) {
    return ErrorTypes.vue_error;
  }

  if (isFrameworkError(error, "react")) {
    return ErrorTypes.react_error;
  }

  // 处理AJAX/Fetch相关错误
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    return ErrorTypes.ajax_error;
  }

  if (
    error.name === "AbortError" ||
    error.name === "FetchError" ||
    (error.message &&
      (error.message.includes("fetch") ||
        error.message.includes("XHR") ||
        error.message.includes("ajax")))
  ) {
    return ErrorTypes.ajax_error;
  }

  // 处理原生错误类型
  switch (error.constructor?.name) {
    case "SyntaxError":
      return ErrorTypes.syntax_error;
    case "ReferenceError":
      return ErrorTypes.reference_error;
    case "TypeError":
      return ErrorTypes.type_error;
    case "RangeError":
      return ErrorTypes.range_error;
    case "EvalError":
      return ErrorTypes.eval_error;
    case "InternalError":
      return ErrorTypes.internal_error;
    case "URIError":
      return ErrorTypes.uri_error;
    case "AggregateError":
      return ErrorTypes.aggregate_error;
    default:
      // 如果是字符串，可能是直接reject的消息
      if (typeof error === "string") {
        // 尝试从字符串中识别特定类型
        const lowerError = error.toLowerCase();
        if (lowerError.includes("network")) return ErrorTypes.network_error;
        if (lowerError.includes("timeout")) return ErrorTypes.timeout_error;
        if (lowerError.includes("validation"))
          return ErrorTypes.validation_error;
        if (lowerError.includes("business")) return ErrorTypes.business_error;
        if (lowerError.includes("memory")) return ErrorTypes.memory_error;
        if (lowerError.includes("iframe")) return ErrorTypes.iframe_error;
        return ErrorTypes.promise_error; // 默认作为promise错误
      }

      // 处理自定义错误类型
      if (
        error.name === "NetworkError" ||
        error.message?.toLowerCase().includes("network")
      ) {
        return ErrorTypes.network_error;
      }
      if (
        error.name === "TimeoutError" ||
        error.message?.toLowerCase().includes("timeout")
      ) {
        return ErrorTypes.timeout_error;
      }
      if (
        error.name === "ValidationError" ||
        error.message?.toLowerCase().includes("validation")
      ) {
        return ErrorTypes.validation_error;
      }
      if (
        error.name === "BusinessError" ||
        error.message?.toLowerCase().includes("business")
      ) {
        return ErrorTypes.business_error;
      }
      if (
        error.name === "MemoryError" ||
        error.message?.toLowerCase().includes("memory") ||
        (error instanceof Error &&
          error.message?.toLowerCase().includes("out of memory"))
      ) {
        return ErrorTypes.memory_error;
      }
      // 检查是否是iframe错误
      if (
        error.target instanceof HTMLIFrameElement ||
        (error.message && error.message.toLowerCase().includes("iframe"))
      ) {
        return ErrorTypes.iframe_error;
      }
      // 检查是否是跨域脚本错误
      if (
        error.message === "Script error." ||
        (error.message?.includes("Script error") && !error.filename)
      ) {
        return ErrorTypes.script_error;
      }
      // 检查console.error
      if (
        error.name === "ConsoleError" ||
        (error.source && error.source === "console.error")
      ) {
        return ErrorTypes.console_error;
      }
      return ErrorTypes.js_error;
  }
}

// 获取错误等级
export function getErrorLevel(errorType) {
  // 致命错误
  if (
    [
      ErrorTypes.internal_error,
      ErrorTypes.memory_error,
      ErrorTypes.aggregate_error,
    ].includes(errorType)
  ) {
    return ErrorLevels.fatal;
  }

  // 警告级别
  if (
    [
      ErrorTypes.resource_error,
      ErrorTypes.network_error,
      ErrorTypes.timeout_error,
    ].includes(errorType)
  ) {
    return ErrorLevels.warning;
  }

  // 默认为error级别
  return ErrorLevels.error;
}

// 辅助函数：检查错误是否来自特定框架
function isFrameworkError(error, framework) {
  if (!error) return false;

  const signature = framework.toLowerCase();
  return (
    error.name?.toLowerCase().includes(signature) ||
    error.message?.toLowerCase().includes(signature) ||
    error.stack?.toLowerCase().includes(signature) ||
    (error.componentStack && framework === "react") || // React特有的componentStack
    (error._isVue && framework === "vue") // Vue特有的_isVue标记
  );
}
