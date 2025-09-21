// Experiment: ensure registry `extensions` can host backend metadata without breaking types (H21)

const SQL_EXTENSION = Symbol.for("minidom.sql");
const KV_EXTENSION = Symbol.for("minidom.kv");

interface ElementDefinition<AttrSchema, ChildrenSchema, Extensions = {}> {
  readonly name: string;
  readonly attrs: AttrSchema;
  readonly children: ChildrenSchema;
  readonly extensions?: Extensions;
}

interface SqlMetadata {
  readonly table: string;
  readonly columns: ReadonlyArray<string>;
}

interface KvMetadata {
  readonly keyPrefix: string;
}

type ExtensionBag = {
  [SQL_EXTENSION]?: SqlMetadata;
  [KV_EXTENSION]?: KvMetadata;
};

const registry = {
  html: {
    name: "html",
    attrs: {},
    children: [],
    extensions: {
      [SQL_EXTENSION]: {
        table: "documents",
        columns: ["id", "version"],
      },
    } satisfies ExtensionBag,
  },
  meta: {
    name: "meta",
    attrs: { charset: "utf-8" },
    children: [],
    extensions: {
      [KV_EXTENSION]: {
        keyPrefix: "meta",
      },
    } satisfies ExtensionBag,
  },
} satisfies Record<string, ElementDefinition<unknown, unknown, ExtensionBag>>;

function readSqlMetadata(element: ElementDefinition<unknown, unknown, ExtensionBag>): SqlMetadata | undefined {
  return element.extensions?.[SQL_EXTENSION];
}

const htmlSql = readSqlMetadata(registry.html);
const metaSql = readSqlMetadata(registry.meta);

console.log(JSON.stringify({ htmlSql, metaSql }, null, 2));
