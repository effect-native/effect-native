// Experiment: Validate hybrid MiniDom trees per provider and aggregate results (H23)

class Node {
  constructor(owner, name, children = []) {
    this.owner = owner;
    this.name = name;
    this.children = children;
  }
}

const providers = {
  local: {
    validate(node) {
      const errors = [];
      if (node.name === "html" && !node.children.some((child) => child.name === "head")) {
        errors.push({ owner: "local", node: node.name, issue: "missing-head" });
      }
      return errors;
    },
  },
  remote: {
    validate(node) {
      const errors = [];
      if (node.name === "remote-root" && node.children.length === 0) {
        errors.push({ owner: "remote", node: node.name, issue: "empty-remote-root" });
      }
      return errors;
    },
  },
};

function aggregateValidation(rootNodes) {
  const results = [];
  for (const node of rootNodes) {
    const provider = providers[node.owner];
    if (!provider) {
      results.push({ owner: node.owner, node: node.name, issue: "unknown-owner" });
      continue;
    }
    results.push(...provider.validate(node));
    results.push(...aggregateValidation(node.children));
  }
  return results;
}

const tree = [
  new Node("local", "html", [
    new Node("local", "body", []),
  ]),
  new Node("remote", "remote-root", []),
];

const errors = aggregateValidation(tree);

console.log(JSON.stringify({ errors }, null, 2));
