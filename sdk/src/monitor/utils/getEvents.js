import { MonitorEvents } from "../constant/index.js";

const allEvents = [
  // ========== 鼠标事件 ==========
  "click", // 点击（按下并释放）
  "dblclick", // 双击
  "mousedown", // 鼠标按下
  "mouseup", // 鼠标释放
  "mousemove", // 鼠标移动
  "mouseenter", // 鼠标进入元素（不冒泡）
  "mouseleave", // 鼠标离开元素（不冒泡）
  "mouseover", // 鼠标进入元素（冒泡）
  "mouseout", // 鼠标离开元素（冒泡）
  "contextmenu", // 右键菜单
  "wheel", // 滚轮滚动
  "auxclick", // 非主按钮点击（如鼠标中键）

  // ========== 触摸/指针事件 ==========
  "touchstart", // 手指触摸开始
  "touchmove", // 手指移动
  "touchend", // 手指离开
  "touchcancel", // 触摸中断
  "pointerdown", // 统一指针按下（兼容鼠标/触摸/笔）
  "pointerup", // 统一指针释放
  "pointermove", // 统一指针移动
  "pointerover", // 统一指针进入
  "pointerout", // 统一指针离开
  "pointercancel", // 指针操作取消
  "gotpointercapture", // 元素捕获指针事件
  "lostpointercapture", // 元素丢失指针捕获

  // ========== 键盘事件 ==========
  "keydown", // 按键按下
  "keyup", // 按键释放
  "keypress", // 按键按压（已废弃，但仍有使用）

  // ========== 表单事件 ==========
  "input", // 输入值变化（实时）
  "change", // 值提交变化（失焦后）
  "focus", // 获取焦点
  "blur", // 失去焦点
  "focusin", // 冒泡版focus
  "focusout", // 冒泡版blur
  "submit", // 表单提交
  "reset", // 表单重置
  "select", // 文本被选中
  "invalid", // 表单验证失败

  // ========== 视图/窗口事件 ==========
  "scroll", // 元素滚动
  "resize", // 窗口大小变化
  "fullscreenchange", // 全屏状态变化
  "fullscreenerror", // 全屏错误
  "hashchange", // URL hash变化
  "popstate", // 浏览器历史变化

  // ========== 媒体事件 ==========
  "play", // 媒体开始播放
  "pause", // 媒体暂停
  "ended", // 播放结束
  "volumechange", // 音量变化
  "timeupdate", // 播放进度更新
  "canplay", // 可开始播放
  "loadedmetadata", // 元数据加载完成
  "durationchange", // 时长变化

  // ========== 拖拽事件 ==========
  "dragstart", // 开始拖拽
  "drag", // 拖拽中
  "dragend", // 拖拽结束
  "dragenter", // 进入可放置目标
  "dragleave", // 离开可放置目标
  "dragover", // 在目标上悬停
  "drop", // 在目标释放

  // ========== 剪贴板事件 ==========
  "copy", // 复制操作
  "cut", // 剪切操作
  "paste", // 粘贴操作
  "beforecopy", // 复制前
  "beforecut", // 剪切前
  "beforepaste", // 粘贴前

  // ========== CSS动画/过渡事件 ==========
  "transitionstart", // 过渡开始
  "transitionrun", // 过渡运行中
  "transitionend", // 过渡结束
  "transitioncancel", // 过渡取消
  "animationstart", // 动画开始
  "animationend", // 动画结束
  "animationiteration", // 动画重复
  "animationcancel", // 动画取消

  // ========== 页面生命周期事件 ==========
  "DOMContentLoaded", // DOM解析完成
  "load", // 页面完全加载
  "beforeunload", // 页面关闭前
  "unload", // 页面卸载中
  "pagehide", // 页面隐藏（如跳转）
  "pageshow", // 页面显示
  "visibilitychange", // 页面可见性变化

  // ========== 错误/资源事件 ==========
  "error", // 资源加载错误
  "abort", // 资源加载中止
  "loadend", // 资源加载结束（无论成功失败）
  "timeout", // 请求超时

  // ========== WebSocket/网络事件 ==========
  "open", // 连接建立
  "message", // 收到消息
  "error", // 连接错误
  "close", // 连接关闭

  // ========== 其他重要事件 ==========
  "toggle", // details元素切换
  "slotchange", // slot内容变化
  "languagechange", // 系统语言变化
  "offline", // 网络断开
  "online", // 网络恢复
  "storage", // localStorage变化
  "messageerror", // 消息解析错误
];

/**
 * 获取事件路径上的所有DOM元素
 * @param {Event} e - 事件对象
 * @returns {Array} - DOM元素数组
 */
