import { ErrorTypes } from "../constants";
import { createVueErrorLog } from "../utils/LogFunc/createVueErrorLog.js";
import tracker from "../utils/traker.js";

/**
 * Vue2 错误处理函数
 */
function vueErrorHandler(err, vm, info) {
  const errorLog = createVueErrorLog(err, vm, info, false);
  tracker.send(errorLog);
}

/**
 * Vue3 错误处理函数
 * @param {Error} err - 错误对象
 * @param {Object} instance - Vue实例
 * @param {String} info - 错误信息
 */
function vue3ErrorHandler(err, instance, info) {
  const errorLog = createVueErrorLog(err, instance, info, true);
  tracker.send(errorLog);
  console.log(errorLog, "vue3");
}

/**
 * React 错误边界组件
 */
// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false };
//   }

//   static getDerivedStateFromError(error) {
//     return { hasError: true };
//   }

//   componentDidCatch(error, errorInfo) {
//     const errorLog = createStabilityErrorLog(
//       {
//         error,
//         message: error.message || String(error),
//         filename: error.fileName || window.location.href,
//         lineno: error.lineNumber || 0,
//         colno: error.columnNumber || 0,
//         stack: error.stack,
//       },
//       {
//         kind: "stability",
//         errorType: ErrorTypes.react_error,
//       }
//     );

//     // 添加React特定信息
//     errorLog.error.component = {
//       name: this.constructor.name,
//       componentStack: errorInfo.componentStack,
//     };

//     tracker.send(errorLog);
//   }

//   render() {
//     if (this.state.hasError) {
//       return this.props.fallback || null;
//     }
//     return this.props.children;
//   }
// }

/**
 * 初始化框架错误监控
 * @param {Object} options - 配置选项
 * @param {Object} [options.vue2] - Vue2实例
 * @param {Object} [options.vue3App] - Vue3应用实例
 * @param {Object} [options.react] - React实例
 */
export function initFrameworkErrorCapture(options = {}) {
  const { vue2, vue3App, react } = options;

  // Vue2: 直接传入Vue构造函数
  if (vue2) {
    vue2.config.errorHandler = vueErrorHandler;
  }
  // 全局Vue2
  else if (window.Vue?.version?.startsWith("2")) {
    window.Vue.config.errorHandler = vueErrorHandler;
  }

  // Vue3: 传入应用实例
  if (vue3App) {
    console.log(vue3App, "vue3App");
    vue3App.config.errorHandler = vue3ErrorHandler;
  }

  // React: 导出错误边界组件
  if (react) {
    // react.__MonitorErrorBoundary = ErrorBoundary;
  } else {
    // window.__MonitorErrorBoundary = ErrorBoundary;
  }

  return {
    Vue2ErrorHandler: vueErrorHandler,
    Vue3ErrorHandler: vue3ErrorHandler,
  };
}

// 导出错误处理器供单独使用
export const handlers = {
  Vue2ErrorHandler: vueErrorHandler,
  Vue3ErrorHandler: vue3ErrorHandler,
};
