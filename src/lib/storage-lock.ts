import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Khóa tuần tự FIFO bất đồng bộ hỗ trợ re-entrant qua AsyncLocalStorage.
 * Cho phép OrderService giữ khóa ở tầng điều phối rồi gọi xuống Repository dùng chung khóa mà không deadlock.
 */
export class StorageLock {
  private readonly context = new AsyncLocalStorage<boolean>();
  private locked = false;
  private readonly waiters: Array<() => void> = [];

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    if (this.context.getStore() === true) {
      return await fn();
    }

    await this.acquire();
    try {
      return await this.context.run(true, fn);
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  private release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
    } else {
      this.locked = false;
    }
  }
}
