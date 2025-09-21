// Experiment: compare plain Error vs. tagged MiniDomError for diagnostics (H16)

class PlainError extends Error {}

class MiniDomValidationError extends Error {
  constructor(details) {
    super(details.message);
    this._tag = 'SchemaViolation';
    this.details = details;
  }
}

function validateWithPlainError(node) {
  if (node.requiredChildMissing) {
    throw new PlainError('missing required child');
  }
}

function validateWithStructuredError(node) {
  if (node.requiredChildMissing) {
    throw new MiniDomValidationError({
      nodeName: node.name,
      rule: 'required-child',
      missing: 'head',
      message: 'missing required child',
    });
  }
}

function categorize(errors) {
  const counts = {};
  for (const error of errors) {
    const key = error._tag ?? 'Unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

const node = { name: 'html', requiredChildMissing: true };

let plainCategory;
try {
  validateWithPlainError(node);
} catch (error) {
  plainCategory = categorize([error]);
}

let structuredCategory;
try {
  validateWithStructuredError(node);
} catch (error) {
  structuredCategory = categorize([error]);
}

console.log(
  JSON.stringify({ plainCategory, structuredCategory }, null, 2)
);
