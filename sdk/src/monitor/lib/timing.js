import { createPerformanceLog } from "../utils/LogFunc/createPerformanceLog.js";
import { createStabilityErrorLog } from "../utils/LogFunc/createStabilityErrorLog.js";
import { ErrorTypes } from "../constants/index.js";
import tracker from "../utils/traker.js";

// 格式化时间为毫秒，并确保是有效的数值
function formatTimeToMS(time) {
  if (typeof time !== "number" || !isFinite(time)) {
    return "0.000ms";
  }
  // 统一保留3位小数
  return `${time.toFixed(3)}ms`;
}

// 计算时间差并格式化
function calculateTimeDiff(endTime, startTime) {
  if (!endTime || !startTime) {
    return {
      value: "0.000ms",
      reason: "Invalid timing values",
    };
  }
  const diff = endTime - startTime;
  return {
    value: formatTimeToMS(diff),
    raw: diff,
  };
}

// 格式化时间戳
function formatTimestamp(timestamp) {
  if (!timestamp) return "Invalid timestamp";
  return new Date(timestamp).toISOString();
}

// 获取设备和浏览器信息
function getDeviceInfo() {
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;

  return {
    // 设备信息
    device: {
      // 操作系统类型
      os: platform,
      // 设备类型
      type: /Mobile|Tablet|Android|iOS/.test(ua) ? "mobile" : "desktop",
      // 设备型号
      model: (() => {
        if (/iPhone/.test(ua)) return "iPhone";
        if (/iPad/.test(ua)) return "iPad";
        if (/Android/.test(ua)) {
          const matches = ua.match(/Android\s([0-9.]+)/);
          return `Android ${matches ? matches[1] : ""}`;
        }
        return "unknown";
      })(),
      // 屏幕信息
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
      },
    },

    // 浏览器信息
    browser: {
      // 完整UA
      ua,
      // 浏览器名称和版本
      name: (() => {
        const browsers = {
          Chrome: /Chrome\/(\d+)/,
          Firefox: /Firefox\/(\d+)/,
          Safari: /Safari\/(\d+)/,
          Edge: /Edg\/(\d+)/,
          IE: /MSIE|Trident.*rv:(\d+)/,
        };
        for (const [name, regex] of Object.entries(browsers)) {
          const matches = ua.match(regex);
          if (matches) return `${name} ${matches[1]}`;
        }
        return "unknown";
      })(),
      // 浏览器语言
      language: navigator.language,
      // 浏览器内核
      engine: (() => {
        if (/WebKit/.test(ua)) return "WebKit";
        if (/Gecko/.test(ua)) return "Gecko";
        if (/Trident/.test(ua)) return "Trident";
        return "unknown";
      })(),
      // 是否支持触摸
      touch: "ontouchstart" in window,
    },

    // 网络信息
    network: {
      // 网络类型
      type: connection?.effectiveType || "unknown",
      // 网络是否在线
      online: navigator.onLine,
      // 网络速度
      downlink: connection?.downlink,
      // 往返时延
      rtt: connection?.rtt,
      // 网络是否节流
      saveData: connection?.saveData || false,
    },
  };
}

// 获取页面信息
function getPageInfo() {
  return {
    // 页面URL（去除敏感参数）
    url: window.location.href.split("?")[0],
    // 页面标题
    title: document.title,
    // 页面来源
    referrer: document.referrer,
    // 页面类型（单页应用/多页应用）
    type: window.history?.pushState ? "SPA" : "MPA",
    // 页面可见性
    visibility: document.visibilityState,
    // 页面编码
    charset: document.characterSet,
    // 视口信息
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    },
  };
}

