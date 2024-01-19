import { GlobalStateKey, prisma } from "databases";
import { add } from "date-fns";
import {
  NODE_TYPE_REGISTRY,
  NodeDef,
  NodeDefsMap,
  NodeType,
  NodeTypeDef,
  TSchema,
  TypeName,
  getNodeDefSchema,
  tSchemaZod,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eventFeatureDefSchema, featureDefSchema } from "./features";

export const nodeDefSchema = getNodeDefSchema(z.any());

const countConfigSchema = z.object({
  countByFeatureDeps: z.array(
    z.object({
      feature: featureDefSchema,
      node: nodeDefSchema,
    })
  ),
  countByNodeDeps: z.array(nodeDefSchema),
  conditionFeatureDep: z
    .object({
      feature: featureDefSchema,
      node: nodeDefSchema,
    })
    .nullable(),
  conditionNodeDep: nodeDefSchema.nullable(),
  timeWindow: z.object({
    value: z.number(),
    unit: z.enum(["minutes", "hours", "days", "weeks", "months"]),
  }),
});

const countUniqueConfigSchema = countConfigSchema.extend({
  countUniqueFeatureDeps: z.array(
    z.object({
      feature: featureDefSchema,
      node: nodeDefSchema,
    })
  ),
  countUniqueNodeDeps: z.array(nodeDefSchema),
});

