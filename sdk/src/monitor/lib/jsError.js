import { ErrorTypes, ErrorLevels, MonitorEvents } from "../constants";
import { createErrorLog } from "../utils/createErrorLog.js";
import { getDetailedErrorType, getErrorLevel } from "../utils/index.js";
import tracker from "../utils/traker.js";

// 保存原始的Promise.reject方法
const originalReject = Promise.reject;

// 重写Promise.reject，以捕获错误位置
Promise.reject = function (reason) {
  const locationError = new Error();
  Error.captureStackTrace(locationError);

  // 如果reason是Error实例，保留其信息
  if (reason instanceof Error) {
    reason._originalStack = reason.stack;
  }

  // 添加位置信息到reason
  reason = {
    detail: reason,
    __location: {
      stack: locationError.stack,
      timestamp: Date.now(),
    },
  };

  return originalReject.call(this, reason);
};

// 处理JS运行时错误
function handleRuntimeError(event) {
  const errorLog = createErrorLog(event);

  // 获取详细的错误类型
  const detailedErrorType = getDetailedErrorType(event.error);
  errorLog.meta.errorType = detailedErrorType;
  errorLog.meta.level = getErrorLevel(detailedErrorType);

  // 处理跨域脚本错误
  if (event.message === "Script error." || !event.filename) {
    errorLog.meta.errorType = ErrorTypes.script_error;
  }

  console.log("Error Log:", errorLog);
  tracker.send(errorLog);
}

// 处理资源加载错误
function handleResourceError(event) {
  // 防止事件冒泡和默认行为
  event.preventDefault();

  // 获取目标元素
  const target = event.target;
  if (!target) return;

  // 获取资源URL
  const resourceUrl = target.src || target.href || target.srcset;
  if (!resourceUrl) return;

  // 创建错误对象并捕获堆栈
  const error = new Error(`Resource load failed: ${resourceUrl}`);

  // 获取实际的错误位置
  let errorLocation = {
    filename: window.location.pathname, // 默认使用当前页面路径
    line: 0,
    column: 0,
  };

  try {
    // 1. 尝试从DOM元素获取位置信息
    const scriptStack = new Error().stack;
    if (scriptStack) {
      const stackLines = scriptStack.split("\n");
      // 查找不是SDK内部的第一个调用位置
      for (const line of stackLines) {
        if (
          !line.includes("monitor-sdk.es.js") &&
          !line.includes("node_modules")
        ) {
          const matches = line.match(/at\s+(?:\w+\s+)?\(?(.+):(\d+):(\d+)\)?/);
          if (matches) {
            errorLocation = {
              filename: matches[1],
              line: parseInt(matches[2], 10),
              column: parseInt(matches[3], 10),
            };
            break;
          }
        }
      }
    }

    // 2. 如果无法从堆栈获取，尝试遍历DOM树查找元素位置
    if (errorLocation.line === 0 && target.parentElement) {
      let currentNode = target;
      let lineCount = 0;
      let columnCount = 0;

      // 获取元素在HTML中的位置
      const htmlContent = document.documentElement.outerHTML;
      const lines = htmlContent.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(target.outerHTML)) {
          lineCount = i + 1; // 1-based line number
          columnCount = line.indexOf(target.outerHTML) + 1; // 1-based column number
          break;
        }
      }

      if (lineCount > 0) {
        errorLocation = {
          filename: window.location.pathname,
          line: lineCount,
          column: columnCount,
        };
      }
    }
  } catch (e) {
    console.warn("Error while getting resource error location:", e);
  }

  // 创建错误日志
  const errorLog = createErrorLog({
    error,
    message: error.message,
    filename: errorLocation.filename,
    lineno: errorLocation.line,
    colno: errorLocation.column,
    stack: error.stack,
  });

  // 设置错误类型和级别
  errorLog.meta.errorType = ErrorTypes.resource_error;
  errorLog.meta.level = ErrorLevels.warning;

  // 添加资源特定信息
  errorLog.error.resource = {
    type: target.tagName.toLowerCase(),
    url: resourceUrl,
    element: {
      tagName: target.tagName,
      id: target.id || null,
      className: target.className || null,
      outerHTML: target.outerHTML,
      size:
        target instanceof HTMLImageElement
          ? {
              naturalWidth: target.naturalWidth,
              naturalHeight: target.naturalHeight,
            }
          : null,
    },
    timing: target.timing?.toJSON(),
    performance: {
      loadTime: target.timing
        ? target.timing.loadEventEnd - target.timing.fetchStart
        : null,
      timeToFirstByte: target.timing
        ? target.timing.responseStart - target.timing.fetchStart
        : null,
      redirectTime: target.timing
        ? target.timing.redirectEnd - target.timing.redirectStart
        : null,
    },
    status:
      target instanceof HTMLImageElement
        ? {
            complete: target.complete,
            naturalWidth: target.naturalWidth,
            naturalHeight: target.naturalHeight,
          }
        : null,
    location: errorLocation, // 添加位置信息到资源对象中
  };

  console.log("Resource Error:", errorLog);
  tracker.send(errorLog);
}

