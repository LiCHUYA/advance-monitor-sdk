import tracker from "../utils/traker.js";

// 生成访客ID
function generateVisitorId() {
  // 使用设备信息和时间戳生成唯一ID
  const deviceInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
  };

  // 将设备信息转换为字符串并进行hash
  const deviceString = JSON.stringify(deviceInfo);
  let hash = 0;
  for (let i = 0; i < deviceString.length; i++) {
    const char = deviceString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  // 添加时间戳使其更唯一
  const timestamp = new Date().getTime();
  const visitorId = `${Math.abs(hash)}-${timestamp}`;

  return visitorId;
}

// 获取或创建访客ID
function getVisitorId() {
  const storageKey = "_monitor_visitor_id";
  let visitorId = localStorage.getItem(storageKey);

  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(storageKey, visitorId);
  }

  return visitorId;
}

// 获取会话ID
function getSessionId() {
  const storageKey = "_monitor_session_id";
  let sessionId = sessionStorage.getItem(storageKey);

  if (!sessionId) {
    sessionId = `s-${Date.now()}`;
    sessionStorage.setItem(storageKey, sessionId);
  }

  return sessionId;
}

// 记录页面访问信息
function recordPageView() {
  const visitorId = getVisitorId();
  const sessionId = getSessionId();
  const timestamp = Date.now();

  // 获取页面信息
  const pageInfo = {
    title: document.title,
    url: window.location.href,
    referrer: document.referrer,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date(timestamp).toISOString(),
  };

  // 发送PV数据
  tracker.send({
    kind: "business",
    type: "pv",
    visitorId,
    sessionId,
    ...pageInfo,
  });

  // 更新UV统计
  const today = new Date().toISOString().split("T")[0];
  const uvKey = `_monitor_uv_${today}`;
  const visitedToday = localStorage.getItem(uvKey);

  if (!visitedToday) {
    localStorage.setItem(uvKey, "1");
    // 发送UV数据
    tracker.send({
      kind: "business",
      type: "uv",
      visitorId,
      sessionId,
      date: today,
      ...pageInfo,
    });
  }

  return { visitorId, sessionId, timestamp };
}

// 页面停留时间统计
class PageDuration {
  constructor() {
    this.startTime = Date.now();
    this.lastActiveTime = this.startTime;
    this.totalDuration = 0;
    this.isHidden = false;
    this.pageInfo = null;

    // 绑定方法到实例
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
    this.handleBeforeUnload = this.handleBeforeUnload.bind(this);
    this.updateActiveTime = this.updateActiveTime.bind(this);
  }

  init() {
    // 记录页面信息
    this.pageInfo = recordPageView();

    // 监听页面可见性变化
    document.addEventListener("visibilitychange", this.handleVisibilityChange);

    // 监听页面即将关闭
    window.addEventListener("beforeunload", this.handleBeforeUnload);

    // 定期更新活跃时间
    this.activeInterval = setInterval(this.updateActiveTime, 1000);

    // 监听用户活动
    ["click", "mousemove", "keydown", "scroll", "touchstart"].forEach(
      (event) => {
        document.addEventListener(event, () => {
          this.lastActiveTime = Date.now();
        });
      }
    );
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // 页面隐藏，记录当前停留时间
      this.isHidden = true;
      this.updateDuration();
    } else {
      // 页面重新可见，重置开始时间
      this.isHidden = false;
      this.startTime = Date.now();
      this.lastActiveTime = this.startTime;
    }
  }

  updateActiveTime() {
    if (!this.isHidden) {
      const now = Date.now();
      // 如果用户超过30秒没有活动，不计入停留时间
      if (now - this.lastActiveTime < 30000) {
        this.totalDuration += 1000; // 增加1秒
      }
    }
  }

  updateDuration() {
    if (!this.isHidden) {
      const now = Date.now();
      if (now - this.lastActiveTime < 30000) {
        this.totalDuration += now - this.startTime;
      }
      this.startTime = now;
    }
  }

  handleBeforeUnload() {
    this.updateDuration();
    this.sendDurationReport();
  }

  sendDurationReport() {
    // 清除定时器
    clearInterval(this.activeInterval);

    // 发送停留时间数据
    if (this.pageInfo) {
      tracker.send({
        kind: "business",
        type: "duration",
        visitorId: this.pageInfo.visitorId,
        sessionId: this.pageInfo.sessionId,
        startTimestamp: this.pageInfo.timestamp,
        endTimestamp: Date.now(),
        totalDuration: this.totalDuration,
        url: window.location.href,
        title: document.title,
      });
    }
  }
}

let pageDuration;

export function initUvPv() {
  // 创建并初始化页面停留时间统计实例
  pageDuration = new PageDuration();
  pageDuration.init();

  // 处理单页应用的路由变化
  let lastUrl = window.location.href;

  // 使用 MutationObserver 监听 title 变化
  const titleObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      // 发送上一个页面的停留时间
      pageDuration.sendDurationReport();

      // 重新初始化统计
      lastUrl = window.location.href;
      pageDuration = new PageDuration();
      pageDuration.init();
    }
  });

  // 监听 title 变化
  titleObserver.observe(document.querySelector("title"), {
    subtree: true,
    characterData: true,
    childList: true,
  });

  // 监听 popstate 事件（处理浏览器前进/后退）
  window.addEventListener("popstate", () => {
    if (window.location.href !== lastUrl) {
      pageDuration.sendDurationReport();
      lastUrl = window.location.href;
      pageDuration = new PageDuration();
      pageDuration.init();
    }
  });
}
