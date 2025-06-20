import { createStabilityErrorLog } from "../utils/LogFunc/createStabilityErrorLog.js";
import { ErrorTypes } from "../constants/index.js";
import tracker from "../utils/traker.js";

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

function collectPerformanceMetrics() {
  const timing = performance.timing;
  const metrics = {
    // 总体时间
    total: {
      // 页面完全加载时间
      loadTime: timing.loadEventEnd - timing.navigationStart,
      // DOM Ready时间
      domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      // 首屏时间
      firstScreenTime: timing.domInteractive - timing.navigationStart,
    },

    // 导航阶段
    navigation: {
      // 重定向次数
      redirectCount: performance.navigation.redirectCount,
      // 重定向耗时
      redirectTime: timing.redirectEnd - timing.redirectStart,
    },

    // DNS解析
    dns: {
      // DNS查询耗时
      lookupTime: timing.domainLookupEnd - timing.domainLookupStart,
    },

    // TCP连接
    tcp: {
      // TCP连接耗时
      connectTime: timing.connectEnd - timing.connectStart,
      // SSL安全连接耗时
      secureConnectionTime: timing.secureConnectionStart
        ? timing.connectEnd - timing.secureConnectionStart
        : 0,
    },

    // 请求响应
    request: {
      // 请求耗时
      requestTime: timing.responseStart - timing.requestStart,
      // 响应耗时
      responseTime: timing.responseEnd - timing.responseStart,
      // 内容传输耗时
      transferTime: timing.responseEnd - timing.responseStart,
    },

    // 处理阶段
    processing: {
      // DOM解析耗时
      domParsingTime: timing.domInteractive - timing.responseEnd,
      // DOM完成时间
      domCompleteTime: timing.domComplete - timing.domLoading,
      // 资源加载耗时
      resourceLoadTime: timing.loadEventStart - timing.domContentLoadedEventEnd,
    },

    // 关键时间点
    timeStamps: {
      // 开始导航的时间
      navigationStart: timing.navigationStart,
      // 开始重定向的时间
      redirectStart: timing.redirectStart,
      // 重定向完成的时间
      redirectEnd: timing.redirectEnd,
      // 开始DNS查询的时间
      fetchStart: timing.fetchStart,
      // DNS查询开始的时间
      domainLookupStart: timing.domainLookupStart,
      // DNS查询完成的时间
      domainLookupEnd: timing.domainLookupEnd,
      // 开始建立TCP连接的时间
      connectStart: timing.connectStart,
      // SSL连接开始的时间
      secureConnectionStart: timing.secureConnectionStart,
      // TCP连接完成的时间
      connectEnd: timing.connectEnd,
      // 开始请求的时间
      requestStart: timing.requestStart,
      // 开始接收响应的时间
      responseStart: timing.responseStart,
      // 响应结束的时间
      responseEnd: timing.responseEnd,
      // DOM开始解析的时间
      domLoading: timing.domLoading,
      // DOM解析完成的时间
      domInteractive: timing.domInteractive,
      // DOMContentLoaded事件开始的时间
      domContentLoadedEventStart: timing.domContentLoadedEventStart,
      // DOMContentLoaded事件完成的时间
      domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
      // DOM树解析完成的时间
      domComplete: timing.domComplete,
      // load事件开始的时间
      loadEventStart: timing.loadEventStart,
      // load事件完成的时间
      loadEventEnd: timing.loadEventEnd,
    },
  };

  // 添加首屏绘制时间 (如果支持)
  if (window.performance.getEntriesByType) {
    const paintMetrics = performance.getEntriesByType("paint");
    if (paintMetrics) {
      metrics.paint = {};
      paintMetrics.forEach((entry) => {
        metrics.paint[entry.name] = entry.startTime;
      });
    }
  }

  // 收集资源加载时间
  if (window.performance.getEntriesByType) {
    const resourceMetrics = performance.getEntriesByType("resource");
    if (resourceMetrics) {
      metrics.resources = resourceMetrics.map((resource) => ({
        name: resource.name,
        type: resource.initiatorType,
        duration: resource.duration,
        size: resource.transferSize,
        protocol: resource.nextHopProtocol,
        timing: {
          redirect: resource.redirectEnd - resource.redirectStart,
          dns: resource.domainLookupEnd - resource.domainLookupStart,
          tcp: resource.connectEnd - resource.connectStart,
          request: resource.responseStart - resource.requestStart,
          response: resource.responseEnd - resource.responseStart,
        },
      }));
    }
  }

  // 发送性能数据
  tracker.send({
    kind: "performance",
    type: "timing",
    metrics,
  });

  // 如果加载时间过长，创建性能警告日志
  const loadTimeThreshold = 5000; // 5秒
  if (metrics.total.loadTime > loadTimeThreshold) {
    const error = new Error("Page load time exceeded threshold");
    const errorLog = createStabilityErrorLog(
      {
        message: `Page load time (${metrics.total.loadTime}ms) exceeded threshold (${loadTimeThreshold}ms)`,
        error,
        performance: metrics,
      },
      ErrorTypes.performance_error
    );
    tracker.send(errorLog);
  }

  // 清除性能缓存
  if (window.performance && window.performance.clearResourceTimings) {
    performance.clearResourceTimings();
  }
}

// 获取首屏时间的辅助函数
function getFirstScreenTime() {
  return new Promise((resolve) => {
    if (document.readyState === "complete") {
      resolve(
        performance.timing.domInteractive - performance.timing.navigationStart
      );
    } else {
      window.addEventListener("load", () => {
        resolve(
          performance.timing.domInteractive - performance.timing.navigationStart
        );
      });
    }
  });
}
