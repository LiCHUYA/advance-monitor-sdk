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

  function checkBlankScreen() {
    if (hasReported) return;

    // 生成采样点
    const points = [];
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;

    // 生成采样点坐标
    for (let i = 1; i <= 4; i++) {
      for (let j = 1; j <= 4; j++) {
        const x = (innerWidth * i) / 5;
        const y = (innerHeight * j) / 5;
        points.push([x, y]);
      }
    }

    // 检测每个采样点
    emptyPoints = 0;
    points.forEach(([x, y]) => {
      const elements = document.elementsFromPoint(x, y);
      if (!elements.length || elements.every(isWrapperElement)) {
        emptyPoints++;
      }
    });

    // 如果空白点过多且采样点没有足够的文本内容，判定为白屏
    if (emptyPoints >= emptyPointsLimit && !points.some(hasTextContent)) {
      const error = new Error("Blank Screen detected");
      const errorLog = createStabilityErrorLog(
        {
          message: "Screen is blank",
          error,
          filename: window.location.pathname,
          lineno: 0,
          colno: 0,
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
            // 添加采样点信息
            samplingPoints: points.map(([x, y]) => ({
              x,
              y,
              elements: document.elementsFromPoint(x, y).map((el) => ({
                tagName: el.tagName.toLowerCase(),
                id: el.id || null,
                className: el.className || null,
                hasContent: !!el.textContent?.trim(),
                isWrapper: isWrapperElement(el),
              })),
            })),
          },
        },
        {
          kind: "stability",
          errorType: ErrorTypes.blank_error,
        }
      );

      tracker.send(errorLog);
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
