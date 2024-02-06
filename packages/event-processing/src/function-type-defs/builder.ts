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
  TCompileContext = unknown,
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
    TContext,
    TCompileContext
  >;
  setConfigSchema<TCS extends AnyZodObject>(
    configSchema: TCS
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TCS,
    TInputSchema,
    TContext,
    TCompileContext
  >;
  setInputSchema<TIS extends AnyZodObject>(
    inputSchema: TIS
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TIS,
    TContext,
    TCompileContext
  >;
  setReturnSchema<T extends TSchema>(): FnTypeDefBuilder<
    TFnType,
    T,
    TConfigSchema,
    TInputSchema,
    TContext,
    TCompileContext
  >;
  setGetDataPaths(
    getDataPaths: (input: z.infer<TInputSchema>) => Array<DataPath>
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext,
    TCompileContext
  >;
  setValidateInputs(
    validateInputs: InputValidator<
      TFnType,
      TReturnSchema,
      TConfigSchema,
      TInputSchema,
      TCompileContext
    >
  ): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext,
    TCompileContext
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
    TContext,
    TCompileContext
  >;
  setContextType<TCtx>(): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TCtx,
    TCompileContext
  >;
  setCompileContextType<TCC>(): FnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext,
    TCC
  >;
  build(): FnTypeDef<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext,
    TCompileContext
  >;
}

// createFnTypeDefBuilder function
export function createFnTypeDefBuilder<
  TFnType extends FnType = any,
  TReturnSchema extends TSchema = TSchema,
  TConfigSchema extends AnyZodObject = ZodObject<{}>,
  TInputSchema extends AnyZodObject = ZodObject<{}>,
  TContext = undefined,
  TCompileContext = undefined,
>(
  def?: Partial<FnTypeDef>
): FnTypeDefBuilder<
  TFnType,
  TReturnSchema,
  TConfigSchema,
  TInputSchema,
  TContext,
  TCompileContext
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
        TC,
        TCompileContext
      >(partialDef, {});
    },
    setCompileContextType<TCC>() {
      return createNewFnTypeDefBuilder<
        TFnType,
        TReturnSchema,
        TConfigSchema,
        TInputSchema,
        TContext,
        TCC
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
  TCompileContext = unknown,
>(
  prevDef: Partial<FnTypeDef>,
  newDef: Partial<
    FnTypeDef<
      TFnType,
      TReturnSchema,
      TConfigSchema,
      TInputSchema,
      TContext,
      TCompileContext
    >
  >
): FnTypeDefBuilder<
  TFnType,
  TReturnSchema,
  TConfigSchema,
  TInputSchema,
  TContext,
  TCompileContext
> {
  return createFnTypeDefBuilder<
    TFnType,
    TReturnSchema,
    TConfigSchema,
    TInputSchema,
    TContext,
    TCompileContext
  >({
    ...prevDef,
    ...newDef,
  } as any);
}
