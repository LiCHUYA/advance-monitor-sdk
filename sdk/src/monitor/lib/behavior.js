import { createBehaviorLog } from "../utils/LogFunc/createBehaviorLog.js";
import { getVisitorId, getSessionId } from "./uv-pv.js";
import tracker from "../utils/traker.js";

// 状态管理
let lastEvent;
let lastEventTime = 0;
const eventThrottleTime = 100; // 事件节流时间（毫秒）

// 更新最后一个事件
function updateLastEvent(event) {
  lastEvent = event;
  lastEventTime = Date.now();
}

// 检查是否需要记录事件（简单的节流实现）
function shouldRecordEvent() {
  const now = Date.now();
  if (now - lastEventTime >= eventThrottleTime) {
    return true;
  }
  return false;
}

// 获取元素的埋点数据
function getElementTrackData(element) {
  // 忽略一些不需要统计的元素
  const ignoreTags = ["SCRIPT", "STYLE", "META", "LINK"];
  if (ignoreTags.includes(element.tagName)) {
    return null;
  }

  // 获取元素信息
  const rect = element.getBoundingClientRect();
  return {
    tag: element.tagName.toLowerCase(),
    id: element.id,
    className: element.className,
    text: element.textContent?.trim().slice(0, 50), // 限制文本长度
    href: element.href,
    src: element.src,
    // 获取data-track-*属性，用于手动埋点
    trackId: element.dataset.trackId,
    trackType: element.dataset.trackType,
    trackData: element.dataset.trackData,
    // 位置信息
    position: {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    },
  };
}

// 追踪点击事件
function trackClickEvent(elementInfo) {
  const event = {
    type: "click",
    target: elementInfo,
    timeStamp: Date.now(),
    clientX: elementInfo.position?.x,
    clientY: elementInfo.position?.y,
    path: elementInfo.path,
  };

  const log = createBehaviorLog(event, {
    type: "click",
    context: {
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
    },
  });

  tracker.send(log);
}

// 追踪曝光事件
function trackExposureEvent(exposureInfo) {
  const event = {
    type: "exposure",
    target: exposureInfo.element,
    timeStamp: Date.now(),
    path: exposureInfo.path,
  };

  const log = createBehaviorLog(event, {
    type: "exposure",
    context: {
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      exposureDetails: {
        duration: exposureInfo.duration,
        visiblePercentage: exposureInfo.visiblePercentage,
      },
    },
  });

  tracker.send(log);
}

// 处理点击事件
function handleClick(event) {
  if (!shouldRecordEvent()) return;

  const target = event.target;
  const elementInfo = {
    tagName: target.tagName?.toLowerCase(),
    className: target.className,
    id: target.id,
    innerText: target.innerText?.slice(0, 50), // 限制文本长度
    href: target.href,
    src: target.src,
    position: {
      x: event.clientX,
      y: event.clientY,
    },
    path: Array.from(event.path || event.composedPath() || []).map((node) => ({
      tagName: node.tagName?.toLowerCase(),
      className: node.className,
      id: node.id,
    })),
  };

  trackClickEvent(elementInfo);
  updateLastEvent(event);
}

// 处理页面可见性变化
function handleVisibilityChange() {
  const event = {
    type: "visibility",
    target: {
      state: document.visibilityState,
    },
    timeStamp: Date.now(),
  };

  const log = createBehaviorLog(event, {
    type: "visibility",
    context: {
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
    },
  });

  tracker.send(log);
}

// 处理页面离开
function handleBeforeUnload() {
  const event = {
    type: "unload",
    target: {
      url: window.location.href,
      title: document.title,
    },
    timeStamp: Date.now(),
  };

  const log = createBehaviorLog(event, {
    type: "unload",
    context: {
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
    },
  });

  tracker.send(log);
}

// 初始化行为监控
export function initBehaviorMonitor() {
  // 监听点击事件
  window.addEventListener("click", handleClick, true);

  // 监听页面可见性变化
  document.addEventListener("visibilitychange", handleVisibilityChange, true);

  // 监听页面离开
  window.addEventListener("beforeunload", handleBeforeUnload, true);
}

// 手动埋点方法
export function track(eventName, eventData = {}) {
  const event = {
    type: "custom",
    target: {
      name: eventName,
      data: eventData,
    },
    timeStamp: Date.now(),
  };

  const log = createBehaviorLog(event, {
    type: "custom",
    context: {
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
    },
  });

  tracker.send(log);
}
