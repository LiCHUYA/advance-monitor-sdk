import { ErrorTypes } from "../constant/index.js";

/**
 * 处理错误堆栈信息，将其转换为更易读的格式
 * @param {string} stack 原始的错误堆栈字符串
 * @returns {Array<{line: string, row: number, col: number, filename: string, function: string}>} 格式化后的堆栈信息
 */
export function handleErrorStack(stack) {
  if (!stack) return [];

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
 * @returns {string} 格式化后的错误信息
 */
export function formatError(error) {
  if (!error) return "";

  const stackFrames = handleErrorStack(error.stack);
  let formattedError = `🚨 ${error.name}: ${error.message}\n`;

  if (stackFrames.length > 0) {
    formattedError +=
      "\n调用栈:\n" +
      stackFrames
        .map((frame, index) => {
          return `  ${index + 1}. ${frame.function}\n     at ${
            frame.filename
          }:${frame.line}:${frame.column}`;
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