// 收集关键性能指标
function getWebVitals() {
  console.log("Starting getWebVitals collection...");
  return new Promise((resolve) => {
    const metrics = {
      FP: {
        value: "0.000ms",
        rating: "unknown",
        _name: "首次绘制",
      },
      FCP: {
        value: "0.000ms",
        rating: "unknown",
        _name: "首次内容绘制",
      },
      FMP: {
        value: "0.000ms",
        rating: "unknown",
        _name: "首次有意义绘制",
      },
      LCP: {
        value: "0.000ms",
        rating: "unknown",
        _name: "最大内容绘制",
      },
      FIT: {
        value: "0.000ms",
        rating: "unknown",
        _name: "首次输入时间",
      },
      DCL: {
        value: "0.000ms",
        rating: "unknown",
        _name: "DOM内容加载完成",
      },
      L: {
        value: "0.000ms",
        rating: "unknown",
        _name: "页面完全加载",
      },
      TTI: {
        value: "0.000ms",
        rating: "unknown",
        _name: "可交互时间",
      },
      FID: {
        value: "0.000ms",
        rating: "unknown",
        _name: "首次输入延迟",
      },
    };

    console.log("Initial metrics state:", metrics);

    let resolveTimer = null;
    let metricsCollected = {
      paint: false,
      lcp: false,
      fid: false,
      fit: false,
      fmp: false,
      load: false,
      dcl: false,
    };

    // 修改 resolve 之前的打印，方便调试
    const resolveWithLog = () => {
      console.log(
        "Final Performance Metrics:",
        JSON.stringify(metrics, null, 2)
      );
      console.log("Metrics collection status:", metricsCollected);
      resolve(metrics);
    };

    // 检查是否所有指标都已收集
    const checkAllMetricsCollected = () => {
      console.log("Checking metrics collection status:", metricsCollected);
      if (Object.values(metricsCollected).every(Boolean)) {
        console.log("All metrics collected, resolving...");
        clearTimeout(resolveTimer);
        resolveWithLog();
      }
    };

    // 使用Performance Observer监听绘制指标
    try {
      console.log("Attempting to observe paint metrics...");
      if (PerformanceObserver.supportedEntryTypes?.includes("paint")) {
        console.log("Paint metrics are supported");
        const paintObserver = new PerformanceObserver((entryList) => {
          console.log("Paint metrics observed");
          const entries = entryList.getEntries();
          console.log("Paint entries:", entries);
          entries.forEach((entry) => {
            const time = entry.startTime;
            console.log(
              `Processing paint metric: ${entry.name}, time: ${time}`
            );
            switch (entry.name) {
              case "first-paint":
                metrics.FP.value = formatTimeToMS(time);
                metrics.FP.rating = getFPRating(time);
                console.log("Updated FP:", metrics.FP);
                break;
              case "first-contentful-paint":
                metrics.FCP.value = formatTimeToMS(time);
                metrics.FCP.rating = getFCPRating(time);
                console.log("Updated FCP:", metrics.FCP);
                break;
            }
          });
          metricsCollected.paint = true;
          checkAllMetricsCollected();
        });
        paintObserver.observe({ entryTypes: ["paint"] });
      } else {
        console.log("Paint metrics not supported");
        metricsCollected.paint = true;
      }
    } catch (e) {
      console.warn("Paint metrics collection failed:", e);
      metricsCollected.paint = true;
    }

    // 监听最大内容绘制
    try {
      console.log("Attempting to observe LCP...");
      if (
        PerformanceObserver.supportedEntryTypes?.includes(
          "largest-contentful-paint"
        )
      ) {
        console.log("LCP is supported");
        const lcpObserver = new PerformanceObserver((entryList) => {
          console.log("LCP observed");
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            const time = lastEntry.startTime;
            metrics.LCP.value = formatTimeToMS(time);
            metrics.LCP.rating = getLCPRating(time);
            console.log("Updated LCP:", metrics.LCP);
          }
          metricsCollected.lcp = true;
          checkAllMetricsCollected();
        });
        lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      } else {
        console.log("LCP not supported");
        metricsCollected.lcp = true;
      }
    } catch (e) {
      console.warn("LCP collection failed:", e);
      metricsCollected.lcp = true;
    }

    // 监听首次输入延迟
    try {
      console.log("Attempting to observe FID...");
      if (PerformanceObserver.supportedEntryTypes?.includes("first-input")) {
        console.log("FID is supported");
        const fidObserver = new PerformanceObserver((entryList) => {
          console.log("FID observed");
          const firstInput = entryList.getEntries()[0];
          if (firstInput) {
            const delay = firstInput.processingStart - firstInput.startTime;
            metrics.FID.value = formatTimeToMS(delay);
            metrics.FID.rating = getFIDRating(delay);
            console.log("Updated FID:", metrics.FID);
          }
          metricsCollected.fid = true;
          checkAllMetricsCollected();
        });
        fidObserver.observe({ entryTypes: ["first-input"] });

        // 如果5秒内没有用户交互，也标记为已收集
        setTimeout(() => {
          if (!metricsCollected.fid) {
            console.log("FID timeout reached");
            metricsCollected.fid = true;
            checkAllMetricsCollected();
          }
        }, 5000);
      } else {
        console.log("FID not supported");
        metricsCollected.fid = true;
      }
    } catch (e) {
      console.warn("FID collection failed:", e);
      metricsCollected.fid = true;
    }

    // 监听首次输入时间 (FIT)
    try {
      console.log("Attempting to observe First Input Timing...");
      if (PerformanceObserver.supportedEntryTypes?.includes("first-input")) {
        console.log("First Input Timing is supported");
        const fitObserver = new PerformanceObserver((entryList) => {
          console.log("First Input Timing observed");
          const firstInput = entryList.getEntries()[0];
          if (firstInput) {
            const startTime = firstInput.startTime;
            metrics.FIT.value = formatTimeToMS(startTime);
            metrics.FIT.rating = getFITRating(startTime);
            console.log("Updated FIT:", metrics.FIT);
          }
          metricsCollected.fit = true;
          checkAllMetricsCollected();
        });
        fitObserver.observe({ entryTypes: ["first-input"] });

        // 5秒后如果还没有输入，也标记为已收集
        setTimeout(() => {
          if (!metricsCollected.fit) {
            console.log("FIT timeout reached");
            metricsCollected.fit = true;
            checkAllMetricsCollected();
          }
        }, 5000);
      } else {
        console.log("First Input Timing not supported");
        metricsCollected.fit = true;
      }
    } catch (e) {
      console.warn("First Input Timing collection failed:", e);
      metricsCollected.fit = true;
    }

    // 监听首次有意义绘制 (FMP)
    const observeFMP = () => {
      console.log("Calculating First Meaningful Paint...");
      // 使用 MutationObserver 监听 DOM 变化
      let significantElements = 0;
      let lastSignificantChange = performance.now();

      const mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            // 检查新增的节点是否是有意义的内容
            mutation.addedNodes.forEach((node) => {
              if (isSignificantNode(node)) {
                significantElements++;
                lastSignificantChange = performance.now();
              }
            });
          }
        });

        // 如果有足够的有意义元素且DOM变化频率降低，认为FMP完成
        if (
          significantElements >= 2 &&
          performance.now() - lastSignificantChange > 1000
        ) {
          metrics.FMP.value = formatTimeToMS(lastSignificantChange);
          metrics.FMP.rating = getFMPRating(lastSignificantChange);
          console.log("Updated FMP:", metrics.FMP);
          mutationObserver.disconnect();
          metricsCollected.fmp = true;
          checkAllMetricsCollected();
        }
      });

      // 开始观察DOM变化
      mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      // 10秒后如果还没有确定FMP，使用当前时间
      setTimeout(() => {
        if (!metricsCollected.fmp) {
          console.log("FMP timeout reached");
          metrics.FMP.value = formatTimeToMS(performance.now());
          metrics.FMP.rating = getFMPRating(performance.now());
          mutationObserver.disconnect();
          metricsCollected.fmp = true;
          checkAllMetricsCollected();
        }
      }, 10000);
    };

    // 等待DOM准备好后开始观察FMP
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", observeFMP);
    } else {
      observeFMP();
    }

    // 计算 TTI (使用 domInteractive 作为简化版的 TTI)
    const calculateTTI = () => {
      console.log("Calculating TTI...");
      if (
        performance.timing.domInteractive &&
        performance.timing.navigationStart
      ) {
        const tti =
          performance.timing.domInteractive -
          performance.timing.navigationStart;
        metrics.TTI.value = formatTimeToMS(tti);
        metrics.TTI.rating = getTTIRating(tti);
        console.log("Updated TTI:", metrics.TTI);
      }
    };

    // 使用 DOMContentLoaded 事件获取 DCL
    const handleDCL = () => {
      console.log("Handling DCL...");
      const timing = performance.timing;
      if (timing.domContentLoadedEventEnd && timing.navigationStart) {
        const dcl = timing.domContentLoadedEventEnd - timing.navigationStart;
        metrics.DCL.value = formatTimeToMS(dcl);
        metrics.DCL.rating = getDCLRating(dcl);
        console.log("Updated DCL:", metrics.DCL);
      }
      metricsCollected.dcl = true;
      calculateTTI();
      checkAllMetricsCollected();
    };

    console.log("Current readyState:", document.readyState);
    if (document.readyState === "loading") {
      console.log("Document still loading, adding DCL listener");
      document.addEventListener("DOMContentLoaded", handleDCL);
    } else {
      console.log("Document already loaded, handling DCL immediately");
      handleDCL();
    }

    // 使用 load 事件获取 L
    const handleLoad = () => {
      console.log("Handling Load...");
      const timing = performance.timing;
      if (timing.loadEventEnd && timing.navigationStart) {
        const load = timing.loadEventEnd - timing.navigationStart;
        metrics.L.value = formatTimeToMS(load);
        metrics.L.rating = getLRating(load);
        console.log("Updated L:", metrics.L);
      }
      metricsCollected.load = true;
      checkAllMetricsCollected();
    };

    if (document.readyState === "complete") {
      console.log("Document already complete, handling Load immediately");
      handleLoad();
    } else {
      console.log("Document not complete, adding Load listener");
      window.addEventListener("load", handleLoad);
    }

    // 设置最大等待时间
    resolveTimer = setTimeout(() => {
      console.warn("Collection timeout reached after 10s");
      console.log("Final collection status:", metricsCollected);
      resolveWithLog();
    }, 10000);
  });
}

