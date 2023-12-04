import { ZodType, z } from "zod";
import { DataType } from "..";
import { assert } from "../utils";
import { FeatureDef, FeatureTypeDef, Resolver } from "./featureTypeDef";
import { FeatureType } from "./types/_enum";

interface FeatureTypeDefBuilder<
  TFeatureType extends FeatureType = FeatureType,
  TDataType extends DataType = DataType,
  TConfigSchema extends ZodType = ZodType,
  TContext = any,
> {
  _def: Partial<
    FeatureTypeDef<TFeatureType, TDataType, TConfigSchema, TContext>
  >;
  setConfigSchema<TC extends ZodType>(
    configSchema: TC
  ): FeatureTypeDefBuilder<TFeatureType, TDataType, TC, TContext>;
  setAllowedDataTypes<TDT extends DataType>(
    allowedDataTypes: TDT[]
  ): FeatureTypeDefBuilder<TFeatureType, TDT, TConfigSchema, TContext>;
  setFeatureType<TFT extends FeatureType>(
    featureType: TFT
  ): FeatureTypeDefBuilder<TFT, TDataType, TConfigSchema, TContext>;
  setContext<TC>(
    context: TC
  ): FeatureTypeDefBuilder<TFeatureType, TDataType, TConfigSchema, TC>;
  createResolver(
    createResolver: (options: {
      featureDef: FeatureDef<TFeatureType, TDataType, z.infer<TConfigSchema>>;
      context: TContext;
    }) => Resolver<TDataType>
  ): FeatureTypeDef<TFeatureType, TDataType, TConfigSchema, TContext>;
}

function createNewBuilder<
  TFeatureType extends FeatureType,
  TDataType extends DataType,
  TConfigSchema extends ZodType,
  TContext,
>(
  prevDef: Partial<FeatureTypeDef<any, any, any, any>>,
  newDef: Partial<
    FeatureTypeDef<TFeatureType, TDataType, TConfigSchema, TContext>
  >
): FeatureTypeDefBuilder<TFeatureType, TDataType, TConfigSchema, TContext> {
  return createBuilder({
    ...prevDef,
    ...newDef,
  });
}

function createBuilder<
  TFeatureType extends FeatureType = FeatureType,
  TDataType extends DataType = DataType,
  TConfigSchema extends ZodType = ZodType,
  TContext = any,
>(
  initDef?: Partial<
    FeatureTypeDef<TFeatureType, TDataType, TConfigSchema, TContext>
  >
): FeatureTypeDefBuilder<TFeatureType, TDataType, TConfigSchema, TContext> {
  const _def = {
    ...initDef,
  };
  return {
    _def,
    setConfigSchema<TCS extends ZodType>(configSchema: TCS) {
      return createNewBuilder(_def, {
        configSchema,
      });
    },
    setAllowedDataTypes<TDT extends DataType>(allowedDataTypes: TDT[]) {
      return createNewBuilder(_def, {
        allowedDataTypes,
      });
    },
    setFeatureType<TFT extends FeatureType>(featureType: TFT) {
      return createNewBuilder(_def, {
        featureType,
      });
    },
    setContext<TC>(context: TC) {
      return createNewBuilder(_def, {
        context,
      });
    },
    createResolver(createResolver) {
      assert(_def.featureType, "featureType is required");
      assert(_def.allowedDataTypes, "allowedDataTypes is required");
      assert(_def.allowedDataTypes.length > 0, "allowedDataTypes must be > 0");
      assert(_def.configSchema, "configSchema is required");
      assert(_def.context, "context is required");

      return {
        featureType: _def.featureType,
        allowedDataTypes: _def.allowedDataTypes,
        configSchema: _def.configSchema,
        context: _def.context,
        createResolver,
      };
    },
  };
}

export const builder = createBuilder();
