import tracker from "../utils/traker.js";

// 状态管理
const state = {
  startTime: null,
  lastActiveTime: null,
  totalDuration: 0,
  isHidden: false,
  pageInfo: null,
  activeInterval: null,
};

// 生成访客ID
function generateVisitorId() {
  const deviceInfo = {
    userAgent: navigator.userAgent,
    language: navigator.language,
    platform: navigator.platform,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
  };

  const deviceString = JSON.stringify(deviceInfo);
  let hash = 0;
  for (let i = 0; i < deviceString.length; i++) {
    const char = deviceString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const timestamp = new Date().getTime();
  return `${Math.abs(hash)}-${timestamp}`;
}

// 获取或创建访客ID
export function getVisitorId() {
  const storageKey = "_monitor_visitor_id";
  let visitorId = localStorage.getItem(storageKey);

  if (!visitorId) {
    visitorId = generateVisitorId();
    localStorage.setItem(storageKey, visitorId);
  }

  return visitorId;
}

// 获取会话ID
export function getSessionId() {
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

// 更新活跃时间
function updateActiveTime() {
  if (!state.isHidden) {
    const now = Date.now();
    if (now - state.lastActiveTime < 30000) {
      state.totalDuration += 1000;
    }
  }
}

// 更新停留时间
function updateDuration() {
  if (!state.isHidden) {
    const now = Date.now();
    if (now - state.lastActiveTime < 30000) {
      state.totalDuration += now - state.startTime;
    }
    state.startTime = now;
  }
}

// 处理页面可见性变化
function handleVisibilityChange() {
  if (document.hidden) {
    state.isHidden = true;
    updateDuration();
  } else {
    state.isHidden = false;
    state.startTime = Date.now();
    state.lastActiveTime = state.startTime;
  }
}

// 发送停留时间报告
function sendDurationReport() {
  clearInterval(state.activeInterval);

  if (state.pageInfo) {
    tracker.send({
      kind: "business",
      type: "duration",
      visitorId: state.pageInfo.visitorId,
      sessionId: state.pageInfo.sessionId,
      startTimestamp: state.pageInfo.timestamp,
      endTimestamp: Date.now(),
      totalDuration: state.totalDuration,
      url: window.location.href,
      title: document.title,
    });
  }
}

// 处理页面即将关闭
function handleBeforeUnload() {
  updateDuration();
  sendDurationReport();
}

// 初始化页面停留时间统计
function initPageDuration() {
  state.startTime = Date.now();
  state.lastActiveTime = state.startTime;
  state.totalDuration = 0;
  state.isHidden = false;
  state.pageInfo = recordPageView();

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);

  state.activeInterval = setInterval(updateActiveTime, 1000);

  ["click", "mousemove", "keydown", "scroll", "touchstart"].forEach((event) => {
    document.addEventListener(event, () => {
      state.lastActiveTime = Date.now();
    });
  });
}

// 初始化UV-PV统计
export function initUvPv() {
  initPageDuration();

  let lastUrl = window.location.href;

  // 监听title变化
  const titleObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      sendDurationReport();
      lastUrl = window.location.href;
      initPageDuration();
    }
  });

  titleObserver.observe(document.querySelector("title"), {
    subtree: true,
    characterData: true,
    childList: true,
  });

  // 监听popstate事件
  window.addEventListener("popstate", () => {
    if (window.location.href !== lastUrl) {
      sendDurationReport();
      lastUrl = window.location.href;
      initPageDuration();
    }
  });
}