// 处理Promise错误
function handlePromiseError(event) {
  console.log("event", event);
  let reason = event.reason;
  let errorLocation = null;
  let originalReason = reason?.detail || reason;
  let locationStack = reason?.__location?.stack;

  // 如果是Error实例（如ReferenceError等运行时错误）
  if (reason instanceof Error) {
    const stackLines = reason.stack.split("\n");
    // 查找第一个非Promise内部的调用位置
    for (const line of stackLines) {
      if (
        !line.includes("Promise.reject") &&
        !line.includes("new Promise (<anonymous>)")
      ) {
        const matches =
          line.match(/at\s+(?:\w+\s+)?\(?(.+):(\d+):(\d+)\)?/) ||
          line.match(/\((.+):(\d+):(\d+)\)/);
        if (matches) {
          errorLocation = {
            filename: matches[1],
            line: parseInt(matches[2], 10),
            column: parseInt(matches[3], 10),
          };
          break;
        }
      }
    }

    // 创建错误日志
    const errorLog = createErrorLog({
      error: reason,
      message: reason.message,
      filename: errorLocation?.filename || "",
      lineno: errorLocation?.line || 0,
      colno: errorLocation?.column || 0,
      stack: reason.stack,
    });

    // 获取详细的错误类型
    const detailedErrorType = getDetailedErrorType(reason);
    errorLog.meta.errorType = detailedErrorType;
    errorLog.meta.level = getErrorLevel(detailedErrorType);

    // 添加Promise特定信息
    errorLog.error.promise = {
      type: event.type,
      reason: reason.message,
      location: errorLocation || {},
      errorType: reason.name,
      stack: reason.stack,
    };

    console.log("Promise Runtime Error:", errorLog);
    tracker.send(errorLog);
    return;
  }

  // 处理直接Promise.reject的情况
  if (locationStack) {
    const stackLines = locationStack.split("\n");
    // 查找调用Promise.reject的位置
    for (const line of stackLines) {
      if (!line.includes("Promise.reject")) {
        const matches =
          line.match(/at\s+(.+):(\d+):(\d+)/) ||
          line.match(/\((.+):(\d+):(\d+)\)/);
        if (matches) {
          errorLocation = {
            filename: matches[1],
            line: parseInt(matches[2], 10),
            column: parseInt(matches[3], 10),
          };
          break;
        }
      }
    }
  }

  // 创建错误日志
  const errorLog = createErrorLog({
    error:
      originalReason instanceof Error
        ? originalReason
        : new Error(String(originalReason)),
    message:
      originalReason instanceof Error
        ? originalReason.message
        : String(originalReason),
    filename: errorLocation?.filename || "",
    lineno: errorLocation?.line || 0,
    colno: errorLocation?.column || 0,
    stack:
      originalReason instanceof Error
        ? originalReason._originalStack || originalReason.stack
        : locationStack,
  });

  // 获取详细的错误类型
  const detailedErrorType = getDetailedErrorType(originalReason);
  errorLog.meta.errorType = detailedErrorType;
  errorLog.meta.level = getErrorLevel(detailedErrorType);

  // 添加Promise特定信息
  errorLog.error.promise = {
    type: event.type,
    reason:
      typeof originalReason === "object"
        ? JSON.stringify(originalReason)
        : String(originalReason),
    location: errorLocation || {},
    timestamp: reason?.__location?.timestamp,
  };

  console.log("Promise Rejection:", errorLog);
  tracker.send(errorLog);
}

// 处理console.error
function handleConsoleError(...args) {
  const error = args[0] instanceof Error ? args[0] : new Error(args.join(" "));
  const errorLog = createErrorLog({ error });

  // 获取详细的错误类型
  const detailedErrorType = getDetailedErrorType(error);
  errorLog.meta.errorType = detailedErrorType;
  errorLog.meta.level = getErrorLevel(detailedErrorType);
  errorLog.error.arguments = args.map((arg) => String(arg));

  console.log("Console Error:", errorLog);
  // TODO: 发送错误信息到服务器
}

