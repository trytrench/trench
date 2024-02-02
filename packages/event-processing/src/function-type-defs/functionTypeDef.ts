import { AnyZodObject, ZodObject, z } from "zod";
import { FnType } from "./types/_enum";
import { InferSchemaType, TSchema, TypeName, tSchemaZod } from "../data-types";
import { StoreRow } from "./lib/store";
import { DataPath, DataPathInfoGetter } from "../data-path";
import { FnTypeDefsMap } from ".";

export type FnDef<
  TFnType extends FnType = FnType,
  TReturnSchema extends TSchema = FnTypeDefsMap[TFnType] extends FnTypeDef<
    any,
    infer ReturnSchema,
    any,
    any
  >
    ? ReturnSchema
    : TSchema,
  TConfig = FnTypeDefsMap[TFnType]["configSchema"]["_input"],
> = {
  id: string;
  type: TFnType;
  name: string;
  returnSchema: TReturnSchema;
  config: TConfig;
};

export type FnDefAny = FnDef<FnType, TSchema, any>;

export const fnDefSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(FnType),
  name: z.string(),
  returnSchema: tSchemaZod,
  config: z.record(z.any()),
});

export type TrenchEvent = {
  id: string;
  type: string;
  timestamp: Date;
  data: object;
};

export type StateUpdater = () => Promise<void>;

export type Resolver<TReturn extends TSchema = TSchema> = (input: {
  event: TrenchEvent;
  engineId: string;
  getDependency<TR extends TSchema>(props: {
    dataPath: DataPath;
    expectedSchema?: TR;
  }): Promise<InferSchemaType<TR>>;
}) => Promise<{
  stateUpdaters?: readonly StateUpdater[];
  savedStoreRows?: StoreRow[];
  data: InferSchemaType<TReturn>;
}>;

export type FnTypeDef<
  TFnType extends FnType = any,
  TReturn extends TSchema = any,
  TConfigSchema extends AnyZodObject = ZodObject<{}>,
  TInputSchema extends AnyZodObject = ZodObject<{}>,
  TContext = any,
> = {
  fnType: TFnType;
  configSchema: TConfigSchema;
  inputSchema: TInputSchema;
  createResolver: (options: {
    fnDef: FnDef<TFnType, TReturn, z.infer<TConfigSchema>>;
    input: z.infer<TInputSchema>;
    context: TContext;
  }) => Resolver<TReturn>;
  getDataPaths: (inputs: z.infer<TInputSchema>) => DataPath[];
  validateInputs: (options: {
    inputs: z.infer<TInputSchema>;
    config: z.infer<TConfigSchema>;
    getDataPathInfo: DataPathInfoGetter;
  }) => boolean;
};
