import {
  initJsErrorCapture,
  initXhrErrorCapture,
  initBlankScreen,
  initTimingMonitor,
  initUvPv,
  initBehaviorMonitor,
} from "./monitor";

import { uploadSourceMap, createErrorReport } from "./monitor/lib/sourcemap.js";
import tracker from "./monitor/utils/traker.js";

class AdvanceMonitor {
  constructor() {
    this.initialized = false;
    this.config = {
      // 基础配置
      url: "http://localhost:8080/api/v1/tracker", // 上报接口地址
      appId: "", // 应用标识
      userId: "", // 用户标识
      version: "", // 应用版本号

      // sourcemap配置
      sourcemapUploadUrl: "", // sourcemap上传地址（仅在发布时使用）

      // 功能开关
      enableBehavior: true,
      enableUvPv: true,
      enableJsError: true,
      enableXhrError: true,
      enableBlankScreen: true,
      enablePerformance: true,
    };

    this.loadConfigFromStorage();
  }

  /**
   * 上传sourcemap（仅在发布流程中使用）
   */
  async uploadSourceMap(sourceMap, options = {}) {
    const uploadOptions = {
      version: this.config.version,
      uploadUrl: this.config.sourcemapUploadUrl,
      ...options,
      sourceMap,
      metadata: {
        appId: this.config.appId,
        timestamp: Date.now(),
        ...options.metadata,
      },
    };

    if (!uploadOptions.version || !uploadOptions.uploadUrl) {
      throw new Error("请提供版本号和上传地址");
    }

    try {
      return await uploadSourceMap(uploadOptions);
    } catch (error) {
      console.error("[AdvanceMonitor] 上传sourcemap失败:", error);
      throw error;
    }
  }

  /**
   * 从本地存储加载配置
   */
  loadConfigFromStorage() {
    try {
      const savedConfig = localStorage.getItem("_monitor_config");
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        this.config = {
          ...this.config,
          ...parsedConfig,
        };
      }
    } catch (error) {
      console.error("[AdvanceMonitor] 加载本地配置失败:", error);
    }
  }

  /**
   * 保存配置到本地存储
   */
  saveConfigToStorage() {
    try {
      localStorage.setItem("_monitor_config", JSON.stringify(this.config));
    } catch (error) {
      console.error("[AdvanceMonitor] 保存配置失败:", error);
    }
  }

  /**
   * 初始化监控SDK
   * @param {Object} config - 配置项
   */
  init(config = {}) {
    if (this.initialized) {
      console.warn("[AdvanceMonitor] SDK已经初始化过了");
      return;
    }

    this.config = {
      ...this.config,
      ...config,
    };

    if (!this.config.url || !this.config.appId) {
      throw new Error("[AdvanceMonitor] 缺少必要配置");
    }

    this.saveConfigToStorage();
    tracker.url = this.config.url;

    try {
      // 初始化各个模块
      if (this.config.enableBehavior) {
        initBehaviorTracker();
      }

      if (this.config.enableUvPv) {
        initUvPv();
      }

      if (this.config.enableJsError) {
        initJsErrorCapture({
          beforeSend: (error) => {
            // 创建包含压缩位置的错误报告
            return createErrorReport(error, {
              appId: this.config.appId,
              userId: this.config.userId,
              version: this.config.version,
              // 其他上下文信息...
            });
          },
        });
      }

      if (this.config.enableXhrError) {
        initXhrErrorCapture({
          beforeSend: (event) => {
            event.appId = this.config.appId;
            event.userId = this.config.userId;
            return event;
          },
        });
      }

      if (this.config.enableBlankScreen) {
        initBlankScreen();
      }

      if (this.config.enablePerformance) {
        initTimingMonitor({
          beforeSend: (metrics) => {
            metrics.appId = this.config.appId;
            event.userId = this.config.userId;
            return metrics;
          },
        });
      }

      // 标记为已初始化
      this.initialized = true;

      // 发送初始化成功事件
      tracker.send({
        kind: "lifecycle",
        type: "init",
        config: this.config,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: location.href,
        appId: this.config.appId,
        userId: this.config.userId,
      });
    } catch (error) {
      console.error("[AdvanceMonitor] 初始化失败:", error);
      tracker.send({
        kind: "lifecycle",
        type: "init_error",
        error: createErrorReport(error),
        config: this.config,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 设置用户信息
   * @param {Object} userInfo - 用户信息
   */
  setUser(userInfo) {
    this.config.userId = userInfo.userId;
    tracker.send({
      kind: "user",
      type: "identify",
      userId: userInfo.userId,
      userInfo,
      timestamp: Date.now(),
      appId: this.config.appId,
    });
  }

  /**
   * 手动上报事件
   * @param {string} eventName - 事件名称
   * @param {Object} eventData - 事件数据
   */
  track(eventName, eventData = {}) {
    if (!this.initialized) {
      console.warn("[AdvanceMonitor] 请先初始化SDK");
      return;
    }

    tracker.send({
      kind: "custom",
      type: eventName,
      data: eventData,
      userId: this.config.userId,
      appId: this.config.appId,
      timestamp: Date.now(),
      url: location.href,
      title: document.title,
    });
  }

  /**
   * 手动上报错误
   * @param {Error|string} error - 错误对象或错误信息
   * @param {Object} extra - 额外信息
   */
  error(error, extra = {}) {
    if (!this.initialized) {
      console.warn("[AdvanceMonitor] 请先初始化SDK");
      return;
    }

    const errorEvent = {
      kind: "error",
      type: "manual",
      error:
        error instanceof Error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : {
              message: String(error),
            },
      extra,
      userId: this.config.userId,
      appId: this.config.appId,
      timestamp: Date.now(),
      url: location.href,
      title: document.title,
    };

    tracker.send(errorEvent);
  }

  /**
   * 获取当前配置
   * @returns {Object} 当前配置
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * 更新配置
   * @param {Object} config - 新配置
   */
  updateConfig(config) {
    Object.assign(this.config, config);
    tracker.send({
      kind: "lifecycle",
      type: "config_update",
      config: this.config,
      timestamp: Date.now(),
      appId: this.config.appId,
      userId: this.config.userId,
    });
  }

  /**
   * 销毁实例，清理资源
   */
  destroy() {
    if (!this.initialized) {
      return;
    }

    // 发送销毁事件
    tracker.send({
      kind: "lifecycle",
      type: "destroy",
      timestamp: Date.now(),
      appId: this.config.appId,
      userId: this.config.userId,
    });

    // 重置状态
    this.initialized = false;
    this.config = null;
  }
}

// 导出单例
export default new AdvanceMonitor();
