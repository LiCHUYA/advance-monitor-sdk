import {
  initJsErrorCapture,
  initXhrErrorCapture,
  initBlankScreen,
  initTimingMonitor,
  initUvPv,
  initBehaviorMonitor,
} from "./monitor";

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
      sourcemapUploadUrl: "", // sourcemap上传地址
      sourcemapInfo: null, // sourcemap信息，包含 {hash, id, url}

      // 功能开关
      enableBehavior: true, // 是否开启行为监控
      enableUvPv: true, // 是否开启UV/PV统计
      enableJsError: true, // 是否开启JS错误监控
      enableXhrError: true, // 是否开启接口错误监控
      enableBlankScreen: true, // 是否开启白屏监控
      enablePerformance: true, // 是否开启性能监控
    };

    // 尝试从本地存储加载配置
    this.loadConfigFromStorage();
  }

  /**
   * 上传sourcemap
   * @param {Object|string|File} sourceMap - sourcemap内容（JSON字符串或对象）或File对象
   * @param {Object} [options] - 上传选项
   * @param {string} [options.version] - 应用版本号，如果不提供则使用当前配置的版本号
   * @param {string} [options.uploadUrl] - 上传地址，如果不提供则使用当前配置的地址
   * @returns {Promise<Object>} - 上传结果
   */
  async uploadSourceMap(sourceMap, options = {}) {
    // 使用配置中的值作为默认值
    const uploadOptions = {
      version: this.config.version,
      uploadUrl: this.config.sourcemapUploadUrl,
      ...options,
      sourceMap, // 确保sourceMap参数被正确传递
    };

    // 验证必要的配置
    if (!uploadOptions.version) {
      throw new Error(
        "[AdvanceMonitor] 请提供应用版本号，可以在init时配置或在上传时提供"
      );
    }
    if (!uploadOptions.uploadUrl) {
      throw new Error(
        "[AdvanceMonitor] 请提供sourcemap上传地址，可以在init时配置或在上传时提供"
      );
    }

    try {
      const result = await uploadSourceMap(uploadOptions);

      // 保存sourcemap信息
      this.config.sourcemapInfo = result;
      this.saveConfigToStorage();

      return result;
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

    // 合并配置
    this.config = {
      ...this.config,
      ...config,
    };

    // 验证必要的配置
    if (!this.config.url) {
      throw new Error("[AdvanceMonitor] 缺少上报接口地址(url)配置");
    }
    if (!this.config.appId) {
      throw new Error("[AdvanceMonitor] 缺少应用标识(appId)配置");
    }
    if (this.config.enableJsError && !this.config.sourcemapInfo?.url) {
      console.warn(
        "[AdvanceMonitor] 已开启JS错误监控，但未上传sourcemap，将无法进行源码映射"
      );
    }

    // 保存配置到本地存储
    this.saveConfigToStorage();

    // 配置上报接口
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
          sourceMapInfo: this.config.sourcemapInfo,
          beforeSend: (event) => {
            event.appId = this.config.appId;
            event.userId = this.config.userId;
            return event;
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

      // 发送初始化失败事件
      tracker.send({
        kind: "lifecycle",
        type: "init_error",
        error: {
          message: error.message,
          stack: error.stack,
        },
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
