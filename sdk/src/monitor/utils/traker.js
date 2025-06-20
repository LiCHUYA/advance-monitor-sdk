class SendTracker {
  constructor() {
    this.url = "http://localhost:8080/api/v1/tracker";
    this.maxRetries = 1; // 最大重试次数
    this.retryDelay = 1000; // 重试延迟(ms)
    this.queue = []; // 待发送队列
    this.sending = false; // 是否正在发送
    this.maxQueueSize = 100; // 最大队列长度
    this.reportingError = false; // 是否正在上报错误日志
  }

  /**
   * 添加日志到队列
   * @param {Object} data - 日志数据
   */
  send(data) {
    // 如果是错误上报相关的错误，直接忽略避免递归
    if (
      data?.error?.ajax?.url === this.url || // 上报接口自身的错误
      this.reportingError // 正在上报错误日志
    ) {
      console.warn(
        "[Monitor] Ignore error reporting error to prevent recursion"
      );
      return;
    }

    // 队列已满，移除最早的一条
    if (this.queue.length >= this.maxQueueSize) {
      this.queue.shift();
    }

    // 添加到队列
    this.queue.push({
      data,
      retries: 0,
      timestamp: Date.now(),
    });

    // 尝试发送
    this.flush();
  }

  /**
   * 发送队列中的日志
   */
  async flush() {
    // 如果正在发送，直接返回
    if (this.sending) {
      return;
    }

    // 如果队列为空，直接返回
    if (this.queue.length === 0) {
      return;
    }

    this.sending = true;

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];

        try {
          this.reportingError = true; // 标记正在上报
          await this.sendRequest(item.data);
          this.queue.shift(); // 发送成功，从队列移除
          this.reportingError = false; // 重置标记
        } catch (error) {
          this.reportingError = false; // 重置标记

          // 超过重试次数，放弃该条日志
          if (item.retries >= this.maxRetries) {
            console.warn(
              `[Monitor] Give up sending log after ${this.maxRetries} retries`
            );
            this.queue.shift();
            continue;
          }

          // 未超过重试次数，增加重试次数
          item.retries++;

          // 等待重试延迟
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        }
      }
    } finally {
      this.sending = false;
    }
  }

  /**
   * 发送单条日志请求
   * @param {Object} data - 日志数据
   * @returns {Promise}
   */
  sendRequest(data) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 超时设置
      xhr.timeout = 10000;

      xhr.open("POST", this.url, true);
      xhr.setRequestHeader("Content-Type", "application/json");

      // 成功回调
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      };

      // 错误回调
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.ontimeout = () => reject(new Error("Request timeout"));

      // 发送请求
      try {
        xhr.send(JSON.stringify(data));
      } catch (error) {
        reject(error);
      }
    });
  }
}

export default new SendTracker();
