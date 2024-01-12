import { GlobalStateKey, prisma } from "databases";
import {
  NODE_TYPE_DEFS,
  NodeDefsMap,
  NodeType,
  TypeName,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { featureDefSchema } from "./features";

export const nodeDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.nativeEnum(NodeType),
  eventTypes: z.array(z.string()),
  dependsOn: z.array(z.string()),
  config: z.record(z.any()),
  returnSchema: z.record(z.any()),
});

export const nodeDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.node.findUniqueOrThrow({
        where: {
          id: input.id,
        },
      }) as unknown as NodeDefsMap[keyof NodeDefsMap];
    }),

  list: protectedProcedure
    .input(
      z.object({
        eventTypeId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const nodeDefs = await ctx.prisma.node.findMany({
        where: {
          eventTypes: input.eventTypeId
            ? { has: input.eventTypeId }
            : undefined,
        },
      });

      return nodeDefs.map(
        (nodeDef) => nodeDef as unknown as NodeDefsMap[keyof NodeDefsMap]
      );
    }),

  createUniqueCount: protectedProcedure
    .input(
      z.object({
        nodeDef: nodeDefSchema.omit({ id: true, dependsOn: true }),
        assignedToFeatures: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        countByFeatureDeps: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        countUniqueFeatureDeps: z.array(
          z.object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
        ),
        countByNodeDeps: z.array(nodeDefSchema),
        countUniqueNodeDeps: z.array(nodeDefSchema),
        conditionFeatureDep: z
          .object({
            feature: featureDefSchema,
            node: nodeDefSchema,
          })
          .optional(),
        conditionNodeDep: nodeDefSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { configSchema } = NODE_TYPE_DEFS[input.nodeDef.type];
      configSchema.parse(input.nodeDef.config);

      if (input.conditionFeatureDep && input.conditionNodeDep) {
        throw new Error(
          "Cannot have both a condition feature and a condition node"
        );
      }

      let conditionNodeId = input.conditionNodeDep?.id;
      if (input.conditionFeatureDep) {
        const conditionNode = await ctx.prisma.node.create({
          data: {
            name: input.conditionFeatureDep.feature.name,
            type: NodeType.GetEntityFeature,
            dependsOn: [],
            eventTypes: input.nodeDef.eventTypes,
            returnSchema: input.conditionFeatureDep.feature.schema as object,
            config: {
              featureId: input.conditionFeatureDep.feature.id,
              entityAppearanceNodeId: input.conditionFeatureDep.node.id,
            } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
          },
        });
        conditionNodeId = conditionNode.id;
      }
      // Create feature getter nodes
      const countByFeatureDeps = await Promise.all(
        input.countByFeatureDeps.map(({ node, feature }) =>
          ctx.prisma.node.create({
            data: {
              name: `${node.name}.${feature.name}`,
              type: NodeType.GetEntityFeature,
              dependsOn: [],
              // Make sure frontend passes this
              eventTypes: input.nodeDef.eventTypes,
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
        input.countByFeatureDeps.map(({ node, feature }) =>
          ctx.prisma.node.create({
            data: {
              name: `${node.name}.${feature.name}`,
              type: NodeType.GetEntityFeature,
              dependsOn: [],
              // Make sure frontend passes this
              eventTypes: input.nodeDef.eventTypes,
              returnSchema: feature.schema as object,
              config: {
                featureId: feature.id,
                entityAppearanceNodeId: node.id,
              } as NodeDefsMap[NodeType.GetEntityFeature]["config"],
            },
          })
        )
      );

      const nodeDef = await ctx.prisma.node.create({
        data: {
          name: input.nodeDef.name,
          type: NodeType.UniqueCounter,
          dependsOn: [
            ...countByFeatureDeps.map((node) => node.id),
            ...countUniqueFeatureDeps.map((node) => node.id),
            ...input.countByNodeDeps.map((node) => node.id),
            ...input.countUniqueNodeDeps.map((node) => node.id),
            ...(conditionNodeId ? [conditionNodeId] : []),
          ],
          eventTypes: input.nodeDef.eventTypes,
          returnSchema: {
            type: TypeName.Int64,
          } as NodeDefsMap[NodeType.UniqueCounter]["returnSchema"] as object,
          config: {
            timeWindowMs: input.nodeDef.config.timeWindowMs,
            countByNodeIds: [
              ...input.countByNodeDeps.map((node) => node.id),
              ...countByFeatureDeps.map((node) => node.id),
            ],
            countUniqueNodeIds: [
              ...input.countUniqueNodeDeps.map((node) => node.id),
              ...countUniqueFeatureDeps.map((node) => node.id),
            ],
            conditionNodeId,
            // TODO: Oh shit
            counterId: (Math.random() * 10000).toString(),
          } as NodeDefsMap[NodeType.UniqueCounter]["config"],
        },
      });

      await Promise.all(
        input.assignedToFeatures.map(({ feature, node }) =>
          ctx.prisma.node.create({
            data: {
              name: feature.name,
              type: NodeType.LogEntityFeature,
              dependsOn: [nodeDef.id],
              eventTypes: input.nodeDef.eventTypes,
              returnSchema: {},
              config: {
                featureId: feature.id,
                featureSchema: feature.schema,
                entityAppearanceNodeId: node.id,
                valueAccessor: {
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
        assignedToFeatures: z.array(
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
      const { configSchema } = NODE_TYPE_DEFS[input.nodeDef.type];
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
              eventTypes: input.nodeDef.eventTypes,
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

      const nodeDef = await ctx.prisma.node.create({
        data: {
          name: input.nodeDef.name,
          type: NodeType.Computed,
          dependsOn: [
            ...featureDeps.map((node) => node.id),
            ...input.nodeDeps.map((node) => node.id),
          ],
          eventTypes: input.nodeDef.eventTypes,
          returnSchema: input.nodeDef.returnSchema,
          config: {
            ...input.nodeDef.config,
            depsMap: { ...nodeDepsMap, ...featureDepsMap },
          } as NodeDefsMap[NodeType.Computed]["config"],
        },
      });

      // Create feature setter nodes
      await Promise.all(
        input.assignedToFeatures.map(({ feature, node }) =>
          ctx.prisma.node.create({
            data: {
              name: feature.name,
              type: NodeType.LogEntityFeature,
              dependsOn: [nodeDef.id],
              eventTypes: input.nodeDef.eventTypes,
              returnSchema: {},
              config: {
                featureId: feature.id,
                featureSchema: feature.schema,
                entityAppearanceNodeId: node.id,
                valueAccessor: {
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

  create: protectedProcedure
    .input(nodeDefSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const { configSchema } = NODE_TYPE_DEFS[input.type];
      configSchema.parse(input.config);

      const nodeDef = await ctx.prisma.node.create({ data: input });

      await publish();

      return nodeDef;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        eventTypes: z.array(z.string()).optional(),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
      });

      const { configSchema } = NODE_TYPE_DEFS[nodeDef.type as NodeType];
      configSchema.parse(input.config);

      return ctx.prisma.node.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          dependsOn: input.dependsOn,
          config: input.config,
          eventTypes: input.eventTypes,
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
  const nodeDefs = await prisma.node.findMany();

  const engine = await prisma.executionEngine.create({
    data: {
      nodes: {
        createMany: {
          data: nodeDefs.map((nodeDef) => ({
            nodeId: nodeDef.id,
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
    update: {
      value: engine.id,
    },
  });
};
