import { ZodType, z } from "zod";
import { DataType } from "../dataTypes";
import { NodeDef, NodeTypeDef, Resolver } from "./nodeTypeDef";
import { NodeType } from "./types/_enum";

// NodeTypeDefBuilder interface
export interface NodeTypeDefBuilder<
  TNodeType extends NodeType = any,
  TDataType extends DataType = any,
  TConfigSchema extends ZodType = any,
  TContext = unknown,
> {
  _partialDef: Partial<
    NodeTypeDef<TNodeType, TDataType, TConfigSchema, TContext>
  >;
  setNodeType<TNT extends NodeType>(
    nodeType: TNT
  ): NodeTypeDefBuilder<TNT, TDataType, TConfigSchema, TContext>;
  setConfigSchema<TCS extends ZodType<any, any>>(
    configSchema: TCS
  ): NodeTypeDefBuilder<TNodeType, TDataType, TCS, TContext>;
  setAllowedDataTypes<TDT extends DataType>(
    allowedDataTypes: TDT[]
  ): NodeTypeDefBuilder<TNodeType, TDT, TConfigSchema, TContext>;
  setCreateResolver<
    TCR extends (options: {
      nodeDef: NodeDef<TNodeType, TDataType, z.infer<TConfigSchema>>;
      context: TContext;
    }) => Resolver<TDataType>,
  >(
    createResolver: TCR
  ): NodeTypeDefBuilder<TNodeType, TDataType, TConfigSchema, TContext>;
  setContextType<TCtx>(): NodeTypeDefBuilder<
    TNodeType,
    TDataType,
    TConfigSchema,
    TCtx
  >;
  build(): NodeTypeDef<TNodeType, TDataType, TConfigSchema, TContext>;
}

// createNodeTypeDefBuilder function
export function createNodeTypeDefBuilder<
  TNodeType extends NodeType = any,
  TDataType extends DataType = any,
  TConfigSchema extends ZodType = any,
  TContext = unknown,
>(
  def?: Partial<NodeTypeDef>
): NodeTypeDefBuilder<TNodeType, TDataType, TConfigSchema, TContext> {
  const partialDef = def || {};

  return {
    _partialDef: partialDef,
    setNodeType(nodeType) {
      return createNewNodeTypeDefBuilder(partialDef, { nodeType });
    },
    setConfigSchema(configSchema) {
      return createNewNodeTypeDefBuilder(partialDef, { configSchema });
    },
    setAllowedDataTypes(allowedDataTypes) {
      return createNewNodeTypeDefBuilder(partialDef, { allowedDataTypes });
    },
    setContextType<TC>() {
      return createNewNodeTypeDefBuilder<
        TNodeType,
        TDataType,
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
        !partialDef.allowedDataTypes ||
        !partialDef.createResolver
      ) {
        throw new Error("Missing required properties to build NodeTypeDef");
      }
      return partialDef as NodeTypeDef<
        TNodeType,
        TDataType,
        TConfigSchema,
        TContext
      >;
    },
  };
}

// createNewNodeTypeDefBuilder function
function createNewNodeTypeDefBuilder<
  TNodeType extends NodeType,
  TDataType extends DataType,
  TConfigSchema extends ZodType,
  TContext = unknown,
>(
  prevDef: Partial<NodeTypeDef<any, any, any, any>>,
  newDef: Partial<NodeTypeDef<TNodeType, TDataType, TConfigSchema, TContext>>
): NodeTypeDefBuilder<TNodeType, TDataType, TConfigSchema, TContext> {
  return createNodeTypeDefBuilder<
    TNodeType,
    TDataType,
    TConfigSchema,
    TContext
  >({
    ...prevDef,
    ...newDef,
  } as any);
}
