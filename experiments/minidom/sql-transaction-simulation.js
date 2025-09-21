// Experiment: demonstrate necessity of shared withTransaction support (H14)
// Scenario: a SQL-backed MiniDom creates element + child then fails validation.
// Without transaction support, parent insert persists while child rollbacks, yielding corruption.
// With shared withTransaction, the operation is atomic.

class SimulatedSqlStore {
  constructor() {
    this.nodes = [];
  }
  clone() {
    const copy = new SimulatedSqlStore();
    copy.nodes = this.nodes.map((row) => ({ ...row }));
    return copy;
  }
}

function naiveInsertSequence(store) {
  // Step 1: insert parent node row
  store.nodes.push({ id: 1, name: "parent" });
  // Step 2: attempt to insert child but fail (simulate constraint violation)
  throw new Error("child violates constraint");
  // unreachable: store.nodes.push({ id: 2, name: "child", parentId: 1 });
}

function transactionInsertSequence(store) {
  const working = store.clone();
  try {
    working.nodes.push({ id: 1, name: "parent" });
    throw new Error("child violates constraint");
  } catch (error) {
    return { committed: false, error: error.message, nodes: [...store.nodes] };
  }
}

function withTransaction(store, effect) {
  const snapshot = store.clone();
  try {
    effect(snapshot);
    store.nodes = snapshot.nodes;
    return { committed: true, nodes: [...store.nodes] };
  } catch (error) {
    return { committed: false, error: error.message, nodes: [...store.nodes] };
  }
}

const baselineStore = new SimulatedSqlStore();
let baselineResult;
try {
  naiveInsertSequence(baselineStore);
  baselineResult = { committed: true, nodes: baselineStore.nodes };
} catch (error) {
  baselineResult = { committed: false, error: error.message, nodes: baselineStore.nodes };
}

const txStore = new SimulatedSqlStore();
const txResult = withTransaction(txStore, (working) => {
  working.nodes.push({ id: 1, name: "parent" });
  throw new Error("child violates constraint");
});

console.log(
  JSON.stringify(
    {
      baselineResult,
      txResult,
    },
    null,
    2
  )
);
