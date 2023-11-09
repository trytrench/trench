import { compileSqrl, createSqrlInstance } from "sqrl-helpers";
import { walkExpr } from "sqrl/lib/expr/Expr";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const releasesRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.release.findMany({
      include: {
        datasets: true,
      },
    });
  }),
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.release.findUnique({
        where: { id: input.id },
      });
    }),
  create: publicProcedure
    .input(
      z.object({
        description: z.string().optional(),
        version: z.string(),
        code: z.record(z.string()),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { description, version, code } = input;

      const release = await ctx.prisma.release.create({
        data: {
          description,
          version,
          code,
          projectId: input.projectId,
        },
      });

      return release;
    }),
  publish: publicProcedure
    .input(
      z.object({
        description: z.string().optional(),
        version: z.string(),
        code: z.record(z.string()),
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { description, version, code } = input;

      const instance = await createSqrlInstance({
        config: { "state.allow-in-memory": true },
      });

      const { compiled } = await compileSqrl(instance, code);

      const features = Object.keys(compiled.getFeatureDocs()).filter(
        (feature) =>
          !feature.startsWith("Sqrl") &&
          !Object.keys(compiled.getRuleSpecs()).includes(feature)
      );

      const release = await ctx.prisma.release.create({
        data: {
          description,
          version,
          code,
          projectId: input.projectId,
        },
      });

      await ctx.prisma.feature.createMany({
        data: Object.keys(compiled.getRuleSpecs()).map((feature) => ({
          feature,
          isRule: true,
          dataType: "boolean",
          projectId: input.projectId,
        })),
        skipDuplicates: true,
      });

      await ctx.prisma.feature.createMany({
        data: features.map((feature) => ({
          feature,
          isRule: false,
          dataType: "text",
          projectId: input.projectId,
        })),
        skipDuplicates: true,
      });

      const entityTypes: string[] = [];

      for (const expr of compiled.getSlotExprs()) {
        walkExpr(expr, (node) => {
          if (node.type === "call" && node.func === "_entity") {
            if (node.exprs?.find((expr) => expr.exprs)) {
              const entityName = node.exprs?.find(
                (expr) => expr.type === "constant"
              )?.value;
              entityTypes.push(entityName);
            }
          }
        });
      }

      await ctx.prisma.entityType.createMany({
        data: entityTypes.map((type) => ({
          type,
          projectId: input.projectId,
        })),
        skipDuplicates: true,
      });

      const project = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
      });

      await ctx.prisma.dataset.update({
        where: { id: project.prodDatasetId! },
        data: { releaseId: release.id },
      });

      return release;
    }),
});
