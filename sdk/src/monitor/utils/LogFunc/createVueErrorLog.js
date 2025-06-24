import { ErrorTypes, ErrorLevels } from "../../constants/index.js";
import {
  formatError,
  simplifyUrl,
  formatTime,
  handleErrorStack,
} from "../handleErrorStack.js";
import { getLastEvent, getLastEventPath } from "../getEvents.js";

/**
 * 从Vue实例中提取组件信息
 * @param {Object} instance Vue实例
 * @param {boolean} isVue3 是否为Vue3
 * @param {boolean} [isRoot=true] 是否为根调用
 */
function extractComponentInfo(instance, isVue3, isRoot = true) {
  if (!instance) return null;

  // 获取原始对象（如果是Proxy的话）
  const raw = instance.$ || instance;

  // 基础组件信息
  const baseInfo = {
    name: isVue3
      ? raw.type?.__name ||
        raw.type?.name ||
        raw.type?.displayName ||
        "AnonymousComponent"
      : raw.$options?.name ||
        raw.$options?._componentTag ||
        "AnonymousComponent",
    file: isVue3 ? raw.type?.__file : raw.$options?.__file,
  };

  // 如果不是根调用，只返回基础信息
  if (!isRoot) {
    return {
      ...baseInfo,
      uid: raw.uid,
      isStateful: !!raw.data || !!raw.setupState,
    };
  }

  return {
    ...baseInfo,
    // 组件状态
    state: {
      props: raw.props,
      propsOptions: raw.propsOptions || [],
      propsDefaults: raw.propsDefaults || {},
      data: raw.data || {},
      setupState: raw.setupState || {},
      refs: raw.refs || {},
      attrs: raw.attrs || {},
      slots: Object.keys(raw.slots || {}),
      emits: raw.emitsOptions || [],
      exposed: raw.exposed || {},
      inheritAttrs: raw.inheritAttrs,
    },

    // 生命周期状态
    lifecycle: {
      isMounted: raw.isMounted || false,
      isUnmounted: raw.isUnmounted || false,
      isDeactivated: raw.isDeactivated || false,
      hooks: {
        beforeCreate: !!raw.bc,
        created: !!raw.c,
        beforeMount: !!raw.bm,
        mounted: !!raw.m,
        beforeUpdate: !!raw.bu,
        updated: !!raw.u,
        beforeUnmount: !!raw.bum,
        unmounted: !!raw.um,
        errorCaptured: !!raw.ec,
        activated: !!raw.a,
        deactivated: !!raw.da,
        renderTracked: !!raw.rtc,
        renderTriggered: !!raw.rtg,
        serverPrefetch: !!raw.sp,
      },
    },

    // 组件关系（避免递归）
    relation: {
      parent: raw.parent
        ? extractComponentInfo(raw.parent, isVue3, false)
        : null,
      root:
        raw.root && raw.root !== raw
          ? extractComponentInfo(raw.root, isVue3, false)
          : null,
      appId: raw.appContext?.app?.uid,
      uid: raw.uid,
      provides: Object.keys(raw.provides || {}),
      subTree: raw.subTree
        ? {
            type:
              typeof raw.subTree.type === "string"
                ? raw.subTree.type
                : raw.subTree.type?.name || "Anonymous",
            key: raw.subTree.key,
          }
        : null,
    },

    // 渲染相关
    render: {
      vnode: raw.vnode
        ? {
            type:
              typeof raw.vnode.type === "string"
                ? raw.vnode.type
                : raw.vnode.type?.name || "Anonymous",
            key: raw.vnode.key,
          }
        : null,
      renderCache: Array.isArray(raw.renderCache) ? raw.renderCache.length : 0,
      asyncResolved: raw.asyncResolved || false,
      asyncDep: !!raw.asyncDep,
      suspense: !!raw.suspense,
      suspenseId: raw.suspenseId,
    },

    // 应用上下文
    context: raw.appContext
      ? {
          components: Object.keys(raw.appContext.components || {}),
          directives: Object.keys(raw.appContext.directives || {}),
          mixins: (raw.appContext.mixins || []).length,
          provides: Object.keys(raw.appContext.provides || {}),
        }
      : null,

    // 其他重要信息
    misc: {
      hasAsyncDep: !!raw.asyncDep,
      hasSuspense: !!raw.suspense,
      hasKeepAlive: !!raw.ctx?._keepAliveCtx,
      hasErrorCaptured: !!raw.ec,
      hasExposed: !!raw.exposed,
      hasInheritAttrs: raw.inheritAttrs !== undefined,
      hasEmits: !!raw.emitsOptions,
      hasSetupContext: !!raw.setupContext,
      isStateful: !!raw.data || !!raw.setupState,
    },
  };
}

/**
 * 解析错误堆栈
 * @param {String} stack - 错误堆栈字符串
 */
