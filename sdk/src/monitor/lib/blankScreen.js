import { createStabilityErrorLog } from "../utils/LogFunc/createStabilityErrorLog.js";
import { ErrorTypes } from "../constants/index.js";
import tracker from "../utils/traker.js";

export function initBlankScreen({
  wrapperElements = ["html", "body", "#app", "#root", "#container"],
  textDomCount = 10,
  emptyPointsLimit = 16,
  skip = false,
} = {}) {
  if (skip) return;

  let emptyPoints = 0;
  let hasReported = false; // 防止重复上报

  // 获取元素的选择器
  function getSelector(element) {
    if (!element) return "";
    if (element.id) {
      return `#${element.id}`;
    } else if (element.className && typeof element.className === "string") {
      return `.${element.className.trim().split(/\s+/).join(".")}`;
    }
    return element.tagName.toLowerCase();
  }

  // 判断是否为容器元素
  function isWrapperElement(element) {
    if (!element) return false;
    const selector = getSelector(element);
    return wrapperElements.includes(selector);
  }

  // 判断是否为文本节点
  function hasTextContent(elements) {
    let textCount = 0;
    for (const element of elements) {
      if (element && element.textContent && element.textContent.trim()) {
        textCount++;
      }
    }
    return textCount >= textDomCount;
  }

  // 检测白屏
  function checkBlankScreen() {
    // 如果已经上报过，则不再检测
    if (hasReported) return;

    // 确保DOM已经准备就绪
    if (document.readyState === "loading") {
      return;
    }

    emptyPoints = 0;
    const points = [];

    // 检测水平方向的点
    for (let i = 1; i <= 9; i++) {
      const x = (window.innerWidth * i) / 10;
      const y = window.innerHeight / 2;
      const elements = document.elementsFromPoint(x, y);
      points.push(elements);

      if (!elements.length || elements.every(isWrapperElement)) {
        emptyPoints++;
      }
    }

    // 检测垂直方向的点
    for (let i = 1; i <= 9; i++) {
      const x = window.innerWidth / 2;
      const y = (window.innerHeight * i) / 10;
      const elements = document.elementsFromPoint(x, y);
      points.push(elements);

      if (!elements.length || elements.every(isWrapperElement)) {
        emptyPoints++;
      }
    }

    // 如果空白点过多且采样点没有足够的文本内容，判定为白屏
    if (emptyPoints >= emptyPointsLimit && !points.some(hasTextContent)) {
      const error = new Error("Blank Screen detected");
      const errorLog = createStabilityErrorLog(
        {
          message: "Screen is blank",
          error,
          // 添加白屏特有的信息
          blankScreen: {
            emptyPoints,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
            documentHeight: document.documentElement.offsetHeight,
            documentWidth: document.documentElement.offsetWidth,
            loadTime: performance.now(),
            readyState: document.readyState,
            timing: {
              domComplete: performance.timing?.domComplete,
              loadEventEnd: performance.timing?.loadEventEnd,
            },
          },
        },
        ErrorTypes.blank_error
      );

      // 发送错误日志
      tracker.send(errorLog);
      console.log("白屏", errorLog);
      hasReported = true;
    }
  }

  // 根据页面加载状态决定检测时机
  if (document.readyState === "complete") {
    // 如果页面已经加载完成，直接开始检测
    setTimeout(checkBlankScreen, 3000);
  } else {
    // 在 DOMContentLoaded 事件触发时检测
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(checkBlankScreen, 1000);
    });

    // 在 load 事件触发时再次检测
    window.addEventListener("load", () => {
      setTimeout(checkBlankScreen, 3000);
    });
  }

  // 监听 readystatechange 事件
  document.addEventListener("readystatechange", () => {
    if (document.readyState === "complete") {
      setTimeout(checkBlankScreen, 1000);
    }
  });

  // 在路由变化时检测（适用于SPA应用）
  window.addEventListener("popstate", () => {
    hasReported = false; // 重置上报状态
    setTimeout(checkBlankScreen, 3000);
  });
}
