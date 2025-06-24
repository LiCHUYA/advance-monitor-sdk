import { simplifyUrl, formatTime, formatError } from "../handleErrorStack.js";
import { BEHAVIOR_TYPES } from "../../constants/index.js";

/**
 * 创建用户行为日志
 * @param {Object} event - 行为事件对象
 * @param {Object} options - 额外的行为信息
 */
export function createBehaviorLog(event, options = {}) {
  return {
    // ==================== 1. 元信息层 ====================
    meta: {
      /**
       * 监控指标大类
       * - stability: 稳定性监控（错误、崩溃等）
       * - performance: 性能监控
       * - behavior: 用户行为监控
       */
      kind: "behavior",

      /**
       * 日志类型
       * - error: 错误日志
       * - warning: 警告日志
       * - info: 信息日志
       */
      type: options.type || "info",

      /**
       * 日志记录时间戳（毫秒）
       */
      timestamp: formatTime(new Date().getTime()),
    },

    // ==================== 2. 行为信息层 ====================
    behavior: {
      // 事件基本信息
      event: {
        type: event.type,
        timestamp: event.timeStamp,
      },

      // 目标元素信息
      target: {
        tagName: event.target?.tagName?.toLowerCase(),
        className: event.target?.className,
        id: event.target?.id,
        innerText: event.target?.innerText?.slice(0, 50), // 限制文本长度
        href: event.target?.href,
        src: event.target?.src,
      },

      // 事件路径
      path: Array.from(event.path || []).map((node) => ({
        tagName: node.tagName?.toLowerCase(),
        className: node.className,
        id: node.id,
      })),

      // 交互位置
      position: {
        x: event.clientX,
        y: event.clientY,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      },

      // 额外的行为信息
      extra: options.extra || null,
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
        screen: `${window.screen.width}x${window.screen.height}`,
        window: `${window.innerWidth}x${window.innerHeight}`,
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
            ...options.context,
          },
        }
      : null,
  };
}
