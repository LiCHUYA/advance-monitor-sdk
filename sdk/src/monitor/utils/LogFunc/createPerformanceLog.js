import { simplifyUrl } from "../handleErrorStack.js";
import { PERFORMANCE_RATING_RULES } from "../../constants/index.js";

export function createPerformanceLog(metrics, options = {}) {
  const { context = {} } = options;

  return {
    // ==================== 1. 元信息层 ====================
    meta: {
      /**
       * 监控指标大类
       * - stability: 稳定性监控（错误、崩溃等）
       * - performance: 性能监控
       * - behavior: 用户行为监控
       */
      kind: "performance",

      /**
       * 日志类型
       * - error: 错误日志
       * - warning: 警告日志
       * - info: 信息日志
       */
      type: "metrics",

      /**
       * 日志记录时间戳（毫秒）
       */
      timestamp: Date.now(),
    },

    // ==================== 2. 性能指标层 ====================
    performance: {
      // 核心性能指标
      core: {
        // 首次内容绘制 (FCP)
        fcp: {
          value: metrics.FCP?.value,
          rating: metrics.FCP?.rating,
        },
        // 最大内容绘制 (LCP)
        lcp: {
          value: metrics.LCP?.value,
          rating: metrics.LCP?.rating,
        },
        // 首次输入延迟 (FID)
        fid: {
          value: metrics.FID?.value,
          rating: metrics.FID?.rating,
        },
        // 累积布局偏移 (CLS)
        cls: {
          value: metrics.CLS?.value,
          rating: metrics.CLS?.rating,
        },
        // 首字节时间 (TTFB)
        ttfb: {
          value: metrics.TTFB?.value,
          rating: metrics.TTFB?.rating,
        },
      },

      // 加载性能
      load: {
        // DOM完成时间
        domReady: {
          value: metrics.domReady?.value,
          rating: metrics.domReady?.rating,
        },
        // 页面完全加载时间
        loadTime: {
          value: metrics.loadTime?.value,
          rating: metrics.loadTime?.rating,
        },
        // 首屏时间
        firstScreen: {
          value: metrics.firstScreen?.value,
          rating: metrics.firstScreen?.rating,
        },
      },

      // 资源性能
      resources: metrics.resources || [],

      // 网络性能
      network: {
        effectiveType: navigator.connection?.effectiveType || "unknown",
        rtt: navigator.connection?.rtt || 0,
        downlink: navigator.connection?.downlink || 0,
      },
    },

    // ==================== 3. 页面环境层 ====================
    page: {
      /**
       * 当前页面完整URL
       */
      url: simplifyUrl(window.location.href),

      /**
       * 页面标题
       */
      title: document.title,

      /**
       * 页面来源
       */
      referrer: simplifyUrl(document.referrer),

      /**
       * 页面加载耗时
       */
      loadTime:
        performance.timing?.loadEventStart -
        performance.timing?.navigationStart,

      // 视口信息
      viewport: {
        /**
         * 设备物理分辨率
         * 格式：宽度x高度（如 1920x1080）
         */
        screen: `${window.screen.width}x${window.screen.height}`,

        /**
         * 浏览器视窗大小
         * 包含滚动条和界面chrome的尺寸
         */
        window: `${window.innerWidth}x${window.innerHeight}`,

        /**
         * 当前滚动位置
         * 格式：X,Y（如 "0,500"）
         */
        scroll: `${window.scrollX},${window.scrollY}`,
      },

      /**
       * 页面可见性状态
       */
      visibility: document.visibilityState,
    },

    // ==================== 4. 设备层 ====================
    device: {
      /**
       * 操作系统类型
       */
      os: navigator.platform,

      /**
       * 设备类型
       */
      type: /Mobile|Tablet/.test(navigator.userAgent) ? "mobile" : "desktop",

      /**
       * 设备型号
       */
      model: (() => {
        const ua = navigator.userAgent;
        if (/iPhone/.test(ua)) return "iPhone";
        if (/iPad/.test(ua)) return "iPad";
        if (/Android/.test(ua)) return "Android";
        return "unknown";
      })(),
    },

    // ==================== 5. 浏览器层 ====================
    browser: {
      /**
       * 完整UserAgent字符串
       */
      ua: navigator.userAgent,

      /**
       * 浏览器渲染引擎
       */
      engine: navigator.userAgent.match(/(WebKit|Gecko|Blink)/)?.[0],

      /**
       * 浏览器主版本号
       */
      version: navigator.userAgent.match(
        /(Chrome|Firefox|Safari|Edge)\/(\d+)/
      )?.[2],

      /**
       * 浏览器语言
       */
      language: navigator.language,
    },

    // ==================== 6. 网络层 ====================
    network: {
      /**
       * 网络连接类型
       */
      type: navigator.connection?.effectiveType || "unknown",

      /**
       * 网络往返时延（毫秒）
       */
      rtt: navigator.connection?.rtt || 0,

      /**
       * 预估下行速度（Mbps）
       */
      downlink: navigator.connection?.downlink || 0,
    },

    // ==================== 7. 业务层 ====================
    biz: window.trackConfig?.enableBizFields
      ? {
          module: window.trackConfig?.module,
          customData: {
            ...window.trackConfig?.customData,
            ...context,
          },
        }
      : null,
  };
}
