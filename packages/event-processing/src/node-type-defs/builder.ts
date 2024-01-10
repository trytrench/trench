import { ZodType, z } from "zod";
import { NodeDef, NodeTypeDef, Resolver } from "./nodeTypeDef";
import { NodeType } from "./types/_enum";
import { TSchema } from "../data-types";

// NodeTypeDefBuilder interface
export interface NodeTypeDefBuilder<
  TNodeType extends NodeType = any,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends ZodType = any,
  TContext = unknown,
> {
  _partialDef: Partial<
    NodeTypeDef<TNodeType, TReturnSchema, TConfigSchema, TContext>
  >;
  setNodeType<TNT extends NodeType>(
    nodeType: TNT
  ): NodeTypeDefBuilder<TNT, TReturnSchema, TConfigSchema, TContext>;
  setConfigSchema<TCS extends ZodType<any, any>>(
    configSchema: TCS
  ): NodeTypeDefBuilder<TNodeType, TReturnSchema, TCS, TContext>;
  setReturnSchema<TRS extends TSchema>(
    returnSchema: TRS
  ): NodeTypeDefBuilder<TNodeType, TRS, TConfigSchema, TContext>;
  setGetDependencies(
    getDependencies: (config: z.infer<TConfigSchema>) => Set<string>
  ): NodeTypeDefBuilder<TNodeType, TReturnSchema, TConfigSchema, TContext>;
  setCreateResolver<
    TCR extends (options: {
      nodeDef: NodeDef<TNodeType, TReturnSchema, z.infer<TConfigSchema>>;
      context: TContext;
    }) => Resolver<TReturnSchema>,
  >(
    createResolver: TCR
  ): NodeTypeDefBuilder<TNodeType, TReturnSchema, TConfigSchema, TContext>;
  setContextType<TCtx>(): NodeTypeDefBuilder<
    TNodeType,
    TReturnSchema,
    TConfigSchema,
    TCtx
  >;
  build(): NodeTypeDef<TNodeType, TReturnSchema, TConfigSchema, TContext>;
}

// createNodeTypeDefBuilder function
export function createNodeTypeDefBuilder<
  TNodeType extends NodeType = any,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends ZodType = any,
  TContext = unknown,
>(
  def?: Partial<NodeTypeDef>
): NodeTypeDefBuilder<TNodeType, TReturnSchema, TConfigSchema, TContext> {
  const partialDef = def || {};

  return {
    _partialDef: partialDef,
    setNodeType(nodeType) {
      return createNewNodeTypeDefBuilder(partialDef, { nodeType });
    },
    setConfigSchema(configSchema) {
      return createNewNodeTypeDefBuilder(partialDef, { configSchema });
    },
    setGetDependencies(getDependencies) {
      return createNewNodeTypeDefBuilder(partialDef, { getDependencies });
    },
    setReturnSchema(returnSchema) {
      return createNewNodeTypeDefBuilder(partialDef, { returnSchema });
    },
    setContextType<TC>() {
      return createNewNodeTypeDefBuilder<
        TNodeType,
        TReturnSchema,
        TConfigSchema,
        TC
      >(partialDef, {});
    },
    setCreateResolver(createResolver) {
      return createNewNodeTypeDefBuilder(partialDef, { createResolver });
    },
    build() {
      if (
        !partialDef.nodeType ||
        !partialDef.configSchema ||
        !partialDef.returnSchema ||
        !partialDef.createResolver
      ) {
        throw new Error("Missing required properties to build NodeTypeDef");
      }
      return partialDef as NodeTypeDef<
        TNodeType,
        TReturnSchema,
        TConfigSchema,
        TContext
      >;
    },
  };
}

// createNewNodeTypeDefBuilder function
function createNewNodeTypeDefBuilder<
  TNodeType extends NodeType,
  TReturnSchema extends TSchema,
  TConfigSchema extends ZodType,
  TContext = unknown,
>(
  prevDef: Partial<NodeTypeDef<any, any, any, any>>,
  newDef: Partial<
    NodeTypeDef<TNodeType, TReturnSchema, TConfigSchema, TContext>
  >
): NodeTypeDefBuilder<TNodeType, TReturnSchema, TConfigSchema, TContext> {
  return createNodeTypeDefBuilder<
    TNodeType,
    TReturnSchema,
    TConfigSchema,
    TContext
  >({
    ...prevDef,
    ...newDef,
  } as any);
}
