// Distributed locks stored in MongoDB.
//
// Each lock is one document whose _id is the lock key, e.g.
// "booking:<listingId>:2026-12-24". Because _id is unique, only one process
// (on any server) can hold a given key at a time. Locks carry an expiry so a
// crashed server can't hold a lock forever; MongoDB's TTL index cleans up
// expired documents, and an expired lock can be taken over immediately.

const crypto = require("crypto");
const mongoose = require("mongoose");

const lockSchema = new mongoose.Schema(
  {
    _id: String, // the lock key
    token: { type: String, required: true }, // identifies the holder
    expiresAt: { type: Date, required: true },
  },
  { versionKey: false }
);
lockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Lock = mongoose.model("Lock", lockSchema);

class LockError extends Error {
  constructor(message = "Resource is locked") {
    super(message);
    this.name = "LockError";
  }
}

const DUPLICATE_KEY = 11000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Atomically take `key` if it is free or its previous holder's lock expired.
async function tryAcquire(key, token, ttlMs) {
  const now = new Date();
  try {
    await Lock.findOneAndUpdate(
      { _id: key, expiresAt: { $lte: now } }, // only matches an expired lock
      { $set: { token, expiresAt: new Date(now.getTime() + ttlMs) } },
      { upsert: true } // no lock at all -> insert one
    );
    return true;
  } catch (err) {
    // A live lock exists: the filter didn't match, and the upsert's insert
    // collided with the existing _id.
    if (err.code === DUPLICATE_KEY) return false;
    throw err;
  }
}

async function release(keys, token) {
  await Lock.deleteMany({ _id: { $in: keys }, token });
}

// True if this holder still owns every key and none has expired.
async function holdsAll(keys, token) {
  const held = await Lock.countDocuments({
    _id: { $in: keys },
    token,
    expiresAt: { $gt: new Date() },
  });
  return held === keys.length;
}

/**
 * Acquire all `keys`, run `fn`, then release them.
 * All-or-nothing: if any key is taken, everything acquired so far is released
 * and we retry (with jittered backoff) up to `retries` times before throwing
 * LockError. Keys are sorted so every caller acquires in the same order.
 *
 * `fn` receives `{ assertStillHeld }`; call it right before committing a write
 * to make sure the locks didn't expire while you were working.
 */
async function withLocks(keys, fn, { ttlMs = 30000, retries = 5, retryDelayMs = 100 } = {}) {
  const sortedKeys = [...new Set(keys)].sort();
  const token = crypto.randomUUID();

  for (let attempt = 0; attempt <= retries; attempt++) {
    const acquired = [];
    let gotAll = true;
    for (const key of sortedKeys) {
      if (await tryAcquire(key, token, ttlMs)) {
        acquired.push(key);
      } else {
        gotAll = false;
        break;
      }
    }

    if (gotAll) {
      try {
        return await fn({
          assertStillHeld: async () => {
            if (!(await holdsAll(sortedKeys, token))) {
              throw new LockError("Lock expired before the operation finished");
            }
          },
        });
      } finally {
        await release(sortedKeys, token);
      }
    }

    await release(acquired, token);
    if (attempt < retries) {
      await sleep(retryDelayMs * (attempt + 1) + Math.random() * retryDelayMs);
    }
  }

  throw new LockError();
}

module.exports = { withLocks, LockError, Lock };