function parseErrorStack(stack) {
  if (!stack) return [];

  const lines = stack.split("\n").slice(1); // 跳过第一行错误信息
  return lines
    .map((line) => {
      const line_trim = line.trim();
      if (!line_trim.startsWith("at ")) return null;

      // 提取 at 之后的内容
      const afterAt = line_trim.slice(3);

      // 处理两种主要格式：
      // 1. "at setup (App.vue:5:13)"
      // 2. "at callWithErrorHandling (runtime-core.esm-bundler.js:199:19)"
      const setupMatch = afterAt.match(/^setup\s+\((.*?):(\d+):(\d+)\)/);
      if (setupMatch) {
        const [, file, line, column] = setupMatch;
        return {
          function: "setup",
          file,
          line: parseInt(line, 10),
          column: parseInt(column, 10),
          frameType: file.endsWith(".vue") ? "app" : "framework",
          raw: line_trim,
        };
      }

      const normalMatch = afterAt.match(/^(.*?)\s+\((.*?):(\d+):(\d+)\)/);
      if (normalMatch) {
        const [, func, file, line, column] = normalMatch;
        let frameType = "app";
        if (file.includes("node_modules")) {
          frameType = "library";
        } else if (
          file.includes("runtime-core") ||
          file.includes("runtime-dom")
        ) {
          frameType = "framework";
        } else if (file.includes("webpack") || file.includes("vite")) {
          frameType = "build";
        }

        return {
          function: func.trim(),
          file,
          line: parseInt(line, 10),
          column: parseInt(column, 10),
          frameType,
          raw: line_trim,
        };
      }

      // 简单格式 "at App.vue:5:13"
      const simpleMatch = afterAt.match(/^(.*?):(\d+):(\d+)/);
      if (simpleMatch) {
        const [, file, line, column] = simpleMatch;
        return {
          function: "anonymous",
          file,
          line: parseInt(line, 10),
          column: parseInt(column, 10),
          frameType: file.endsWith(".vue") ? "app" : "framework",
          raw: line_trim,
        };
      }

      return null;
    })
    .filter(Boolean);
}

export function createVueErrorLog(err, instance, info, isVue3 = true) {
  console.log(err, instance, info, "vue3ErrorHandler");

  const lastEvent = getLastEvent();
  const stackFrames = parseErrorStack(err.stack);

  // 直接使用第一个堆栈帧的信息
  const firstFrame = stackFrames[0] || {};

  const errorContext = {
    file: firstFrame.file || window.location.href,
    line: firstFrame.line || 0,
    column: firstFrame.column || 0,
    functionName: firstFrame.function || "setup",
    component: null,
  };

  return {
    meta: {
      kind: "stability",
      type: ErrorLevels.error,
      errorType: isVue3 ? ErrorTypes.vue3_error : ErrorTypes.vue2_error,
      timestamp: formatTime(new Date().getTime()),
    },

    error: {
      raw: err,
      name: err.name || "Error",
      message: err.message || String(err),
      stack: err.stack,

      location: {
        ...errorContext,
        path: getLastEventPath() || null,
        eventType: lastEvent?.type || null,
        eventTarget: lastEvent?.target || null,
      },

      stackTrace: {
        frames: stackFrames,
        summary: stackFrames.reduce((acc, frame) => {
          acc[frame.frameType] = (acc[frame.frameType] || 0) + 1;
          return acc;
        }, {}),
      },

      component: {
        current: extractComponentInfo(instance, isVue3),
        lifecycleHook: info,
      },
    },

    page: {
      url: simplifyUrl(window.location.href),
      title: document.title,
      referrer: simplifyUrl(document.referrer),
      loadTime:
        performance.timing?.loadEventStart -
        performance.timing?.navigationStart,
      viewport: {
        screen: `${window.screen.width}x${window.screen.height}`,
        window: `${window.innerWidth}x${window.innerHeight}`,
        scroll: `${window.scrollX},${window.scrollY}`,
      },
      visibility: document.visibilityState,
    },

    device: {
      os: navigator.platform,
      type: /Mobile|Tablet/.test(navigator.userAgent) ? "mobile" : "desktop",
      model: (() => {
        const ua = navigator.userAgent;
        if (/iPhone/.test(ua)) return "iPhone";
        if (/iPad/.test(ua)) return "iPad";
        if (/Android/.test(ua)) return "Android";
        return "unknown";
      })(),
    },

    browser: {
      ua: navigator.userAgent,
      engine: navigator.userAgent.match(/(WebKit|Gecko|Blink)/)?.[0],
      version: navigator.userAgent.match(
        /(Chrome|Firefox|Safari|Edge)\/(\d+)/
      )?.[2],
      language: navigator.language,
    },

    network: {
      type: navigator.connection?.effectiveType,
      rtt: navigator.connection?.rtt || 0,
      downlink: navigator.connection?.downlink || 0,
    },

    performance: {
      memory: performance.memory?.usedJSHeapSize,
      timing: {
        navigationStart: performance.timing?.navigationStart,
        domComplete: performance.timing?.domComplete,
      },
    },

    biz: window.trackConfig?.enableBizFields
      ? {
          module: window.trackConfig?.bizModule || "unknown",
          abTest: window.trackConfig?.abTest,
          actionChain: window.trackConfig?.actionChain || [],
          customData: window.trackConfig?.customData || {},
        }
      : null,
  };
}