export const nodeDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
        include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      const snapshot = nodeDef.snapshots[0]!;
      const ret: NodeDefsMap[keyof NodeDefsMap] = {
        id: nodeDef.id,
        name: nodeDef.name,
        eventType: nodeDef.eventType,
        config: snapshot.config as unknown as any,
        type: nodeDef.type as unknown as any,
        dependsOn: new Set(snapshot.dependsOn),
        returnSchema: snapshot as unknown as TSchema,
      };
      return ret;
    }),

  list: protectedProcedure
    .input(
      z
        .object({
          eventType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const nodes = await ctx.prisma.node.findMany({
        where: {
          eventType: input?.eventType,
        },
        include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      return nodes.map((nodeDef) => {
        const snapshot = nodeDef.snapshots[0]!;
        const ret: NodeDefsMap[NodeType] = {
          id: nodeDef.id,
          name: nodeDef.name,
          eventType: nodeDef.eventType,
          config: snapshot.config as unknown as any,
          type: nodeDef.type as unknown as any,
          dependsOn: new Set(snapshot.dependsOn),
          returnSchema: snapshot.returnSchema as unknown as TSchema,
        };
        return ret;
      }) as NodeDefsMap[NodeType][];
    }),

  create: protectedProcedure
    .input(nodeDefSchema.omit({ id: true, dependsOn: true }))
    .mutation(async ({ ctx, input }) => {
      const { configSchema, getDependencies } = NODE_TYPE_REGISTRY[input.type];
      configSchema.parse(input.config);
      const dependsOn = getDependencies(input.config);

      const nodeDef = await ctx.prisma.node.create({
        data: {
          name: input.name,
          type: input.type,
          eventType: input.eventType,
          snapshots: {
            create: {
              returnSchema: input.returnSchema as unknown as any,
              dependsOn: Array.from(dependsOn),
              config: input.config,
            },
          },
        },
        include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
      });

      await publish();

      const snapshot = nodeDef.snapshots[0]!;
      const ret: NodeDefsMap[keyof NodeDefsMap] = {
        id: nodeDef.id,
        name: nodeDef.name,
        eventType: nodeDef.eventType,
        config: snapshot.config as unknown as any,
        type: nodeDef.type as unknown as any,
        dependsOn: new Set(snapshot.dependsOn),
        returnSchema: snapshot.returnSchema as unknown as TSchema,
      };
      return ret;
    }),

  update: protectedProcedure
    .input(
      nodeDefSchema.omit({
        dependsOn: true,
        returnSchema: true,
        eventType: true,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
        include: {
          snapshots: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      const { configSchema, getDependencies } =
        NODE_TYPE_REGISTRY[nodeDef.type as NodeType];
      configSchema.parse(input.config);
      const dependsOn = getDependencies(input.config);

      const snapshotKeys = ["config"];
      const shouldCreateSnapshot = Object.keys(input).some((key) =>
        snapshotKeys.includes(key)
      );

      const snapshot = nodeDef.snapshots[0]!;

      const updatedNodeDef = await ctx.prisma.node.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          snapshots: shouldCreateSnapshot
            ? {
                create: {
                  returnSchema: snapshot.returnSchema as unknown as any,
                  dependsOn: Array.from(dependsOn),
                  config: input.config,
                },
              }
            : undefined,
        },
        include: {
          snapshots: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      });

      const updatedSnapshot = updatedNodeDef.snapshots[0]!;
      const ret: NodeDefsMap[keyof NodeDefsMap] = {
        id: updatedNodeDef.id,
        name: updatedNodeDef.name,
        eventType: updatedNodeDef.eventType,
        config: updatedSnapshot.config as unknown as any,
        type: updatedNodeDef.type as unknown as any,
        dependsOn: new Set(updatedSnapshot.dependsOn),
        returnSchema: updatedSnapshot.returnSchema as unknown as TSchema,
      };
      return ret;
    }),

  createCount: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        eventType: z.string(),
        assignToFeatures: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        countConfig: countConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { countConfig: count } = input;

      if (count.conditionFeatureDep && count.conditionNodeDep) {
        throw new Error(
          "Cannot have both a condition feature and a condition node"
        );
      }

      let conditionNodeId = count.conditionNodeDep?.id;
      if (count.conditionFeatureDep) {
        const conditionNode = await ctx.prisma.node.create({
          data: {
            name: count.conditionFeatureDep.feature.name,
            type: NodeType.GetEntityFeature,
            dependsOn: [],
            eventType: input.eventType,
            returnSchema: count.conditionFeatureDep.feature.schema as object,
            config: {
              featureId: count.conditionFeatureDep.feature.id,
              entityAppearanceNodeId: count.conditionFeatureDep.node.id,
            } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
          },
        });
        conditionNodeId = conditionNode.id;
      }

      // Create feature getter nodes
      const countByFeatureDeps = await Promise.all(
        count.countByFeatureDeps.map(({ node, feature }) =>
          ctx.prisma.node.create({
            data: {
              name: `${node.name}.${feature.name}`,
              type: NodeType.GetEntityFeature,
              dependsOn: [],
              // Make sure frontend passes this
              eventType: input.eventType,
              returnSchema: feature.schema as object,
              config: {
                featureId: feature.id,
                entityAppearanceNodeId: node.id,
              } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
            },
          })
        )
      );

      // Create count node
      const nodeDef = await ctx.prisma.node.create({
        data: {
          name: input.name,
          type: NodeType.Counter,
          dependsOn: [
            ...countByFeatureDeps.map((node) => node.id),
            ...count.countByNodeDeps.map((node) => node.id),
            ...(conditionNodeId ? [conditionNodeId] : []),
          ],
          eventType: input.eventType,
          returnSchema: {
            type: TypeName.Int64,
          } as NodeDefsMap[NodeType.Counter]["returnSchema"] as object,
          config: {
            timeWindowMs: getTimeWindowMs(count.timeWindow),
            countByNodeIds: [
              ...count.countByNodeDeps.map((node) => node.id),
              ...countByFeatureDeps.map((node) => node.id),
            ],
            conditionNodeId,
            // TODO: Oh shit
            counterId: (Math.random() * 10000).toString(),
          } as NodeDefsMap[NodeType.Counter]["config"],
        },
      });

      await Promise.all(
        input.assignToFeatures.map(({ feature, node }) =>
          ctx.prisma.node.create({
            data: {
              name: feature.name,
              type: NodeType.LogEntityFeature,
              dependsOn: [nodeDef.id],
              eventType: input.eventType,
              returnSchema: { type: TypeName.Any },
              config: {
                featureId: feature.id,
                featureSchema: feature.schema,
                entityAppearanceNodeId: node.id,
                dataPath: {
                  nodeId: nodeDef.id,
                },
              } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
            },
          })
        )
      );

      await publish();

      return nodeDef;
    }),

  createUniqueCount: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        eventType: z.string(),
        assignToFeatures: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        countUniqueConfig: countUniqueConfigSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { countUniqueConfig: countUnique } = input;

      if (countUnique.conditionFeatureDep && countUnique.conditionNodeDep) {
        throw new Error(
          "Cannot have both a condition feature and a condition node"
        );
      }

      let conditionNodeId = countUnique.conditionNodeDep?.id;
      if (countUnique.conditionFeatureDep) {
        const conditionNode = await ctx.prisma.node.create({
          data: {
            name: countUnique.conditionFeatureDep.feature.name,
            type: NodeType.GetEntityFeature,
            dependsOn: [],
            eventType: input.eventType,
            returnSchema: countUnique.conditionFeatureDep.feature
              .schema as object,
            config: {
              featureId: countUnique.conditionFeatureDep.feature.id,
              entityAppearanceNodeId: countUnique.conditionFeatureDep.node.id,
            } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
          },
        });
        conditionNodeId = conditionNode.id;
      }

      // Create feature getter nodes
      const countByFeatureDeps = await Promise.all(
        countUnique.countByFeatureDeps.map(({ node, feature }) =>
          ctx.prisma.node.create({
            data: {
              name: `${node.name}.${feature.name}`,
              type: NodeType.GetEntityFeature,
              dependsOn: [],
              // Make sure frontend passes this
              eventType: input.eventType,
              returnSchema: feature.schema as object,
              config: {
                featureId: feature.id,
                entityAppearanceNodeId: node.id,
              } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
            },
          })
        )
      );

      const countUniqueFeatureDeps = await Promise.all(
        countUnique.countUniqueFeatureDeps.map(({ node, feature }) =>
          ctx.prisma.node.create({
            data: {
              name: `${node.name}.${feature.name}`,
              type: NodeType.GetEntityFeature,
              dependsOn: [],
              // Make sure frontend passes this
              eventType: input.eventType,

              returnSchema: feature.schema as object,
              config: {
                featureId: feature.id,
                entityAppearanceNodeId: node.id,
              } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
            },
          })
        )
      );

      // Create count node
      const nodeDef = await ctx.prisma.node.create({
        data: {
          name: input.name,
          type: NodeType.UniqueCounter,
          dependsOn: [
            ...countByFeatureDeps.map((node) => node.id),
            ...countUniqueFeatureDeps.map((node) => node.id),
            ...countUnique.countByNodeDeps.map((node) => node.id),
            ...countUnique.countUniqueNodeDeps.map((node) => node.id),
            ...(conditionNodeId ? [conditionNodeId] : []),
          ],
          eventType: input.eventType,

          returnSchema: {
            type: TypeName.Int64,
          } as NodeDefsMap[NodeType.UniqueCounter]["returnSchema"] as object,
          config: {
            timeWindowMs: getTimeWindowMs(countUnique.timeWindow),
            countByNodeIds: [
              ...countUnique.countByNodeDeps.map((node) => node.id),
              ...countByFeatureDeps.map((node) => node.id),
            ],
            countUniqueNodeIds: [
              ...countUnique.countUniqueNodeDeps.map((node) => node.id),
              ...countUniqueFeatureDeps.map((node) => node.id),
            ],
            conditionNodeId,
            // TODO: Oh shit
            counterId: (Math.random() * 10000).toString(),
          } as NodeDefsMap[NodeType.UniqueCounter]["config"],
        },
      });

      // Create feature setter nodes
      await Promise.all(
        input.assignToFeatures.map(({ feature, node }) =>
          ctx.prisma.node.create({
            data: {
              name: feature.name,
              type: NodeType.LogEntityFeature,
              dependsOn: [nodeDef.id],
              eventType: input.eventType,

              returnSchema: { type: TypeName.Any },
              config: {
                featureId: feature.id,
                featureSchema: feature.schema,
                entityAppearanceNodeId: node.id,
                dataPath: {
                  nodeId: nodeDef.id,
                },
              } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
            },
          })
        )
      );

      await publish();

      return nodeDef;
    }),

  createComputed: protectedProcedure
    .input(
      z.object({
        nodeDef: nodeDefSchema.omit({ id: true, dependsOn: true }),
        assignToFeatures: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        featureDeps: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        nodeDeps: z.array(nodeDefSchema),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Support multiple layers of dependencies
      // Validation
      const { configSchema } = NODE_TYPE_REGISTRY[input.nodeDef.type];
      configSchema.parse(input.nodeDef.config);

      // Create feature getter nodes
      const featureDeps = await Promise.all(
        input.featureDeps.map(({ node, feature }) =>
          ctx.prisma.node.create({
            data: {
              // We do this so that the dependency can be accessed via "entityNodeName.featureName" in code
              name: `${node.name}.${feature.name}`,
              type: NodeType.GetEntityFeature,
              dependsOn: [],
              // Make sure frontend passes this
              eventType: input.nodeDef.eventType,
              returnSchema: feature.schema as object,
              config: {
                featureId: feature.id,
                entityAppearanceNodeId: node.id,
              } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
            },
          })
        )
      );

      const nodeDepsMap = input.nodeDeps.reduce(
        (acc, node) => {
          acc[node.name] = node.id;
          return acc;
        },
        {} as Record<string, string>
      );

      const featureDepsMap = featureDeps.reduce(
        (acc, node) => {
          acc[node.name] = node.id;
          return acc;
        },
        {} as Record<string, string>
      );

      // Create computed node
      const nodeDef = await ctx.prisma.node.create({
        data: {
          name: input.nodeDef.name,
          type: NodeType.Computed,
          dependsOn: [
            ...featureDeps.map((node) => node.id),
            ...input.nodeDeps.map((node) => node.id),
          ],
          eventType: input.nodeDef.eventType,
          returnSchema: input.nodeDef.returnSchema,
          config: {
            ...input.nodeDef.config,
            depsMap: { ...nodeDepsMap, ...featureDepsMap },
          } as NodeDefsMap[NodeType.Computed]["config"],
        },
      });

      // Create feature setter nodes
      await Promise.all(
        input.assignToFeatures.map(({ feature, node }) =>
          ctx.prisma.node.create({
            data: {
              name: feature.name,
              type: NodeType.LogEntityFeature,
              dependsOn: [nodeDef.id],
              eventType: input.nodeDef.eventType,
              returnSchema: { type: TypeName.Any },
              config: {
                featureId: feature.id,
                featureSchema: feature.schema,
                entityAppearanceNodeId: node.id,
                dataPath: {
                  nodeId: nodeDef.id,
                },
              } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
            },
          })
        )
      );

      await publish();

      return nodeDef;
    }),

  createRule: protectedProcedure
    .input(
      z.object({
        nodeDef: nodeDefSchema.omit({
          id: true,
          dependsOn: true,
          returnSchema: true,
        }),
        assignToFeatures: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        featureDeps: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        nodeDeps: z.array(nodeDefSchema),
        assignToEventFeature: eventFeatureDefSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Support multiple layers of dependencies
      // Validation
      const { configSchema } = NODE_TYPE_REGISTRY[input.nodeDef.type];
      configSchema.parse(input.nodeDef.config);

      // Create feature getter nodes
      const featureDeps = await Promise.all(
        input.featureDeps.map(({ node, feature }) =>
          ctx.prisma.node.create({
            data: {
              // We do this so that the dependency can be accessed via "entityNodeName.featureName" in code
              name: `${node.name}.${feature.name}`,
              type: NodeType.GetEntityFeature,
              dependsOn: [],
              // Make sure frontend passes this
              eventType: input.nodeDef.eventType,
              returnSchema: {
                type: TypeName.Boolean,
              },
              config: {
                featureId: feature.id,
                entityAppearanceNodeId: node.id,
              } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
            },
          })
        )
      );

      const nodeDepsMap = input.nodeDeps.reduce(
        (acc, node) => {
          acc[node.name] = node.id;
          return acc;
        },
        {} as Record<string, string>
      );

      const featureDepsMap = featureDeps.reduce(
        (acc, node) => {
          acc[node.name] = node.id;
          return acc;
        },
        {} as Record<string, string>
      );

      // Create computed node
      const nodeDef = await ctx.prisma.node.create({
        data: {
          name: input.nodeDef.name,
          type: NodeType.Rule,
          dependsOn: [
            ...featureDeps.map((node) => node.id),
            ...input.nodeDeps.map((node) => node.id),
          ],
          eventType: input.nodeDef.eventType,
          returnSchema: {
            type: TypeName.Boolean,
          } as NodeDefsMap[NodeType.Rule]["returnSchema"] as object,
          config: {
            ...input.nodeDef.config,
            depsMap: { ...nodeDepsMap, ...featureDepsMap },
          } as NodeDefsMap[NodeType.Rule]["config"],
        },
      });

      // Create feature setter nodes
      await Promise.all(
        input.assignToFeatures.map(({ feature, node }) =>
          ctx.prisma.node.create({
            data: {
              name: feature.name,
              type: NodeType.LogEntityFeature,
              dependsOn: [nodeDef.id],
              eventTypes: input.nodeDef.eventTypes,
              returnSchema: { type: TypeName.Any },
              config: {
                featureId: feature.id,
                featureSchema: feature.schema,
                entityAppearanceNodeId: node.id,
                dataPath: {
                  nodeId: nodeDef.id,
                },
              } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
            },
          })
        )
      );

      if (input.assignToEventFeature) {
        await ctx.prisma.node.create({
          data: {
            name: input.assignToEventFeature.name,
            type: NodeType.LogEntityFeature,
            dependsOn: [nodeDef.id],
            eventTypes: input.nodeDef.eventTypes,
            returnSchema: { type: TypeName.Any },
            config: {
              featureId: input.assignToEventFeature.id,
              featureSchema: input.assignToEventFeature.schema,
              dataPath: {
                nodeId: nodeDef.id,
              },
            } as NodeDefsMap[NodeType.LogEntityFeature]["config"],
          },
        });
      }

      await publish();

      return nodeDef;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
      });

      const { configSchema } = NODE_TYPE_REGISTRY[nodeDef.type as NodeType];
      configSchema.parse(input.config);

      return ctx.prisma.node.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          dependsOn: input.dependsOn,
          config: input.config,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.delete({
        where: { id: input.id },
      });
    }),
});

const publish = async () => {
  const nodeDefs = await prisma.node.findMany({
    include: { snapshots: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  const engine = await prisma.executionEngine.create({
    data: {
      nodeSnapshots: {
        createMany: {
          data: nodeDefs.map((nodeDef) => ({
            nodeSnapshotId: nodeDef.snapshots[0]!.id,
          })),
        },
      },
    },
  });

  await prisma.globalState.upsert({
    where: {
      key: GlobalStateKey.ActiveEngineId,
    },
    create: {
      key: GlobalStateKey.ActiveEngineId,
      value: engine.id,
    },
    update: { value: engine.id },
  });
};

const getTimeWindowMs = (timeWindow: TimeWindow) => {
  const date = new Date();
  return (
    add(date, {
      [timeWindow.unit]: timeWindow.value,
    }).getTime() - date.getTime()
  );
};
