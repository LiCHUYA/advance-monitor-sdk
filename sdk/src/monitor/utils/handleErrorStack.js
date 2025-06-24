import { ErrorTypes } from "../constants/index.js";

/**
 * 处理错误堆栈信息，将其转换为更易读的格式
 * @param {string} stack 原始的错误堆栈字符串
 * @returns {Promise<Array<{line: string, row: number, col: number, filename: string, function: string}>>} 格式化后的堆栈信息
 */
export async function handleErrorStack(stack) {
  if (!stack) return [];

  try {
    const { parseErrorStack } = await import("../lib/sourcemap.js");
    const error = new Error();
    error.stack = stack;

    const parsedError = await parseErrorStack(error, {
      url: window.trackConfig?.sourceMapUrl,
    });

    if (parsedError.stack && Array.isArray(parsedError.stack)) {
      return parsedError.stack.map((frame) => ({
        function: frame.functionName || "<anonymous>",
        filename: frame.fileName || "",
        line: frame.line || 0,
        column: frame.column || 0,
        contextCode: frame.contextCode,
      }));
    }
  } catch (err) {
    console.warn("解析错误堆栈失败:", err);
  }

  // 回退到原始堆栈解析
  return stack
    .split("\n")
    .slice(1) // 去掉第一行（错误信息）
    .map((line) => {
      const parseResult = line.match(
        /^\s*at\s+(?:(.+?)\s+\()?(?:(.+):(\d+):(\d+)\)?|(.+)?)$/
      );
      if (!parseResult) return null;

      const [, fnName, filename, lineNo, colNo, anonymousName] = parseResult;
      return {
        function: fnName || anonymousName || "<anonymous>",
        filename: filename || "",
        line: parseInt(lineNo, 10) || 0,
        column: parseInt(colNo, 10) || 0,
      };
    })
    .filter(Boolean); // 过滤掉解析失败的行
}

/**
 * 格式化错误信息，使其更易读
 * @param {Error} error 错误对象
 * @returns {Promise<string>} 格式化后的错误信息
 */
export async function formatError(error) {
  if (!error) return "";

  const stackFrames = await handleErrorStack(error.stack);
  let formattedError = `🚨 ${error.name}: ${error.message}\n`;

  if (stackFrames.length > 0) {
    formattedError +=
      "\n调用栈:\n" +
      stackFrames
        .map((frame, index) => {
          const context = frame.contextCode
            ? `\n     ${frame.contextCode.split("\n").join("\n     ")}`
            : "";
          return `  ${index + 1}. ${frame.function}\n     位于 ${
            frame.filename
          }:${frame.line}:${frame.column}${context}`;
        })
        .join("\n");
  }

  return formattedError;
}

/**
 * 提取URL中的关键信息
 * @param {string} url 完整URL
 * @returns {string} 简化后的URL
 */
export function simplifyUrl(url) {
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    return `${urlObj.pathname}${urlObj.search}${urlObj.hash}`;
  } catch (e) {
    return url;
  }
}

/**
 * 格式化时间戳
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的时间
 */
export function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
