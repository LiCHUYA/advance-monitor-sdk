import tracker from "../utils/traker.js";
import { getVisitorId, getSessionId } from "./uv-pv.js";

class BehaviorTracker {
  constructor() {
    this.lastPageInfo = null;
    this.lastEvent = null;
    this.isVueRouter = false;
  }

  init() {
    // 初始化访问信息
    this.lastPageInfo = {
      title: document.title,
      url: location.href,
      timestamp: Date.now(),
    };

    // 自动埋点：监听所有点击事件
    this.initClickTracking();

    // 自动埋点：监听页面可视区域变化，用于曝光统计
    this.initVisibilityTracking();

    // 路由监听
    this.initRouteTracking();
  }

  // 初始化点击事件追踪
  initClickTracking() {
    document.addEventListener(
      "click",
      (event) => {
        // 防抖，避免短时间内重复点击
        if (this.lastEvent && Date.now() - this.lastEvent.timestamp < 50) {
          return;
        }

        const target = event.target;
        const trackData = this.getElementTrackData(target);

        if (trackData) {
          this.trackClickEvent(trackData);
        }

        this.lastEvent = {
          type: "click",
          timestamp: Date.now(),
        };
      },
      true
    );
  }

  // 获取元素的埋点数据
  getElementTrackData(element) {
    // 忽略一些不需要统计的元素
    const ignoreTags = ["SCRIPT", "STYLE", "META", "LINK"];
    if (ignoreTags.includes(element.tagName)) {
      return null;
    }

    // 获取元素信息
    const rect = element.getBoundingClientRect();
    const elementInfo = {
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

    return elementInfo;
  }

  // 追踪点击事件
  trackClickEvent(elementInfo) {
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

  // 初始化可视区域追踪
  initVisibilityTracking() {
    // 创建交叉观察器
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target;
          const trackData = element.dataset.trackExposure;

          if (trackData && entry.isIntersecting) {
            // 元素进入可视区域
            this.trackExposureEvent({
              element: this.getElementTrackData(element),
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

  // 追踪曝光事件
  trackExposureEvent(exposureInfo) {
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

  // 初始化路由追踪
  initRouteTracking() {
    // 监听 popstate 事件（浏览器前进/后退）
    window.addEventListener("popstate", () => {
      this.handleRouteChange("popstate");
    });

    // 监听 hashchange 事件
    window.addEventListener("hashchange", () => {
      this.handleRouteChange("hashchange");
    });

    // 重写 history 方法
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleRouteChange("pushState");
    };

    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleRouteChange("replaceState");
    };
  }

  // 处理路由变化
  handleRouteChange(trigger) {
    const currentPageInfo = {
      title: document.title,
      url: location.href,
      timestamp: Date.now(),
    };

    // 计算停留时间
    if (this.lastPageInfo) {
      const stayDuration =
        currentPageInfo.timestamp - this.lastPageInfo.timestamp;

      // 发送页面停留时间
      tracker.send({
        kind: "behavior",
        type: "page_stay",
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        page: this.lastPageInfo,
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
      from: this.lastPageInfo?.url,
      to: currentPageInfo.url,
      trigger,
      timestamp: currentPageInfo.timestamp,
    });

    this.lastPageInfo = currentPageInfo;
  }

  // Vue Router 集成
  initVueRouter(router) {
    if (!router || this.isVueRouter) return;

    this.isVueRouter = true;
    router.beforeEach((to, from, next) => {
      // 处理路由变化
      this.handleRouteChange("vue-router");
      next();
    });
  }

  // 手动埋点方法
  track(eventName, eventData = {}) {
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
}

// 创建单例
const behaviorTracker = new BehaviorTracker();

export function initBehaviorTracker(options = {}) {
  behaviorTracker.init();

  // 如果提供了Vue Router实例，则初始化Vue Router追踪
  if (options.router) {
    behaviorTracker.initVueRouter(options.router);
  }
}

// 导出手动埋点方法
export const track = behaviorTracker.track.bind(behaviorTracker);
