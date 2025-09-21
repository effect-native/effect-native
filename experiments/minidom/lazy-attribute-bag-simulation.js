// Experiment: demonstrate failure of synchronous attribute access for lazy backends (H17)

class SyncAttributeBag {
  constructor(loader) {
    this.loader = loader;
    this.cache = new Map();
  }
  get(name) {
    if (!this.cache.has(name)) {
      // Attempt to load synchronously; remote loader returns Promise and is ignored.
      const value = this.loader(name);
      this.cache.set(name, value);
    }
    return this.cache.get(name);
  }
}

class AsyncAttributeBag {
  constructor(loader) {
    this.loader = loader;
    this.cache = new Map();
  }
  async get(name) {
    if (!this.cache.has(name)) {
      const value = await this.loader(name);
      this.cache.set(name, value);
    }
    return this.cache.get(name);
  }
}

function remoteLoader(name) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(`${name}-from-remote`), 10);
  });
}

const syncBag = new SyncAttributeBag((name) => {
  const value = remoteLoader(name);
  return value; // Promise stored without awaiting
});

const asyncBag = new AsyncAttributeBag(remoteLoader);

const syncValue = syncBag.get('title');
const asyncValue = await asyncBag.get('title');

console.log(
  JSON.stringify({
    syncType: typeof syncValue,
    syncValue,
    asyncType: typeof asyncValue,
    asyncValue,
  }, null, 2)
);
