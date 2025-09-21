// Experiment: compare ad-hoc DI wiring vs standardized layer helpers (H22)

function createLayer(name, factory) {
  return { name, factory };
}

function runLayers(layers) {
  const env = {};
  for (const layer of layers) {
    Object.assign(env, layer.factory(env));
  }
  return env;
}

const registryLayer = createLayer("registry", () => ({ registry: { kind: "registry" } }));
const sqlLayer = createLayer("sql", () => ({ sql: { kind: "sql" } }));

const adHocMake = (env) => ({ source: `adhoc(${env.registry.kind}+${env.sql.kind})` });
const consumer = (env) => `using-${env.miniDom.source}`;

function wireAdHoc() {
  const steps = [];
  const env = {};
  steps.push("create registry manually");
  Object.assign(env, registryLayer.factory(env));
  steps.push("create sql manually");
  Object.assign(env, sqlLayer.factory(env));
  steps.push("invoke make + assign service each call");
  env.miniDom = adHocMake(env);
  const result = consumer(env);
  return { steps, result };
}

const standardMiniDomLayer = createLayer("minidom", (env) => ({ miniDom: adHocMake(env) }));

function wireStandard() {
  const steps = ["compose registry+sql+minidom layers once"];
  const env = runLayers([registryLayer, sqlLayer, standardMiniDomLayer]);
  const result = consumer(env);
  return { steps, result };
}

const adhoc = wireAdHoc();
const standard = wireStandard();

console.log(
  JSON.stringify(
    {
      adhoc,
      standard,
      adHocStepCount: adhoc.steps.length,
      standardStepCount: standard.steps.length,
    },
    null,
    2
  )
);
