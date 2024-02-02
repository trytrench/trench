import { AnyZodObject, ZodNull, ZodObject, ZodUndefined, z } from "zod";
import { FnDef, FnTypeDef, InputValidator, Resolver } from "./functionTypeDef";
import { FnType } from "./types/_enum";
import { TSchema, TypeName } from "../data-types";
import { DataPath, DataPathInfoGetter } from "../data-path";

export interface FnTypeDefBuilder<
  TFnType extends FnType = any,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends AnyZodObject = ZodObject<{}>,
  TInputSchema extends AnyZodObject = ZodObject<{}>,
  TContext = unknown,
> {
  _partialDef: Partial<
    FnTypeDef<TFnType, TReturnSchema, TConfigSchema, TInputSchema, TContext>
  >;
  setFnType<TFT extends FnType>(
    fnType: TFT
  ): FnTypeDefBuilder<
    TFT,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setConfigSchema<TCS extends AnyZodObject>(
    configSchema: TCS
  ): FnTypeDefBuilder<TFnType, TReturnSchema, TCS, TInputSchema, TContext>;
  setInputSchema<TIS extends AnyZodObject>(
    inputSchema: TIS
  ): FnTypeDefBuilder<TFnType, TReturnSchema, TConfigSchema, TIS, TContext>;
  setReturnSchema<T extends TSchema>(): FnTypeDefBuilder<
    TFnType,
    T,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setGetDataPaths(
    getDataPaths: (input: z.infer<TInputSchema>) => Array<DataPath>
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setValidateInputs(
    validateInputs: InputValidator<
      TFnType,
      TReturnSchema,
      TConfigSchema,
      TInputSchema
    >
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setCreateResolver<
    TCR extends (options: {
      fnDef: FnDef<TFnType, TReturnSchema, z.infer<TConfigSchema>>;
      input: z.infer<TInputSchema>;
      context: TContext;
    }) => Resolver<TReturnSchema>,
  >(
    createResolver: TCR
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
  setContextType<TCtx>(): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TCtx
  >;
  build(): FnTypeDef<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >;
}

// createFnTypeDefBuilder function
export function createFnTypeDefBuilder<
  TFnType extends FnType = any,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends AnyZodObject = ZodObject<{}>,
  TInputSchema extends AnyZodObject = ZodObject<{}>,
  TContext = unknown,
>(
  def?: Partial<FnTypeDef>
): FnTypeDefBuilder<
  TFnType,
  TReturnSchema,
  TConfigSchema,
  TInputSchema,
  TContext
> {
  const partialDef = {
    configSchema: z.object({}),
    inputSchema: z.object({}),
    getDataPaths: () => [],
    validateInputs: () => ({ success: true }),
    ...def,
  } satisfies Partial<FnTypeDef>;

  return {
    _partialDef: partialDef as any,
    setFnType(fnType) {
      return createNewFnTypeDefBuilder(partialDef, { fnType });
    },
    setConfigSchema(configSchema) {
      return createNewFnTypeDefBuilder(partialDef, { configSchema });
    },
    setGetDataPaths(getDataPaths) {
      return createNewFnTypeDefBuilder(partialDef, { getDataPaths });
    },
    setValidateInputs(validateInputs) {
      return createNewFnTypeDefBuilder(partialDef, { validateInputs });
    },
    setInputSchema(inputSchema) {
      return createNewFnTypeDefBuilder(partialDef, { inputSchema });
    },
    setReturnSchema() {
      return createNewFnTypeDefBuilder(partialDef, {});
    },
    setContextType<TC>() {
      return createNewFnTypeDefBuilder<
        TFnType,
        TReturnSchema,
        TConfigSchema,
        TInputSchema,
        TC
      >(partialDef, {});
    },
    setCreateResolver(createResolver) {
      return createNewFnTypeDefBuilder(partialDef, { createResolver });
    },
    build() {
      if (
        // These fields have to be set via the builder
        !partialDef.fnType ||
        !partialDef.createResolver
      ) {
        throw new Error("Missing required properties to build FnTypeDef");
      }

      return partialDef as unknown as FnTypeDef<
        TFnType,
        TReturnSchema,
        TConfigSchema,
        TInputSchema,
        TContext
      >;
    },
  };
}

// createNewFnTypeDefBuilder function
function createNewFnTypeDefBuilder<
  TFnType extends FnType,
  TReturnSchema extends TSchema,
  TConfigSchema extends AnyZodObject,
  TInputSchema extends AnyZodObject,
  TContext = unknown,
>(
  prevDef: Partial<FnTypeDef>,
  newDef: Partial<
    FnTypeDef<TFnType, TReturnSchema, TConfigSchema, TInputSchema, TContext>
  >
): FnTypeDefBuilder<
  TFnType,
  TReturnSchema,
  TConfigSchema,
  TInputSchema,
  TContext
> {
  return createFnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext
  >({
    ...prevDef,
    ...newDef,
  } as any);
}
