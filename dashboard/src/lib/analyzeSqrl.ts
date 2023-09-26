import { compileSqrl } from "~/lib/compileSqrl";
import type { Ast } from "~/../node_modules/sqrl/lib/api/ast";

interface entityType {
  features: Set<string>;
  labels: Set<string>;
}

type Params = Parameters<typeof compileSqrl>;

export async function analyze(instance: Params[0], fileData: Params[1]) {
  const { compiled } = await compileSqrl(instance, fileData);

  //

  const eventLabels = new Set<string>();
  const eventFeatures = new Set<string>();
  const entities: Record<string, entityType> = {};

  const alreadyIncludedFiles = new Set(["main.sqrl"]);
  const entityToEntityName: Record<string, string> = {};

  //

  const upsertEntity = (name: string) => {
    if (!entities[name])
      entities[name] = { features: new Set(), labels: new Set() };
    return entities[name]!;
  };

  const extractConstant = (node: Ast) => {
    if (node.type === "feature") return entityToEntityName[node.value];
    if (node.type === "constant") return node.value;
    return undefined;
  };
  const constantArgs = (nodes: Ast[]) => {
    return nodes.map(extractConstant);
  };

  //

  // TODO: this is wrong.
  // very condition-y handling of Ast types - surely there's a better way.
  const traverse = (node: Ast, letCtx: string | null = null) => {
    if (node.type === "call") {
      const args = constantArgs(node.args);

      if (node.func === "entity") {
        upsertEntity(args[0]);
        if (letCtx) entityToEntityName[letCtx] = args[0];
      } else if (node.func === "addEventFeature") {
        eventFeatures.add(args[0]);
      } else if (node.func === "addEntityFeature") {
        const entity = upsertEntity(args[0]);
        entity.features.add(args[1]);
      } else if (node.func === "addEventLabel") {
        eventLabels.add(`${args[0]}:${args[1]}`);
      } else if (node.func === "addEntityLabel") {
        const entity = upsertEntity(args[0]);
        entity.labels.add(`${args[1]}:${args[2]}`);
      }
    }

    // bogus traversal case handling

    if (node.type === "include") {
      if (!alreadyIncludedFiles.has(node.filename)) {
        const ast = compiled._wrapped.importer.getReferencedFileAst(
          node,
          node.filename,
          null
        );

        alreadyIncludedFiles.add(node.filename);
        traverse(ast.scriptAst);
      }
    } else if (node.type === "when" || node.type === "script") {
      node.statements.forEach((statement) => {
        traverse(statement);
      });
    } else if (node.type === "expr") {
      traverse(node.expr);
    } else if (node.type === "let") {
      traverse(node.expr, node.feature);
    }
  };

  //

  compiled._wrapped.statements.forEach((statement) => {
    traverse(statement);
  });

  //

  const entitiesWithoutSets = Object.fromEntries(
    Object.entries(entities).map(([key, entity]) => [
      key,
      {
        features: [...entity.features],
        labels: [...entity.labels],
      },
    ])
  );

  return {
    eventLabels: [...eventLabels],
    eventFeatures: [...eventFeatures],
    entities: entitiesWithoutSets,
  };
}
