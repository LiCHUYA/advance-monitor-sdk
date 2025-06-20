import { ErrorTypes, ErrorLevels, MonitorEvents } from "../constant/index.js";
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
  const errorLog = createErrorLog(event);
  errorLog.meta.errorType = ErrorTypes.resource_error;
  errorLog.meta.level = ErrorLevels.warning;

  // 添加资源特定信息
  errorLog.error.resource = {
    type: event.target.tagName.toLowerCase(),
    url: event.target.src || event.target.href,
    timing: event.target.timing?.toJSON(),
  };

  console.log("Resource Error:", errorLog);
  // TODO: 发送错误信息到服务器
}

// 处理Promise错误
function handlePromiseError(event) {
  let reason = event.reason;
  let errorLocation = null;
  let originalReason = reason?.detail || reason;
  let locationStack = reason?.__location?.stack;

  // 如果有位置信息，解析它
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

  console.log("Promise Error:", errorLog);

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
export function initErrorCapture() {
  // 捕获JS运行时错误
  window.addEventListener(
    MonitorEvents.error,
    (event) => {
      if (event.target === window || !event.target) {
        handleRuntimeError(event);
      } else {
        handleResourceError(event);
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

  // 监听 AJAX 错误
  const originalXHRSend = XMLHttpRequest.prototype.send;
  const originalXHROpen = XMLHttpRequest.prototype.open;

  XMLHttpRequest.prototype.open = function (...args) {
    this._url = args[1]; // 保存请求URL
    this._method = args[0]; // 保存请求方法
    originalXHROpen.apply(this, args);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    const startTime = Date.now();

    // 监听 XHR 错误
    this.addEventListener("error", (event) => {
      const errorLog = createErrorLog(event);
      errorLog.meta.errorType = ErrorTypes.ajax_error;
      errorLog.meta.level = ErrorLevels.error;
      errorLog.error.ajax = {
        url: this._url,
        method: this._method,
        status: this.status,
        statusText: this.statusText,
        duration: Date.now() - startTime,
        response: this.response,
        requestData: args[0],
      };
      console.log("AJAX Error:", errorLog);
      // TODO: 发送错误信息到服务器
    });

    // 监听 XHR 超时
    this.addEventListener("timeout", (event) => {
      const errorLog = createErrorLog(event);
      errorLog.meta.errorType = ErrorTypes.timeout_error;
      errorLog.meta.level = ErrorLevels.warning;
      errorLog.error.ajax = {
        url: this._url,
        method: this._method,
        timeout: this.timeout,
        duration: Date.now() - startTime,
      };
      console.log("AJAX Timeout:", errorLog);
      // TODO: 发送错误信息到服务器
    });

    originalXHRSend.apply(this, args);
  };

  // 监听 Fetch 错误
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const startTime = Date.now();
    const request = args[0] instanceof Request ? args[0] : new Request(...args);

    try {
      const response = await originalFetch.apply(this, args);
      if (!response.ok) {
        const errorLog = createErrorLog(
          new Error(`HTTP error! status: ${response.status}`)
        );
        errorLog.meta.errorType = ErrorTypes.ajax_error;
        errorLog.meta.level = ErrorLevels.error;
        errorLog.error.fetch = {
          url: request.url,
          method: request.method,
          status: response.status,
          statusText: response.statusText,
          duration: Date.now() - startTime,
        };
        console.log("Fetch Error:", errorLog);
        // TODO: 发送错误信息到服务器
      }
      return response;
    } catch (error) {
      const errorLog = createErrorLog(error);
      errorLog.meta.errorType = ErrorTypes.ajax_error;
      errorLog.meta.level = ErrorLevels.error;
      errorLog.error.fetch = {
        url: request.url,
        method: request.method,
        duration: Date.now() - startTime,
        error: error.message,
      };
      console.log("Fetch Error:", errorLog);
      // TODO: 发送错误信息到服务器
      throw error; // 继续抛出错误，保持原有行为
    }
  };
}
