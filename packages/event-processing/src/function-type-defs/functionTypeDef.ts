import { AnyZodObject, ZodObject, z } from "zod";
import { FnType } from "./types/_enum";
import { InferSchemaType, TSchema, TypeName, tSchemaZod } from "../data-types";
import { StoreRow } from "./lib/store";
import { DataPath } from "../data-path";

export type FnDef<
  TFnType extends FnType = FnType,
  TReturnSchema extends TSchema = TSchema,
  TConfig = any,
> = {
  id: string;
  type: TFnType;
  name: string;
  returnSchema: TReturnSchema;
  config: TConfig;
};

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
  getDependencies: (inputs: z.infer<TInputSchema>) => Set<string>;
};
