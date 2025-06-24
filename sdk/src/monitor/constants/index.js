// 错误类型
export const ErrorTypes = {
  // 基础错误类型
  js_error: "jsError", // JS语法、运行时错误
  resource_error: "resourceError", // 资源加载错误
  promise_error: "promiseError", // Promise错误
  ajax_error: "ajaxError", // AJAX请求错误
  vue_error: "vueError", // Vue错误
  react_error: "reactError", // React错误
  console_error: "consoleError", // console.error错误
  iframe_error: "iframeError", // iframe错误
  script_error: "scriptError", // 跨域脚本错误
  blank_error: "blankError", // 白屏错误

  // 原生JavaScript错误类型
  syntax_error: "SyntaxError", // 语法错误
  reference_error: "ReferenceError", // 引用错误
  type_error: "TypeError", // 类型错误
  range_error: "RangeError", // 范围错误
  eval_error: "EvalError", // eval()错误
  internal_error: "InternalError", // JavaScript引擎内部错误
  uri_error: "URIError", // URI相关错误
  aggregate_error: "AggregateError", // 多个错误的包装器(Promise.any)

  // 自定义错误类型
  business_error: "businessError", // 业务逻辑错误
  validation_error: "validationError", // 数据验证错误
  network_error: "networkError", // 网络请求错误
  timeout_error: "timeoutError", // 超时错误
  memory_error: "memoryError", // 内存相关错误
  unknown_error: "unknownError", // 未知错误
};

// 错误等级
export const ErrorLevels = {
  fatal: "fatal", // 致命错误
  error: "error", // 普通错误
  warning: "warning", // 警告
  info: "info", // 信息
};

// 需要监听的事件
export const MonitorEvents = {
  // 错误事件
  error: "error", // JS错误、资源加载错误
  unhandled_rejection: "unhandledrejection", // Promise未处理的rejection
  rejection_handled: "rejectionhandled", // Promise处理了的rejection

  // 页面生命周期事件
  load: "load", // 页面加载完成
  before_unload: "beforeunload", // 页面即将卸载
  unload: "unload", // 页面卸载
  visibility_change: "visibilitychange", // 页面可见性改变

  // 用户交互事件
  click: "click",
  dblclick: "dblclick",
  contextmenu: "contextmenu",
  keydown: "keydown",
  keyup: "keyup",
  mousedown: "mousedown",
  mousemove: "mousemove",
  mouseup: "mouseup",
  touchstart: "touchstart",
  touchmove: "touchmove",
  touchend: "touchend",

  // 网络相关事件
  offline: "offline", // 网络断开
  online: "online", // 网络连接

  // 窗口事件
  resize: "resize", // 窗口大小改变
  scroll: "scroll", // 页面滚动

  // 表单事件
  focus: "focus",
  blur: "blur",
  change: "change",
  submit: "submit",
};

// 行为类型
export const BEHAVIOR_TYPES = {
  CLICK: "click", // 点击事件
  EXPOSURE: "exposure", // 曝光事件
  CUSTOM: "custom", // 自定义事件
  PAGE_VIEW: "page_view", // 页面访问
  PAGE_LEAVE: "page_leave", // 页面离开
  PAGE_HIDE: "page_hide", // 页面隐藏
  PAGE_SHOW: "page_show", // 页面显示
  ROUTE_CHANGE: "route_change", // 路由变化
};

// 性能指标评级规则（单位：毫秒）
export const PERFORMANCE_RATING_RULES = {
  // 首次内容绘制 (FCP)
  FCP: {
    good: 1800, // 0-1800ms 为好
    needsImprovement: 3000, // 1800-3000ms 需要改进
    // > 3000ms 为差
  },

  // 最大内容绘制 (LCP)
  LCP: {
    good: 2500, // 0-2500ms 为好
    needsImprovement: 4000, // 2500-4000ms 需要改进
    // > 4000ms 为差
  },

  // 首次输入延迟 (FID)
  FID: {
    good: 100, // 0-100ms 为好
    needsImprovement: 300, // 100-300ms 需要改进
    // > 300ms 为差
  },

  // 累积布局偏移 (CLS)
  CLS: {
    good: 0.1, // 0-0.1 为好
    needsImprovement: 0.25, // 0.1-0.25 需要改进
    // > 0.25 为差
  },

  // 首次字节时间 (TTFB)
  TTFB: {
    good: 800, // 0-800ms 为好
    needsImprovement: 1800, // 800-1800ms 需要改进
    // > 1800ms 为差
  },

  // DOM加载时间
  domReady: {
    good: 2000,
    needsImprovement: 4000,
  },

  // 页面完全加载时间
  loadTime: {
    good: 3000,
    needsImprovement: 6000,
  },

  // 首屏时间
  firstScreen: {
    good: 2500,
    needsImprovement: 4000,
  },
};