// 判断节点是否是有意义的内容
function isSignificantNode(node) {
  // 如果是元素节点
  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node;
    const tagName = element.tagName.toLowerCase();

    // 忽略一些通用的非内容元素
    const ignoredTags = ["script", "style", "meta", "link", "br", "hr"];
    if (ignoredTags.includes(tagName)) {
      return false;
    }

    // 检查元素是否可见
    const style = window.getComputedStyle(element);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }

    // 检查元素大小
    const rect = element.getBoundingClientRect();
    if (rect.width < 10 || rect.height < 10) {
      return false;
    }

    // 检查是否包含文本内容
    const hasText = element.textContent.trim().length > 0;

    // 检查是否是图片或视频
    const isMedia = tagName === "img" || tagName === "video";

    // 检查是否有背景图片
    const hasBgImage = style.backgroundImage !== "none";

    return hasText || isMedia || hasBgImage;
  }

  // 如果是文本节点，检查是否有实际内容
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent.trim().length > 0;
  }

  return false;
}

// 获取性能指标的时间
function getTiming() {
  console.log("Getting performance timing...");
  const timing = performance.timing;
  const navigationStart = timing.navigationStart;

  // 确保所有时间都已经可用
  if (timing.loadEventEnd === 0) {
    console.log("Page not fully loaded yet");
    return null; // 页面未完全加载，返回null
  }

  const result = {
    total: {
      value: formatTimeToMS(timing.loadEventEnd - navigationStart),
      _name: "页面完整加载耗时",
    },
    navigation: {
      value: formatTimeToMS(timing.loadEventEnd - navigationStart),
      _name: "导航耗时",
    },
    dns: {
      value: formatTimeToMS(timing.domainLookupEnd - timing.domainLookupStart),
      _name: "DNS查询耗时",
    },
    tcp: {
      value: formatTimeToMS(timing.connectEnd - timing.connectStart),
      _name: "TCP连接耗时",
    },
    request: {
      value: formatTimeToMS(timing.responseEnd - timing.requestStart),
      _name: "请求和响应耗时",
    },
    response: {
      value: formatTimeToMS(timing.responseEnd - timing.responseStart),
      _name: "内容传输耗时",
    },
    dom: {
      value: formatTimeToMS(timing.domComplete - timing.domLoading),
      _name: "DOM解析耗时",
    },
    resource: {
      value: formatTimeToMS(
        timing.loadEventStart - timing.domContentLoadedEventEnd
      ),
      _name: "资源加载耗时",
    },
    domReady: {
      value: formatTimeToMS(timing.domContentLoadedEventEnd - navigationStart),
      _name: "DOM准备就绪耗时",
    },
    ssl: {
      value: formatTimeToMS(timing.connectEnd - timing.secureConnectionStart),
      _name: "SSL安全连接耗时",
    },
    ttfb: {
      value: formatTimeToMS(timing.responseStart - navigationStart),
      _name: "首字节时间",
    },
    load: {
      value: formatTimeToMS(timing.loadEventEnd - navigationStart),
      _name: "页面onload耗时",
    },
  };

  console.log("Performance Timing Results:", JSON.stringify(result, null, 2));
  return result;
}

