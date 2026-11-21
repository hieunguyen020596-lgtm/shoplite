// @vitest-environment node
import { describe, expect, it } from "vitest";
import { StorageLock } from "./storage-lock";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("StorageLock", () => {
  it("tuần tự hóa các tác vụ đồng thời theo đúng thứ tự FIFO và không chạy chồng chéo", async () => {
    const lock = new StorageLock();
    const trace: string[] = [];
    let activeCount = 0;
    let maxConcurrent = 0;

    const tasks = [1, 2, 3, 4].map((id) =>
      lock.runExclusive(async () => {
        activeCount += 1;
        maxConcurrent = Math.max(maxConcurrent, activeCount);
        trace.push(`start-${id}`);
        await delay(10 - id * 2);
        trace.push(`end-${id}`);
        activeCount -= 1;
        return id;
      }),
    );

    const results = await Promise.all(tasks);
    expect(results).toEqual([1, 2, 3, 4]);
    expect(maxConcurrent).toBe(1);
    expect(trace).toEqual([
      "start-1",
      "end-1",
      "start-2",
      "end-2",
      "start-3",
      "end-3",
      "start-4",
      "end-4",
    ]);
  });

  it("hỗ trợ gọi lồng nhau (re-entrant) trên cùng instance mà không deadlock", async () => {
    const lock = new StorageLock();
    const events: string[] = [];

    const outerPromise = lock.runExclusive(async () => {
      events.push("outer-start");
      const innerResult = await lock.runExclusive(async () => {
        events.push("inner-1-start");
        const deepResult = await lock.runExclusive(async () => {
          events.push("inner-2");
          return "ok";
        });
        events.push("inner-1-end");
        return deepResult;
      });
      await delay(10);
      events.push("outer-end");
      return innerResult;
    });

    const queuedPromise = lock.runExclusive(async () => {
      events.push("queued");
      return "done";
    });

    expect(await Promise.all([outerPromise, queuedPromise])).toEqual([
      "ok",
      "done",
    ]);
    expect(events).toEqual([
      "outer-start",
      "inner-1-start",
      "inner-2",
      "inner-1-end",
      "outer-end",
      "queued",
    ]);
  });

  it("nhả khóa khi tác vụ bên trong ném lỗi để tác vụ tiếp theo chạy bình thường", async () => {
    const lock = new StorageLock();

    const failing = lock.runExclusive(async () => {
      await delay(5);
      throw new Error("boom");
    });
    const succeeding = lock.runExclusive(async () => "recovered");

    await expect(failing).rejects.toThrow("boom");
    await expect(succeeding).resolves.toBe("recovered");
  });

  it("cô lập ngữ cảnh re-entrant giữa các instance StorageLock khác nhau", async () => {
    const lockA = new StorageLock();
    const lockB = new StorageLock();
    const events: string[] = [];

    const holdB = lockB.runExclusive(async () => {
      events.push("holdB-start");
      await delay(25);
      events.push("holdB-end");
    });

    await delay(5);

    const useAAndB = lockA.runExclusive(async () => {
      events.push("useA-start");
      await lockB.runExclusive(async () => {
        events.push("useB-inside-A");
      });
      events.push("useA-end");
    });

    await Promise.all([holdB, useAAndB]);
    expect(events).toEqual([
      "holdB-start",
      "useA-start",
      "holdB-end",
      "useB-inside-A",
      "useA-end",
    ]);
  });
});
