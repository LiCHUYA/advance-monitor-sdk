import tracker from "../utils/traker.js";
import { getVisitorId, getSessionId } from "./uv-pv.js";

// 状态管理
const state = {
  lastPageInfo: null,
  lastEvent: null,
  isVueRouter: false,
};

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
  tracker.send({
    kind: "behavior",
    type: "click",
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    timestamp: Date.now(),
    page: {
      title: document.title,
      url: location.href,
    },
    element: elementInfo,
  });
}

// 追踪曝光事件
function trackExposureEvent(exposureInfo) {
  tracker.send({
    kind: "behavior",
    type: "exposure",
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    timestamp: Date.now(),
    page: {
      title: document.title,
      url: location.href,
    },
    exposure: exposureInfo,
  });
}

// 初始化点击事件追踪
function initClickTracking() {
  document.addEventListener(
    "click",
    (event) => {
      // 防抖，避免短时间内重复点击
      if (state.lastEvent && Date.now() - state.lastEvent.timestamp < 50) {
        return;
      }

      const target = event.target;
      const trackData = getElementTrackData(target);

      if (trackData) {
        trackClickEvent(trackData);
      }

      state.lastEvent = {
        type: "click",
        timestamp: Date.now(),
      };
    },
    true
  );
}

// 初始化可视区域追踪
function initVisibilityTracking() {
  // 创建交叉观察器
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const element = entry.target;
        const trackData = element.dataset.trackExposure;

        if (trackData && entry.isIntersecting) {
          // 元素进入可视区域
          trackExposureEvent({
            element: getElementTrackData(element),
            exposureData: trackData,
            visibleRatio: entry.intersectionRatio,
          });

          // 如果只需要统计一次曝光，则取消观察
          if (element.dataset.trackExposureOnce === "true") {
            observer.unobserve(element);
          }
        }
      });
    },
    {
      threshold: [0, 0.5, 1], // 监听0%、50%、100%可见度
    }
  );

  // 观察带有data-track-exposure属性的元素
  document.querySelectorAll("[data-track-exposure]").forEach((element) => {
    observer.observe(element);
  });
}

// 处理路由变化
function handleRouteChange(trigger) {
  const currentPageInfo = {
    title: document.title,
    url: location.href,
    timestamp: Date.now(),
  };

  // 计算停留时间
  if (state.lastPageInfo) {
    const stayDuration =
      currentPageInfo.timestamp - state.lastPageInfo.timestamp;

    // 发送页面停留时间
    tracker.send({
      kind: "behavior",
      type: "page_stay",
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      page: state.lastPageInfo,
      duration: stayDuration,
      trigger,
    });
  }

  // 发送页面切换事件
  tracker.send({
    kind: "behavior",
    type: "page_change",
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    from: state.lastPageInfo?.url,
    to: currentPageInfo.url,
    trigger,
    timestamp: currentPageInfo.timestamp,
  });

  state.lastPageInfo = currentPageInfo;
}

// 初始化路由追踪
function initRouteTracking() {
  // 监听 popstate 事件（浏览器前进/后退）
  window.addEventListener("popstate", () => {
    handleRouteChange("popstate");
  });

  // 监听 hashchange 事件
  window.addEventListener("hashchange", () => {
    handleRouteChange("hashchange");
  });

  // 重写 history 方法
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = (...args) => {
    originalPushState.apply(history, args);
    handleRouteChange("pushState");
  };

  history.replaceState = (...args) => {
    originalReplaceState.apply(history, args);
    handleRouteChange("replaceState");
  };
}

// Vue Router 集成
function initVueRouter(router) {
  if (!router || state.isVueRouter) return;

  state.isVueRouter = true;
  router.beforeEach((to, from, next) => {
    handleRouteChange("vue-router");
    next();
  });
}

// 初始化行为追踪
function init() {
  state.lastPageInfo = {
    title: document.title,
    url: location.href,
    timestamp: Date.now(),
  };

  initClickTracking();
  initVisibilityTracking();
  initRouteTracking();
}

// 手动埋点方法
export function track(eventName, eventData = {}) {
  tracker.send({
    kind: "behavior",
    type: "custom",
    visitorId: getVisitorId(),
    sessionId: getSessionId(),
    timestamp: Date.now(),
    page: {
      title: document.title,
      url: location.href,
    },
    event: {
      name: eventName,
      data: eventData,
    },
  });
}

// 初始化行为追踪
export function initBehaviorTracker(options = {}) {
  init();

  // 如果提供了Vue Router实例，则初始化Vue Router追踪
  if (options.router) {
    initVueRouter(options.router);
  }
}