// 评级函数
function getFPRating(time) {
  if (time <= 1000) return "good";
  if (time <= 2000) return "needs-improvement";
  return "poor";
}

function getFCPRating(time) {
  if (time <= 1800) return "good";
  if (time <= 3000) return "needs-improvement";
  return "poor";
}

function getLCPRating(time) {
  if (time <= 2500) return "good";
  if (time <= 4000) return "needs-improvement";
  return "poor";
}

function getFIDRating(time) {
  if (time <= 100) return "good";
  if (time <= 300) return "needs-improvement";
  return "poor";
}

function getDCLRating(time) {
  if (time <= 2000) return "good";
  if (time <= 4000) return "needs-improvement";
  return "poor";
}

function getLRating(time) {
  if (time <= 3000) return "good";
  if (time <= 6000) return "needs-improvement";
  return "poor";
}

function getTTIRating(time) {
  if (time <= 3800) return "good";
  if (time <= 7300) return "needs-improvement";
  return "poor";
}

function getFITRating(time) {
  if (time <= 100) return "good";
  if (time <= 300) return "needs-improvement";
  return "poor";
}

function getFMPRating(time) {
  if (time <= 2000) return "good";
  if (time <= 4000) return "needs-improvement";
  return "poor";
}

// 计算性能指标评分
function calculatePerformanceScore(metrics) {
  // 权重配置
  const weights = {
    FCP: 0.2,
    LCP: 0.25,
    FID: 0.3,
    CLS: 0.25,
  };

  let totalScore = 0;
  let totalWeight = 0;

  // 计算每个指标的得分
  Object.entries(metrics).forEach(([metric, data]) => {
    if (weights[metric] && data.rating) {
      const score =
        data.rating === "good"
          ? 1
          : data.rating === "needs-improvement"
          ? 0.5
          : 0;
      totalScore += score * weights[metric];
      totalWeight += weights[metric];
    }
  });

  // 返回百分比得分
  return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
}

