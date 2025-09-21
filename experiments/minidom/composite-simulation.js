// Simple simulation to test MiniDom composite routing across providers.
// We simulate two providers: LocalDom (sync) and RemoteDom (async via Promise).
// The composite delegates operations by namespace and ensures ownership rules.

class Node {
  constructor(namespace, name) {
    this.namespace = namespace;
    this.name = name;
    this.children = [];
    this.owner = null; // provider id
  }
  appendChild(node) {
    this.children.push(node);
  }
}

class LocalDom {
  constructor() {
    this.id = "local";
    this.log = [];
  }
  createElement(namespace, name) {
    const node = new Node(namespace, name);
    node.owner = this.id;
    this.log.push(`create:${namespace}:${name}`);
    return node;
  }
  appendChild(parent, child) {
    if (parent.owner !== this.id) {
      throw new Error("LocalDom cannot mutate nodes it does not own");
    }
    parent.appendChild(child);
    this.log.push(`append:${parent.name}->${child.name}`);
    return parent;
  }
}

class RemoteDom {
  constructor() {
    this.id = "remote";
    this.log = [];
  }
  async createElement(namespace, name) {
    const node = new Node(namespace, name);
    node.owner = this.id;
    this.log.push(`create:${namespace}:${name}`);
    return node;
  }
  async appendChild(parent, child) {
    if (parent.owner !== this.id) {
      throw new Error("RemoteDom cannot mutate nodes it does not own");
    }
    parent.appendChild(child);
    this.log.push(`append:${parent.name}->${child.name}`);
    return parent;
  }
}

class CompositeDom {
  constructor(delegates) {
    this.delegates = delegates; // map namespace -> provider
  }
  providerFor(namespace) {
    return this.delegates[namespace] ?? this.delegates.default;
  }
  async createElement(namespace, name) {
    const provider = this.providerFor(namespace);
    const result = provider.createElement(namespace, name);
    return result instanceof Promise ? await result : result;
  }
  async appendChild(parent, child) {
    if (parent.owner !== child.owner) {
      throw new Error(
        `Composite boundary violation: parent owned by ${parent.owner}, child by ${child.owner}`
      );
    }
    const provider = this.delegatesById(parent.owner);
    const result = provider.appendChild(parent, child);
    return result instanceof Promise ? await result : result;
  }
  delegatesById(id) {
    const match = Object.values(this.delegates).find((provider) => provider.id === id);
    if (!match) throw new Error(`Unknown provider id ${id}`);
    return match;
  }
}

async function run() {
  const local = new LocalDom();
  const remote = new RemoteDom();
  const composite = new CompositeDom({ html: local, remote: remote, default: local });

  const htmlRoot = await composite.createElement("html", "html");
  const remoteRoot = await composite.createElement("remote", "remote-root");

  // Ownership boundaries
  await composite.appendChild(htmlRoot, await composite.createElement("html", "body"));

  const remoteChild = await composite.createElement("remote", "remote-child");
  await composite.appendChild(remoteRoot, remoteChild);

  let crossBoundaryError = null;
  try {
    await composite.appendChild(htmlRoot, remoteChild);
  } catch (err) {
    crossBoundaryError = err.message;
  }

  return {
    localLog: local.log,
    remoteLog: remote.log,
    crossBoundaryError,
    htmlChildren: htmlRoot.children.map((n) => `${n.owner}:${n.name}`),
    remoteChildren: remoteRoot.children.map((n) => `${n.owner}:${n.name}`),
  };
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