// 监听页面生命周期事件
function handleLifecycleEvent(event) {
  const log = {
    type: event.type,
    timestamp: Date.now(),
    url: window.location.href,
  };

  // 对于页面卸载事件，记录停留时间
  if (
    event.type === MonitorEvents.unload ||
    event.type === MonitorEvents.before_unload
  ) {
    log.stayDuration = Date.now() - window.performance.timing.navigationStart;
  }

  console.log("Lifecycle Event:", log);
  // TODO: 发送日志到服务器
}

// 初始化错误监听
export function initJsErrorCapture() {
  // 捕获JS运行时错误
  window.addEventListener(
    MonitorEvents.error,
    (event) => {
      // 检查是否是资源加载错误
      if (
        event.target instanceof HTMLElement &&
        (event.target.tagName === "SCRIPT" ||
          event.target.tagName === "LINK" ||
          event.target.tagName === "IMG" ||
          event.target.tagName === "VIDEO" ||
          event.target.tagName === "AUDIO" ||
          event.target.tagName === "SOURCE")
      ) {
        handleResourceError(event);
      } else {
        handleRuntimeError(event);
      }
    },
    true
  );

  // 捕获未处理的Promise错误
  window.addEventListener(
    MonitorEvents.unhandled_rejection,
    handlePromiseError,
    true
  );

  // 捕获已处理的Promise错误
  window.addEventListener(
    MonitorEvents.rejection_handled,
    handlePromiseError,
    true
  );

  // 重写console.error
  const originalConsoleError = console.error;
  console.error = function (...args) {
    handleConsoleError(...args);
    originalConsoleError.apply(console, args);
  };

  // 监听页面生命周期事件
  window.addEventListener(MonitorEvents.load, handleLifecycleEvent);
  window.addEventListener(MonitorEvents.before_unload, handleLifecycleEvent);
  window.addEventListener(MonitorEvents.unload, handleLifecycleEvent);
  document.addEventListener(
    MonitorEvents.visibility_change,
    handleLifecycleEvent
  );

  // 监听网络状态变化
  window.addEventListener(MonitorEvents.online, handleLifecycleEvent);
  window.addEventListener(MonitorEvents.offline, handleLifecycleEvent);

  // 如果使用了框架，添加框架特定的错误处理
  if (window.Vue) {
    window.Vue.config.errorHandler = (error, vm, info) => {
      const errorLog = createErrorLog({ error });

      // 获取详细的错误类型
      const detailedErrorType = getDetailedErrorType(error);
      errorLog.meta.errorType = detailedErrorType;
      errorLog.meta.level = getErrorLevel(detailedErrorType);

      errorLog.error.component = {
        name: vm?.$options?.name || "anonymous",
        props: vm?.$options?.propsData,
        info,
      };

      console.log("Vue Error:", errorLog);
      // TODO: 发送错误信息到服务器
    };
  }

  // React错误边界处理示例
  // 需要在React组件中实现componentDidCatch或static getDerivedStateFromError
  window._handleReactError = (error, errorInfo) => {
    const errorLog = createErrorLog({ error });

    // 获取详细的错误类型
    const detailedErrorType = getDetailedErrorType(error);
    errorLog.meta.errorType = detailedErrorType;
    errorLog.meta.level = getErrorLevel(detailedErrorType);

    errorLog.error.component = {
      stack: errorInfo?.componentStack,
    };

    console.log("React Error:", errorLog);
    // TODO: 发送错误信息到服务器
  };

  // 监听iframe错误
  const iframes = document.getElementsByTagName("iframe");
  Array.from(iframes).forEach((iframe) => {
    try {
      iframe.contentWindow.addEventListener(
        MonitorEvents.error,
        (event) => {
          event.preventDefault();
          const errorLog = createErrorLog(event);
          errorLog.meta.errorType = ErrorTypes.iframe_error;
          errorLog.meta.level = ErrorLevels.error;
          errorLog.error.iframe = {
            src: iframe.src,
            id: iframe.id || null,
            name: iframe.name || null,
          };
          console.log("IFrame Error:", errorLog);
          // TODO: 发送错误信息到服务器
        },
        true
      );
    } catch (e) {
      // 跨域iframe可能无法访问contentWindow
      console.warn("Unable to add error listener to iframe:", e);
    }
  });
}
