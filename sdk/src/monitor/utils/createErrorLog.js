import { ErrorTypes, ErrorLevels } from "../constant/index.js";
import { formatError, simplifyUrl, formatTime } from "./handleErrorStack.js";
import { getLastEvent, getLastEventPath } from "./getEvents.js";

export function createErrorLog(event) {
  const lastEvent = getLastEvent();
  return {
    // ==================== 1. 元信息层 ====================
    meta: {
      /**
       * 监控指标大类
       * - stability: 稳定性监控（错误、崩溃等）
       * - performance: 性能监控
       * - behavior: 用户行为监控
       */
      kind: "stability",

      /**
       * 日志类型
       * - error: 错误日志
       * - warning: 警告日志
       * - info: 信息日志
       */
      type: ErrorLevels.error,

      /**
       * 错误类型细分
       * - jsError: JS执行错误
       * - promiseError: Promise未捕获错误
       * - resourceError: 资源加载错误
       */
      errorType: ErrorTypes.js_error,

      /**
       * 日志记录时间戳（毫秒）
       * 使用服务器时间避免客户端时间不准
       */
      timestamp: formatTime(new Date().getTime()),
    },

    // ==================== 2. 错误详情层 ====================
    error: {
      /**
       * 错误信息原文
       * 示例：Uncaught TypeError: Cannot read property 'xxx' of null
       */
      name: event.error?.name || "Error",
      message: event.message,
      formattedError: formatError(event.error),

      // 错误位置详细信息
      location: {
        /**
         * 发生错误的JS文件URL
         * 如果是内联脚本则为空
         */
        file: event.filename,

        /**
         * 错误行号（基于1开始）
         * 注意：编译后代码可能与源码行号不一致
         */
        line: event.lineno,

        /**
         * 错误列号（基于1开始）
         * 对压缩代码调试特别有用
         */
        column: event.colno,

        /**
         * 当前聚焦的DOM元素
         * 用于还原错误发生时用户操作上下文
         */
        path: getLastEventPath() || null,

        // 保存最后一个事件的类型和目标，帮助分析错误触发场景
        eventType: lastEvent?.type || null,
        eventTarget: lastEvent?.target || null,
      },
    },

    // ==================== 3. 页面环境层 ====================
    page: {
      /**
       * 当前页面完整URL
       * 包含参数和hash（需注意敏感信息过滤）
       */
      url: simplifyUrl(window.location.href),

      /**
       * 页面标题（document.title）
       * 帮助快速定位问题页面
       */
      title: document.title,

      /**
       * 页面来源（referrer）
       * 用于分析错误是否与引流渠道相关
       */
      referrer: simplifyUrl(document.referrer),

      /**
       * 页面加载耗时（毫秒）
       * navigationStart到loadEventStart的时间差
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
       * - visible: 页面可见
       * - hidden: 页面被隐藏（如切换标签页）
       */
      visibility: document.visibilityState,
    },

    // ==================== 4. 设备与浏览器层 ====================
    device: {
      /**
       * 操作系统类型
       * 示例：Win32、MacIntel、Linux x86_64
       */
      os: navigator.platform,

      /**
       * 设备类型
       * - mobile: 移动设备
       * - desktop: 桌面设备
       * 基于UA中的Mobile/Tablet关键词判断
       */
      type: /Mobile|Tablet/.test(navigator.userAgent) ? "mobile" : "desktop",

      /**
       * 设备型号（需自定义解析）
       * 示例：
       * - iPhone 13 Pro
       * - iPad Pro 11
       * - Pixel 6
       */
      model: (() => {
        const ua = navigator.userAgent;
        if (/iPhone/.test(ua)) return "iPhone";
        if (/iPad/.test(ua)) return "iPad";
        if (/Android/.test(ua)) return "Android";
        return "unknown";
      })(),
    },

    // 浏览器信息
    browser: {
      /**
       * 完整UserAgent字符串
       * 用于服务端详细分析
       */
      ua: navigator.userAgent,

      /**
       * 浏览器渲染引擎
       * - WebKit: Safari/Chrome(旧版)
       * - Gecko: Firefox
       * - Blink: Chrome/Edge/Opera
       */
      engine: navigator.userAgent.match(/(WebKit|Gecko|Blink)/)?.[0],

      /**
       * 浏览器主版本号
       * 示例：Chrome/92 -> "92"
       */
      version: navigator.userAgent.match(
        /(Chrome|Firefox|Safari|Edge)\/(\d+)/
      )?.[2],

      /**
       * 浏览器语言
       * 格式：语言-地区（如 zh-CN, en-US）
       */
      language: navigator.language,
    },

    // ==================== 5. 网络层 ====================
    network: {
      /**
       * 网络连接类型
       * - 4g: 4G网络
       * - wifi: WiFi网络
       * - 2g/3g: 低速网络
       * - unknown: 未知
       */
      type: navigator.connection?.effectiveType,

      /**
       * 网络往返时延（毫秒）
       * 反映网络延迟情况
       */
      rtt: navigator.connection?.rtt || 0,

      /**
       * 预估下行速度（Mbps）
       * 用于分析资源加载问题
       */
      downlink: navigator.connection?.downlink || 0,
    },

    // ==================== 6. 性能层 ====================
    performance: {
      /**
       * JS堆内存使用量（字节）
       * 仅Chrome支持，用于内存泄漏分析
       */
      memory: performance.memory?.usedJSHeapSize,

      // 关键性能时间点（相对于navigationStart的毫秒数）
      timing: {
        /**
         * 页面开始导航的时间戳
         * 所有性能指标的基准点
         */
        navigationStart: performance.timing?.navigationStart,

        /**
         * DOM解析完成时间
         * 反映页面DOM结构复杂度
         */
        domComplete: performance.timing?.domComplete,
      },
    },

    // ==================== 7. 业务层 ====================
    biz: window.trackConfig?.enableBizFields
      ? {
          /**
           * 当前业务模块标识
           * 示例：checkout（结算页）、product（商品页）
           */
          module: "checkout",

          /**
           * A/B测试分组
           * 用于分析不同实验组的错误率
           */
          abTest: "variant_A",

          /**
           * 用户操作链（最近3次交互）
           * 用于还原错误发生前的操作路径
           */
          actionChain: ["#btn-checkout", "#cart-icon"],

          /**
           * 业务自定义字段
           * 根据具体业务需求动态添加
           */
          customData: {
            // 示例：当前商品ID
            productId: "p123456",
            // 示例：用户会员等级
            vipLevel: 2,
          },
        }
      : null,
  };
}