export const getComposePathEle = (e) => {
  if (!e) return [];
  // 优先使用标准的 composedPath 方法
  let pathArr = e.composedPath && e.composedPath();

  if (pathArr && pathArr.length) {
    return pathArr;
  }

  // 降级方案：手动构建路径
  let target = e.target;
  const composedPath = [];

  while (target && target.parentNode) {
    composedPath.push(target);
    target = target.parentNode;
  }
  // 添加 document 和 window
  if (document) composedPath.push(document);
  if (window) composedPath.push(window);

  return composedPath;
};

/**
 * 获取事件路径上元素的选择器数组
 * @param {Event} e - 事件对象
 * @returns {Array} - 选择器数组
 */
export const getComposePath = (e) => {
  if (!e) return [];
  const composedPathEle = getComposePathEle(e);

  return composedPathEle
    .map((ele) => {
      // 处理特殊对象
      if (ele === window) return "window";
      if (ele === document) return "document";
      if (!ele.tagName) return "";

      // 处理普通DOM元素
      let selector = ele.tagName.toLowerCase();
      if (ele.id) {
        selector += `#${ele.id}`;
      }
      if (ele.className && typeof ele.className === "string") {
        selector += `.${ele.className.trim().replace(/\s+/g, ".")}`;
      }
      return selector;
    })
    .filter(Boolean)
    .reverse();
};

/**
 * 获取事件路径的选择器字符串
 * @param {Event} e - 事件对象
 * @returns {string} - 选择器字符串
 */
export const getPaths = (e) => {
  if (!e) return "";

  // 如果是错误事件，尝试从错误事件的目标元素获取路径
  if (e.type === "error" && e.target && e.target.tagName) {
    return `window > document > ${e.target.tagName.toLowerCase()}`;
  }

  // 如果是普通事件，获取完整的事件路径
  const composedPath = getComposePath(e);
  return composedPath.join(" > ");
};

/**
 * 获取元素的选择器
 * @param {Element} element DOM元素
 * @returns {string} 选择器
 */
const getElementSelector = (element) => {
  if (!element || !element.tagName) return "";

  let selector = element.tagName.toLowerCase();
  if (element.id) {
    selector += `#${element.id}`;
  }
  if (element.className && typeof element.className === "string") {
    selector += `.${element.className.trim().replace(/\s+/g, ".")}`;
  }
  return selector;
};

/**
 * 获取元素的路径
 * @param {Element} element DOM元素
 * @returns {string} 元素路径
 */
const getElementPath = (element) => {
  if (!element || !element.tagName) return "";

  const path = [];
  let currentElement = element;

  while (currentElement) {
    const selector = getElementSelector(currentElement);
    if (selector) {
      path.unshift(selector);
    }
    currentElement = currentElement.parentElement;
  }

  path.unshift("document");
  path.unshift("window");
  return path.join(" > ");
};

// 记录最后一个用户交互事件
let lastEvent;
const userEvents = ["click", "touchstart", "mousedown", "keydown", "mouseover"];
userEvents.forEach((eventType) => {
  window.addEventListener(
    eventType,
    (e) => {
      lastEvent = e;
    },
    {
      capture: true,
      passive: true,
    }
  );
});

export function getLastEvent() {
  return lastEvent;
}

/**
 * 获取最后一次事件的路径
 * @returns {string|null} 事件路径
 */
export function getLastEventPath() {
  if (!lastEvent || !lastEvent.target) return null;
  return getElementPath(lastEvent.target);
}

/**
 * 获取错误发生时的上下文信息
 * @param {Event} errorEvent - 错误事件对象
 * @returns {Object} 错误上下文信息
 */
export function getErrorContext(errorEvent) {
  // 获取最后一次用户交互事件
  const lastUserEvent = getLastEvent();

  const context = {
    // 错误事件类型
    type: errorEvent.type,
    // 如果是资源加载错误，记录资源信息
    resource: null,
    // 用户最后交互的元素路径
    eventPath: null,
    // 最后的用户交互类型
    lastEventType: lastUserEvent?.type,
    // 发生错误的元素（如果有）
    errorElement: null,
  };

  // 处理不同类型的错误
  if (errorEvent.type === MonitorEvents.error) {
    // 如果是资源加载错误
    if (errorEvent.target && errorEvent.target !== window) {
      context.resource = {
        url: errorEvent.target.src || errorEvent.target.href,
        type: errorEvent.target.tagName.toLowerCase(),
        path: getElementPath(errorEvent.target),
      };
      context.errorElement = getElementPath(errorEvent.target);
    }
    // 如果有最后的用户交互，记录路径
    if (lastUserEvent && lastUserEvent.target) {
      context.eventPath = getElementPath(lastUserEvent.target);
    }
  }
  // 如果是 Promise 错误，记录最后的交互上下文
  else if (errorEvent.type === MonitorEvents.unhandled_rejection) {
    if (lastUserEvent && lastUserEvent.target) {
      context.eventPath = getElementPath(lastUserEvent.target);
    }
  }

  return context;
}
