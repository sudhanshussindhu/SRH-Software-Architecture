const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// channel → array of handler functions
const handlers = new Map();

let publisher = null;
let subscriber = null;
let connected = false;

function createClient() {
  return new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => (times > 3 ? null : Math.min(times * 200, 2000)),
    lazyConnect: true,
  });
}

async function connect(logger) {
  publisher = createClient();
  subscriber = createClient();

  publisher.on("error", (err) => logger && logger.warn(`Event bus publisher error: ${err.message}`));
  subscriber.on("error", (err) => logger && logger.warn(`Event bus subscriber error: ${err.message}`));

  try {
    await Promise.all([publisher.connect(), subscriber.connect()]);
    connected = true;

    // Subscribe all pre-registered channels now that Redis is connected
    const channels = Array.from(handlers.keys());
    if (channels.length) await subscriber.subscribe(...channels);

    subscriber.on("message", (channel, raw) => {
      const list = handlers.get(channel) || [];
      let data;
      try { data = JSON.parse(raw); } catch { return; }
      list.forEach((h) => h(data));
    });

    if (logger) logger.info("Event bus connected to Redis");
  } catch (err) {
    connected = false;
    if (logger) logger.warn(`Event bus unavailable — running without events: ${err.message}`);
  }
}

// Best-effort publish: failure does not propagate to the caller
async function publish(channel, data) {
  if (!connected) return;
  try {
    await publisher.publish(channel, JSON.stringify(data));
  } catch {
    // intentionally swallowed — events are non-critical side effects
  }
}

function subscribe(channel, handler) {
  if (!handlers.has(channel)) handlers.set(channel, []);
  handlers.get(channel).push(handler);
  // If already connected, subscribe immediately; otherwise connect() will pick it up
  if (connected && subscriber) {
    subscriber.subscribe(channel).catch(() => {});
  }
}

module.exports = { connect, publish, subscribe };
