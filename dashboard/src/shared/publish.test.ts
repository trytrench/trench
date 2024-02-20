import { FnType, NodeDef, hasFnType } from "event-processing";
import { prune } from "./publish";

const getEntityFeatureNode: NodeDef = {
  id: "node1",
  dependsOn: new Set(),
  fn: {
    type: FnType.GetEntityFeature,
    config: { featureId: "feature1" },
  },
};

const logEntityFeatureNode: NodeDef = {
  id: "node2",
  dependsOn: new Set(["node1"]),
  fn: {
    type: FnType.LogEntityFeature,
    config: { featureId: "feature1" },
  },
};

const cacheEntityFeatureNode: NodeDef = {
  id: "node3",
  dependsOn: new Set(["node1"]),
  fn: {
    type: FnType.CacheEntityFeature,
    config: { featureId: "feature1" },
  },
};

describe("prune function", () => {
  test("should remove unused GetEntityFeature nodes", () => {
    const nodes = [logEntityFeatureNode];

    const prunedNodes = prune(nodes);
    expect(prunedNodes).not.toContainEqual(
      expect.objectContaining({
        id: "node1",
      })
    );
  });

  test("should keep used GetEntityFeature nodes", () => {
    const nodes: NodeDef[] = [getEntityFeatureNode, logEntityFeatureNode];

    const prunedNodes = prune(nodes);
    expect(prunedNodes).toContainEqual(
      expect.objectContaining({
        id: "node1",
      })
    );
  });

  test("should add CacheEntityFeature nodes for used features", () => {
    const nodes: NodeDef[] = [getEntityFeatureNode, logEntityFeatureNode];

    const prunedNodes = prune(nodes);
    expect(prunedNodes).toContainEqual(
      expect.objectContaining({
        fn: expect.objectContaining({
          type: FnType.CacheEntityFeature,
          config: { featureId: "feature1" },
        }),
      })
    );
  });

  test("should remove unused CacheEntityFeature nodes", () => {
    const nodes: NodeDef[] = [cacheEntityFeatureNode];

    const prunedNodes = prune(nodes);
    expect(prunedNodes).not.toContainEqual(
      expect.objectContaining({
        id: "node3",
      })
    );
  });

  test("should not duplicate CacheEntityFeature nodes that are already present", () => {
    const nodes: NodeDef[] = [
      getEntityFeatureNode,
      logEntityFeatureNode,
      cacheEntityFeatureNode,
    ];

    const prunedNodes = prune(nodes);
    const cacheEntityFeatureNodes = prunedNodes.filter(
      (node) =>
        hasFnType(node, FnType.CacheEntityFeature) &&
        node.fn.config.featureId === "feature1"
    );
    expect(cacheEntityFeatureNodes.length).toBe(1);
  });
});
