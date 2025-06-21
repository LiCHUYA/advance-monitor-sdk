import { SourceMapConsumer } from "source-map";

// 缓存对象
const cache = {
  sourceMapConsumer: null,
};

let config = {
  url: "", // sourcemap的URL
  version: "", // 应用版本号
};

/**
 * 初始化sourcemap
 * @param {Object} options - 配置项
 * @param {string} options.url - sourcemap的URL
 * @param {string} [options.version=''] - 应用版本号
 */
export function initSourceMap(options) {
  if (!options.url) {
    throw new Error("必须提供sourcemap的URL");
  }
  config = {
    url: options.url,
    version: options.version || "",
  };
}

/**
 * 上传sourcemap文件并获取元信息
 * @param {Object} options - 上传选项
 * @param {string} options.version - 应用版本号
 * @param {string} options.uploadUrl - 上传接口地址
 * @param {string|Object} options.sourceMap - sourcemap内容（JSON字符串或对象）或File对象
 * @returns {Promise<Object>} - 上传结果，包含hash、id和url
 */
export async function uploadSourceMap(options) {
  try {
    if (!options.version) {
      throw new Error("必须提供应用版本号");
    }
    if (!options.uploadUrl) {
      throw new Error("必须提供上传地址");
    }
    if (!options.sourceMap) {
      throw new Error("必须提供sourcemap内容");
    }

    let formData = new FormData();
    formData.append("version", options.version);

    // 处理不同类型的sourceMap输入
    if (options.sourceMap instanceof File) {
      // 如果是File对象，直接使用
      formData.append("sourceMap", options.sourceMap);
    } else if (
      typeof options.sourceMap === "string" ||
      typeof options.sourceMap === "object"
    ) {
      // 如果是字符串或对象，转换为JSON字符串
      const content =
        typeof options.sourceMap === "string"
          ? options.sourceMap
          : JSON.stringify(options.sourceMap);

      try {
        // 验证是否是有效的JSON
        JSON.parse(
          typeof options.sourceMap === "string" ? options.sourceMap : content
        );
      } catch (e) {
        throw new Error("提供的sourcemap内容不是有效的JSON");
      }

      // 创建文件对象
      const blob = new Blob([content], { type: "application/json" });
      formData.append("sourceMap", blob, "sourcemap.json");
    } else {
      throw new Error("不支持的sourcemap格式");
    }

    const response = await fetch(options.uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传失败: ${response.statusText}`);
    }

    const result = await response.json();

    // 验证返回结果
    if (!result.hash || !result.id || !result.url) {
      throw new Error("服务端返回格式错误，需要包含 hash、id 和 url");
    }

    return {
      hash: result.hash,
      id: result.id,
      url: result.url,
      version: options.version,
    };
  } catch (error) {
    console.error("上传sourcemap失败:", error);
    throw error;
  }
}

/**
 * 解析错误堆栈信息
 * @param {Error} error - 错误对象
 * @param {Object} sourceMapInfo - sourcemap信息
 * @param {string} sourceMapInfo.url - sourcemap的URL
 * @returns {Promise<Object>} - 解析后的错误信息
 */
export async function parseErrorStack(error, sourceMapInfo) {
  try {
    if (!sourceMapInfo?.url) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    if (!cache.sourceMapConsumer) {
      const sourceMapContent = await loadSourceMap(sourceMapInfo.url);
      if (sourceMapContent) {
        cache.sourceMapConsumer = await new SourceMapConsumer(sourceMapContent);
      }
    }

    const stackFrames = error.stack.split("\n");
    const parsedFrames = [];

    for (const frame of stackFrames) {
      const match = frame.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/);
      if (!match) {
        parsedFrames.push(frame);
        continue;
      }

      const [, functionName, fileName, line, column] = match;

      if (cache.sourceMapConsumer) {
        const originalPosition = cache.sourceMapConsumer.originalPositionFor({
          line: parseInt(line),
          column: parseInt(column),
        });

        if (originalPosition.source) {
          const sourceContent = cache.sourceMapConsumer.sourceContentFor(
            originalPosition.source
          );
          let contextCode = null;

          if (sourceContent) {
            const lines = sourceContent.split("\n");
            const start = Math.max(0, originalPosition.line - 3);
            const end = Math.min(lines.length, originalPosition.line + 3);
            contextCode = lines.slice(start, end).join("\n");
          }

          parsedFrames.push({
            functionName: originalPosition.name || functionName,
            fileName: originalPosition.source,
            line: originalPosition.line,
            column: originalPosition.column,
            contextCode,
          });
        } else {
          parsedFrames.push({
            functionName,
            fileName,
            line: parseInt(line),
            column: parseInt(column),
          });
        }
      } else {
        parsedFrames.push({
          functionName,
          fileName,
          line: parseInt(line),
          column: parseInt(column),
        });
      }
    }

    return {
      message: error.message,
      name: error.name,
      stack: parsedFrames,
    };
  } catch (err) {
    console.error("错误堆栈解析失败：", err);
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      parseError: err.message,
    };
  }
}

/**
 * 加载sourcemap文件内容
 * @param {string} sourceMapUrl - sourcemap文件的URL
 * @returns {Promise<string|null>} - sourcemap文件内容
 */
async function loadSourceMap(sourceMapUrl) {
  try {
    const response = await fetch(sourceMapUrl);
    if (!response.ok) {
      throw new Error(`加载sourcemap文件失败：${response.statusText}`);
    }
    return await response.text();
  } catch (err) {
    console.error("加载sourcemap文件失败：", err);
    return null;
  }
}

/**
 * 清理资源，释放内存
 */
export function dispose() {
  if (cache.sourceMapConsumer) {
    cache.sourceMapConsumer.destroy();
    cache.sourceMapConsumer = null;
  }
}

/**
 * 从URL加载sourcemap文件内容
 * @param {string} sourceMapUrl - sourcemap文件的URL地址
 * @returns {Promise<string>} - sourcemap文件内容
 */
export async function loadSourceMapFromUrl(sourceMapUrl) {
  try {
    if (cache.sourceMapCache.has(sourceMapUrl)) {
      return cache.sourceMapCache.get(sourceMapUrl);
    }

    const response = await fetch(sourceMapUrl);
    if (!response.ok) {
      throw new Error(`加载sourcemap文件失败：${response.statusText}`);
    }

    const sourceMapContent = await response.text();
    cache.sourceMapCache.set(sourceMapUrl, sourceMapContent);
    return sourceMapContent;
  } catch (err) {
    console.error("加载sourcemap文件失败：", err);
    return null;
  }
}

/**
 * 自动发现并加载sourcemap文件
 * @param {string} jsFileUrl - JavaScript文件的URL
 * @returns {Promise<string|null>} - sourcemap文件内容
 */
export async function autoDiscoverSourceMap(jsFileUrl) {
  try {
    const response = await fetch(jsFileUrl);
    const jsContent = await response.text();
    const sourceMappingURL = extractSourceMappingURL(jsContent);

    if (!sourceMappingURL) return null;

    const sourceMapUrl = new URL(sourceMappingURL, jsFileUrl).href;
    return await loadSourceMapFromUrl(sourceMapUrl);
  } catch (err) {
    console.error("自动发现sourcemap失败：", err);
    return null;
  }
}

/**
 * 从JavaScript文件内容中提取sourceMappingURL
 * @param {string} content - JavaScript文件内容
 * @returns {string|null} - sourceMappingURL
 */
function extractSourceMappingURL(content) {
  const sourceMappingURLRegex =
    /\/\/[#@]\s*sourceMappingURL=([^\s'"]+)[\s\n]*$/m;
  const match = content.match(sourceMappingURLRegex);
  return match ? match[1] : null;
}

/**
 * 检查并更新sourcemap版本
 * @param {string} sourceMapUrl - sourcemap文件的URL
 * @param {string} version - 版本号
 * @returns {boolean} - 是否需要更新
 */
export async function checkSourceMapVersion(sourceMapUrl, version) {
  const cachedVersion = cache.sourceMapVersions.get(sourceMapUrl);
  if (cachedVersion === version) {
    return false;
  }

  cache.sourceMapCache.delete(sourceMapUrl);
  const consumer = cache.sourceMapConsumers.get(sourceMapUrl);
  if (consumer) {
    consumer.destroy();
    cache.sourceMapConsumers.delete(sourceMapUrl);
  }

  cache.sourceMapVersions.set(sourceMapUrl, version);
  return true;
}

/**
 * 获取sourcemap版本信息
 * @param {string} sourceMapUrl - sourcemap文件的URL
 * @returns {string|null} - 版本号
 */
export function getSourceMapVersion(sourceMapUrl) {
  return cache.sourceMapVersions.get(sourceMapUrl) || null;
}

// 使用示例：
/*
// 1. 初始化
initSourceMap({
  url: 'https://example.com/app.js.map',
  version: '1.0.0'
});

// 2. 解析错误
try {
  // 可能抛出错误的代码
} catch (error) {
  const parsedError = await parseErrorStack(error);
  console.log('源代码中的错误位置：', parsedError);
}

// 3. 上传sourcemap文件
const sourceMapFile = new File(['...'], 'bundle.js.map');
await uploadSourceMap(sourceMapFile, '1.0.0');

// 4. 在错误监控中使用
window.addEventListener('error', async (event) => {
  const sourceMapContent = await loadSourceMapFromUrl('bundle.js.map');
  const parsedError = await parseErrorStack(event.error);
  // 发送到服务器
  sendErrorToServer(parsedError);
});

// 5. 自动发现并加载sourcemap
const jsFileUrl = 'https://example.com/app.js';
const sourceMapContent = await autoDiscoverSourceMap(jsFileUrl);
if (sourceMapContent) {
  // 处理错误定位
}
*/
