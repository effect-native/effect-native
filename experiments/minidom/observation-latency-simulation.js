// Experiment: compare polling vs. subscription latency for remote MiniDom updates (H15)

import { EventEmitter } from 'events';

async function measurePollingLatency(updateDelayMs, pollIntervalMs) {
  return await new Promise((resolve) => {
    const emitter = new EventEmitter();
    const start = Date.now();
    let observed = false;

    const poller = setInterval(() => {
      if (observed) {
        clearInterval(poller);
        return;
      }
      if (emitter.update) {
        observed = true;
        clearInterval(poller);
        resolve({
          strategy: 'polling',
          pollIntervalMs,
          latencyMs: Date.now() - start,
        });
      }
    }, pollIntervalMs);

    setTimeout(() => {
      emitter.update = { type: 'remote-change' };
    }, updateDelayMs);
  });
}

async function measureStreamLatency(updateDelayMs) {
  return await new Promise((resolve) => {
    const emitter = new EventEmitter();
    const start = Date.now();
    emitter.once('update', () => {
      resolve({
        strategy: 'subscription',
        latencyMs: Date.now() - start,
      });
    });
    setTimeout(() => {
      emitter.emit('update', { type: 'remote-change' });
    }, updateDelayMs);
  });
}

const pollingSlow = await measurePollingLatency(20, 100);
const pollingFast = await measurePollingLatency(20, 25);
const stream = await measureStreamLatency(20);

console.log(JSON.stringify({ pollingSlow, pollingFast, stream }, null, 2));
