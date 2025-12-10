const IORedis = require("ioredis");
const redis = new IORedis(process.env.REDIS_URL || "redis://127.0.0.1:6379");

// helper: delete keys by pattern (safe)
async function delByPattern(pattern) {
  const stream = redis.scanStream({ match: pattern, count: 100 });
  const keys = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (resultKeys) => {
      if (resultKeys.length) {
        // accumulate and delete in chunks
        redis.unlink(...resultKeys).catch(() => redis.del(...resultKeys));
      }
    });
    stream.on("end", () => resolve());
    stream.on("error", (err) => reject(err));
  });
}

module.exports = { redis, delByPattern };
