/**
 * 동시 1개 렌더 + 새 요청 시 이전 작업 cancel
 * 빠른 스크롤 시 불필요한 렌더 방지
 */
export function createRenderQueue() {
  let pending = null;
  let running = false;
  let cancelled = false;

  async function enqueue(key, task) {
    // 같은 key가 이전에 enqueue 되었으면 skip
    if (pending && pending.key === key) return;

    // 실행 중인 작업 cancel
    if (running) {
      cancelled = true;
    }
    pending = { key, task };
    await runLoop();
  }

  async function runLoop() {
    while (pending) {
      const job = pending;
      pending = null;
      running = true;
      cancelled = false;
      try {
        await job.task();
      } catch (e) {
        if (!cancelled) console.warn('[RenderQueue]', e);
      }
      running = false;
    }
  }

  function cancelAll() {
    cancelled = true;
    pending = null;
  }

  return { enqueue, cancelAll };
}