async function collectPerformanceMetrics() {
  const timing = performance.timing;
  const deviceInfo = getDeviceInfo();
  const pageInfo = getPageInfo();
  const webVitals = await getWebVitals();

  // 详细的性能指标
  const detailedMetrics = {
    // 总体时间
    total: {
      // 页面完全加载时间
      loadTime: calculateTimeDiff(timing.loadEventEnd, timing.navigationStart)
        .value,
      // DOM Ready时间
      domReadyTime: calculateTimeDiff(
        timing.domContentLoadedEventEnd,
        timing.navigationStart
      ).value,
      // 首屏时间
      firstScreenTime: calculateTimeDiff(
        timing.domInteractive,
        timing.navigationStart
      ).value,
    },

    // 导航阶段
    navigation: {
      // 重定向次数
      redirectCount: performance.navigation.redirectCount,
      // 重定向耗时
      ...calculateTimeDiff(timing.redirectEnd, timing.redirectStart),
    },

    // DNS解析
    dns: {
      // DNS查询耗时
      ...calculateTimeDiff(timing.domainLookupEnd, timing.domainLookupStart),
    },

    // TCP连接
    tcp: {
      // TCP连接耗时
      ...calculateTimeDiff(timing.connectEnd, timing.connectStart),
      // SSL安全连接耗时
      ...(timing.secureConnectionStart
        ? {
            secureConnectionTime: calculateTimeDiff(
              timing.connectEnd,
              timing.secureConnectionStart
            ).value,
          }
        : {
            secureConnectionTime: "0.000ms",
            reason: "No HTTPS connection",
          }),
    },

    // 请求响应
    request: {
      // 请求耗时
      ...calculateTimeDiff(timing.responseStart, timing.requestStart),
      // 响应耗时
      ...calculateTimeDiff(timing.responseEnd, timing.responseStart),
      // 内容传输耗时
      transferTime: calculateTimeDiff(timing.responseEnd, timing.responseStart)
        .value,
    },

    // 处理阶段
    processing: {
      // DOM解析耗时
      ...calculateTimeDiff(timing.domInteractive, timing.responseEnd),
      // DOM完成时间
      ...calculateTimeDiff(timing.domComplete, timing.domLoading),
      // 资源加载耗时
      ...calculateTimeDiff(
        timing.loadEventStart,
        timing.domContentLoadedEventEnd
      ),
    },

    // 关键时间点
    timeStamps: {
      // 开始导航的时间
      navigationStart: formatTimestamp(timing.navigationStart),
      // 开始重定向的时间
      redirectStart: formatTimestamp(timing.redirectStart),
      // 重定向完成的时间
      redirectEnd: formatTimestamp(timing.redirectEnd),
      // 开始DNS查询的时间
      fetchStart: formatTimestamp(timing.fetchStart),
      // DNS查询开始的时间
      domainLookupStart: formatTimestamp(timing.domainLookupStart),
      // DNS查询完成的时间
      domainLookupEnd: formatTimestamp(timing.domainLookupEnd),
      // 开始建立TCP连接的时间
      connectStart: formatTimestamp(timing.connectStart),
      // SSL连接开始的时间
      secureConnectionStart: timing.secureConnectionStart
        ? formatTimestamp(timing.secureConnectionStart)
        : "No HTTPS",
      // TCP连接完成的时间
      connectEnd: formatTimestamp(timing.connectEnd),
      // 开始请求的时间
      requestStart: formatTimestamp(timing.requestStart),
      // 开始接收响应的时间
      responseStart: formatTimestamp(timing.responseStart),
      // 响应结束的时间
      responseEnd: formatTimestamp(timing.responseEnd),
      // DOM开始解析的时间
      domLoading: formatTimestamp(timing.domLoading),
      // DOM解析完成的时间
      domInteractive: formatTimestamp(timing.domInteractive),
      // DOMContentLoaded事件开始的时间
      domContentLoadedEventStart: formatTimestamp(
        timing.domContentLoadedEventStart
      ),
      // DOMContentLoaded事件完成的时间
      domContentLoadedEventEnd: formatTimestamp(
        timing.domContentLoadedEventEnd
      ),
      // DOM树解析完成的时间
      domComplete: formatTimestamp(timing.domComplete),
      // load事件开始的时间
      loadEventStart: formatTimestamp(timing.loadEventStart),
      // load事件完成的时间
      loadEventEnd: formatTimestamp(timing.loadEventEnd),
    },
  };

  // 收集资源加载时间
  let resources = [];
  if (window.performance.getEntriesByType) {
    resources = performance.getEntriesByType("resource").map((resource) => ({
      name: resource.name,
      type: resource.initiatorType,
      duration: resource.duration,
      size: resource.transferSize,
      protocol: resource.nextHopProtocol,
      timing: {
        redirect: calculateTimeDiff(
          resource.redirectEnd,
          resource.redirectStart
        ).value,
        dns: calculateTimeDiff(
          resource.domainLookupEnd,
          resource.domainLookupStart
        ).value,
        tcp: calculateTimeDiff(resource.connectEnd, resource.connectStart)
          .value,
        request: calculateTimeDiff(
          resource.responseStart,
          resource.requestStart
        ).value,
        response: calculateTimeDiff(
          resource.responseEnd,
          resource.responseStart
        ).value,
      },
    }));
  }

  // 创建性能日志
  const log = createPerformanceLog(
    {
      ...detailedMetrics,
      webVitals,
    },
    {
      resources,
      sampling: 1,
      version: "1.0.0",
      deviceInfo,
      pageInfo,
    }
  );

  // 发送性能数据
  tracker.send(log);

  // 检查性能问题
  const loadTimeThreshold = 5000;
  const actualLoadTime = timing.loadEventEnd - timing.navigationStart;
  if (actualLoadTime > loadTimeThreshold) {
    const error = new Error("Page load time exceeded threshold");
    const errorLog = createStabilityErrorLog(
      {
        message: `Page load time (${formatTimeToMS(
          actualLoadTime
        )}) exceeded threshold (${formatTimeToMS(loadTimeThreshold)})`,
        error,
        performance: log.performance,
      },
      {
        kind: "performance",
        errorType: ErrorTypes.performance_error,
      }
    );
    tracker.send(errorLog);
  }

  // 清除性能缓存
  if (window.performance && window.performance.clearResourceTimings) {
    performance.clearResourceTimings();
  }
}

export function initTimingMonitor() {
  // 确保浏览器支持性能API
  if (!window.performance || !window.performance.timing) {
    console.warn("Browser does not support Performance API");
    return;
  }

  // 在页面加载完成后收集性能数据
  window.addEventListener("load", () => {
    // 给一些时间让最后的性能指标计算完成
    setTimeout(collectPerformanceMetrics, 0);
  });
}

export { getWebVitals, getTiming };
