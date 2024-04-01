import { type Entity, TypeName, type TypedData } from "event-processing";
import { useEntityPageSubject } from "../hooks/useEntityPageSubject";
import { type ReactNode, useCallback, useMemo, useState, useRef } from "react";
import {
  type EntityFilter,
  EntityFilterType,
  EventFilterType,
} from "../shared/validation";
import { api } from "../utils/api";
import * as yaml from "js-yaml";
import { Button } from "./ui/button";
import { handleError } from "../lib/handleError";
import OpenAI from "openai";
import ReactMarkdown from "react-markdown";
import {
  type ChatCompletionChunk,
  type ChatCompletionMessage,
  type ChatCompletionMessageParam,
} from "openai/resources/index.mjs";
import { type FromSchema, type JSONSchema } from "json-schema-to-ts";
import { mapValues } from "lodash";
import { Panel } from "./ui/custom/panel";
import { format } from "date-fns";
import { Stream } from "openai/streaming.mjs";
import { cn } from "../lib/utils";
import { Badge } from "./ui/badge";
import {
  AlertCircleIcon,
  ArrowRight,
  ChevronRight,
  CornerDownLeft,
  ExternalLink,
  Mic,
  Paperclip,
  Search,
} from "lucide-react";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Textarea } from "./ui/textarea";
import { atom, useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import EventsList from "./EventsList";
import { customEncodeURIComponent } from "../lib/uri";
import { Input } from "./ui/input";

const openAiKeyAtom = atomWithStorage("openAiKey", "");

const llmContextAtom = atomWithStorage(
  "llmContext",
  "You are a world-class fraud investigator."
);

function safeParseJSON(str: string): any {
  try {
    return JSON.parse(str);
  } catch (err) {
    return null;
  }
}

type ToolDef<T extends JSONSchema, TProps = FromSchema<T>, TR = any> = {
  id: string;
  name: string;
  description: string;
  parameters: T;
  resolver: (props: TProps) => Promise<TR> | TR;
  renderResult?: (props: { result?: TR; params?: TProps }) => ReactNode;
  renderResultTeaser?: (props: {
    result?: TR;
    params?: Partial<TProps>;
    onClick?: () => void;
    selected?: boolean;
  }) => ReactNode;
};

function createToolDef<T extends JSONSchema, TP = FromSchema<T>, TR = any>(
  def: ToolDef<T, TP, TR>
): ToolDef<T, TP, TR> {
  return def;
}

function useTools() {
  const utils = api.useUtils();

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const entityTypeMap = useMemo(() => {
    return new Map(entityTypes?.map((et) => [et.id, et]) ?? []);
  }, [entityTypes]);
  const renderTypedDataString = useCallback(
    (data: TypedData) => {
      switch (data.schema.type) {
        case TypeName.Entity: {
          const eType =
            entityTypeMap.get(data.value.type as string)?.type ?? "<error>";
          return `[${eType}] ${data.value.id}`;
        }

        default:
          return JSON.stringify(data.value);
      }
    },
    [entityTypeMap]
  );

  const tools: Record<string, ToolDef<any, any, any>> = useMemo(
    () =>
      ({
        highlight_entity_of_interest: createToolDef({
          id: "highlight_entity_of_interest",
          name: "Highlight Entity of Interest",
          description:
            "An entity of interest is any entity worth noting that is not the subject of the investigation",
          parameters: {
            type: "object",
            properties: {
              entityId: {
                type: "string",
                description: "The ID of the entity",
              },
              entityType: {
                type: "string",
                description:
                  'The type of the entity, listed under "Types of entities"',
              },
              reason: {
                type: "string",
                description: "Concise reason for highlighting the entity",
                maxLength: 100,
              },
            },
          },
          resolver: async (props) => {
            const entityTypeId = entityTypes?.find(
              (et) => et.type === props.entityType
            )?.id;

            const response = await utils.lists.getEntitiesList.fetch({
              entityFilters: [
                { type: EntityFilterType.EntityId, data: props.entityId ?? "" },
                {
                  type: EntityFilterType.EntityType,
                  data: entityTypeId ?? "",
                },
              ],
            });

            const nameFeat = response.rows[0]?.features.find(
              (f) =>
                f.result.type === "success" &&
                f.result.data.schema.type === TypeName.Name
            );
            const name =
              nameFeat?.result.type === "success"
                ? nameFeat.result.data.value
                : props.entityId;
            return {
              entity_id: props.entityId,
              entity_type: props.entityType,
              entity_name: name,
            };
          },
          renderResult(props) {
            return (
              <div className="p-8">
                <Panel className="md:p-4">
                  <h3 className="text-lg font-bold">
                    [{props.result?.entity_type}] {props.result?.entity_id}
                  </h3>
                </Panel>
              </div>
            );
          },
          renderResultTeaser(props) {
            return (
              <div
                className="relative flex items-center group"
                // target="_blank"
                // href={`/entity/${customEncodeURIComponent(
                //   props.params?.entityType ?? ""
                // )}/${customEncodeURIComponent(props.params?.entityId ?? "")}`}
              >
                <Alert
                  className={cn({
                    "text-sm px-3 py-2.5 md:px-3 md:py-2.5 cursor-pointer transition bg-amber-50 text-amber-900":
                      true,
                    "border-amber-700": props.selected,
                    "cursor-pointer hover:border-amber-700": !props.selected,
                  })}
                  onClick={props.onClick}
                >
                  <AlertCircleIcon className="h-4 w-4 stroke-amber-700" />
                  <AlertTitle>Entity of Interest</AlertTitle>
                  <AlertDescription>
                    [{props.params?.entityType}] {props.result?.entity_name}
                    <div className="mt-2 text-amber-600 text-xs">
                      {props.params?.reason}
                    </div>
                  </AlertDescription>
                </Alert>
                <ArrowRight
                  size={16}
                  className={cn({
                    "absolute right-2 group-hover:block hidden": true,
                    "text-amber-700": !props.selected,
                    "block text-amber-700": props.selected,
                  })}
                />
              </div>
            );
          },
        }),
        fetch_entity_data: createToolDef({
          id: "fetch_entity_data",
          name: "Fetch Entity Data",
          description: "Fetch entity features from the database",
          parameters: {
            type: "object",
            properties: {
              entityId: {
                type: "string",
                description: "The ID of the entity",
              },
              entityType: {
                type: "string",
                description:
                  'The type of the entity, listed under "Types of entities"',
              },
            },
          },
          resolver: async (props) => {
            const entityTypeId = entityTypes?.find(
              (et) => et.type === props.entityType
            )?.id;

            const response = await utils.lists.getEntitiesList.fetch({
              entityFilters: [
                { type: EntityFilterType.EntityId, data: props.entityId ?? "" },
                {
                  type: EntityFilterType.EntityType,
                  data: entityTypeId ?? "",
                },
              ],
            });
            const data = response.rows[0];
            return {
              entity_id: data?.entityId,
              entity_type: data?.entityType,
              entity_name: data?.entityName,
              features: data?.features.map(
                (f) =>
                  `${f.featureName}: ${
                    f.result.type === "success"
                      ? renderTypedDataString(f.result.data)
                      : null
                  }`
              ),
            };
          },
          renderResult(props) {
            const { result } = props;

            const entityTypeName = entityTypeMap.get(result?.entity_type)?.type;

            return (
              <div className="p-8">
                <Panel className="md:p-4">
                  <h3 className="text-lg font-bold">
                    [{entityTypeName}] {props.result?.entity_name}
                  </h3>

                  <h4 className="font-bold mt-4">Features</h4>
                  <ul>
                    {result?.features?.map((f, i) => <li key={i}>- {f}</li>)}
                  </ul>
                </Panel>
              </div>
              // <Panel className="p-4">
              //   <h3>Fetch Data:</h3>
              //   <p>
              //     {result?.entity_id} ({result?.entity_type}):{" "}
              //     {result?.entity_name}
              //   </p>
              //   <h4>Features</h4>
              //   <ul>{result?.features?.map((f, i) => <li key={i}>{f}</li>)}</ul>
              // </Panel>
            );
          },
          renderResultTeaser(props) {
            const entName = props.result?.entity_name ?? props.params?.entityId;
            return (
              <div className="relative flex items-center group">
                <Alert
                  className={cn({
                    "text-sm px-3 py-2.5 md:px-3 md:py-2.5 cursor-pointer transition bg-blue-50 text-blue-900":
                      true,
                    "border-blue-700": props.selected,
                    "cursor-pointer hover:border-blue-700": !props.selected,
                  })}
                  onClick={props.onClick}
                >
                  <Search className="h-4 w-4 stroke-blue-700" />
                  <AlertTitle>Look up entity</AlertTitle>
                  <AlertDescription>
                    [{props.params?.entityType}] {entName}
                  </AlertDescription>
                </Alert>
                <ArrowRight
                  size={16}
                  className={cn({
                    "absolute right-2 group-hover:block hidden": true,
                    "text-blue-700": !props.selected,
                    "block text-blue-700": props.selected,
                  })}
                />
              </div>
            );
          },
        }),
        fetch_event_history: createToolDef({
          id: "fetch_event_history",
          name: "Fetch Event History",
          description:
            "Fetch last N <= 20 events for the entity from the database",
          parameters: {
            type: "object",
            properties: {
              entityId: {
                type: "string",
                description: "The ID of the entity",
              },
              entityType: {
                type: "string",
                description:
                  'The type of the entity, listed under "Types of entities"',
              },
              limit: {
                type: "number",
                description: "The maximum number of events to fetch",
                default: 10,
                maximum: 20,
              },
            },
          },
          resolver: async (props) => {
            const entityTypeId = entityTypes?.find(
              (et) => et.type === props.entityType
            )?.id;

            const response = await utils.lists.getEventsList.fetch({
              eventFilters: [
                {
                  type: EventFilterType.Entities,
                  data: [
                    {
                      id: props.entityId ?? "",
                      type: entityTypeId ?? "",
                    },
                  ],
                },
              ],
              limit: props.limit ?? 10,
            });
            const data = response.rows;
            return data.map((d) => ({
              event_id: d.id,
              event_type: d.timestamp,
              features: d?.features.map(
                (f) =>
                  `${f.featureName}: ${
                    f.result.type === "success"
                      ? renderTypedDataString(f.result.data)
                      : null
                  }`
              ),
            }));
          },
          renderResult(props) {
            const { params } = props;

            const entityTypeId = entityTypes?.find(
              (et) => et.type === params?.entityType
            )?.id;
            return (
              <EventsList
                entity={{
                  id: params?.entityId ?? "",
                  type: entityTypeId ?? "",
                }}
                defaultLimit={params?.limit ?? 10}
              />
            );
          },
          renderResultTeaser(props) {
            return (
              <div className="relative flex items-center group">
                <Alert
                  className={cn({
                    "text-sm px-3 py-2.5 md:px-3 md:py-2.5 cursor-pointer transition bg-blue-50 text-blue-900":
                      true,
                    "border-blue-700": props.selected,
                    "cursor-pointer hover:border-blue-700": !props.selected,
                  })}
                  onClick={props.onClick}
                >
                  <Search className="h-4 w-4 stroke-blue-700" />
                  <AlertTitle>Look up event history</AlertTitle>
                  <AlertDescription>
                    [{props.params?.entityType}] {props.params?.entityId}
                  </AlertDescription>
                </Alert>
                <ArrowRight
                  size={16}
                  className={cn({
                    "absolute right-2 group-hover:block hidden": true,
                    "text-blue-700": !props.selected,
                    "block text-blue-700": props.selected,
                  })}
                />
              </div>
            );
          },
        }),
      }) satisfies Record<string, ToolDef<any, any, any>>,
    [
      entityTypeMap,
      entityTypes,
      renderTypedDataString,
      utils.lists.getEntitiesList,
      utils.lists.getEventsList,
    ]
  );

  return tools;
}

function convertToYAML(obj: any): string {
  try {
    return yaml.dump(obj, { indent: 2 });
  } catch (err) {
    console.error("Error converting object to YAML:", err);
    return "";
  }
}

type Delta = OpenAI.Chat.ChatCompletionChunk.Choice.Delta;
function messageReducer(
  previous: ChatCompletionMessageParam,
  item: ChatCompletionChunk
): ChatCompletionMessageParam {
  const reduce = (acc: any, delta: object | any[]) => {
    try {
      acc = { ...acc };
      for (const [key, value] of Object.entries(delta)) {
        if (acc[key] === undefined || acc[key] === null) {
          acc[key] = value;
        } else if (typeof acc[key] === "string" && typeof value === "string") {
          (acc[key] as string) += value;
        } else if (typeof acc[key] === "object") {
          if (!Array.isArray(acc[key])) {
            acc[key] = reduce(acc[key], value as object);
          } else {
            acc[key] = acc[key].map((item: any, i: number) => {
              const val = value.find((v: any) => v.index === i);
              if (!val) return item;

              return reduce(item, val as object);
            });
          }
        }
      }
      return acc;
    } catch (e) {
      console.error(e);
      console.log(acc, delta);
    }
  };

  return reduce(previous, item.choices[0]!.delta) as ChatCompletionMessageParam;
}

const useOpenAIChat = () => {
  const [chatHistory, setChatHistory] = useState<ChatCompletionMessageParam[]>(
    []
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const entity = useEntityPageSubject();
  const prompt = usePrompt(entity);
  const [llmContext] = useAtom(llmContextAtom);
  const [openAiKey] = useAtom(openAiKeyAtom);

  const openai = useMemo(
    () =>
      new OpenAI({
        apiKey: openAiKey,
        dangerouslyAllowBrowser: true,
      }),
    [openAiKey]
  );

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const entityTypeMap = useMemo(() => {
    return new Map(entityTypes?.map((et) => [et.id, et]) ?? []);
  }, [entityTypes]);
  const renderTypedDataString = useCallback(
    (data: TypedData) => {
      switch (data.schema.type) {
        case TypeName.Entity: {
          const eType =
            entityTypeMap.get(data.value.type as string)?.type ?? "<error>";
          return `[${eType}] ${data.value.id}`;
        }

        default:
          return JSON.stringify(data.value);
      }
    },
    [entityTypeMap]
  );

  // const entityTypeNameToId = useMemo(() => {

  //   return new Map(entityTypes?.map((et) => [et.type, et.id]) ?? []);
  // }, [entityTypes]);

  const tools = useTools();

  const stream = useRef<Stream<ChatCompletionChunk> | null>(null);
  const fetchChatResponse = useCallback(
    async (initMsgs: ChatCompletionMessageParam[]) => {
      console.log("Fetch chat response called...");
      setLoading(true);
      setError(null);
      stream.current?.controller.abort();

      let msgs: ChatCompletionMessageParam[] = [];

      const updateMsgs = (
        newMsgs: ChatCompletionMessageParam[],
        skipStateUpdate?: boolean
      ) => {
        msgs = newMsgs;
        if (!skipStateUpdate) {
          setChatHistory([...msgs]);
        }
      };

      updateMsgs(initMsgs);

      try {
        stream.current = await openai.chat.completions.create({
          stream: true,
          tools: Object.values(tools).map((tool) => ({
            type: "function",
            function: {
              name: tool.id,
              description: tool.description,
              parameters: tool.parameters,
            },
          })),
          messages: [
            {
              role: "system",
              content: llmContext,
            },
            {
              role: "system",
              content: prompt,
            },
            ...msgs,
          ],
          model: "gpt-4-turbo-preview",
        });

        let isFirstChunk = true;
        for await (const chunk of stream.current) {
          if (isFirstChunk) {
            isFirstChunk = false;
            updateMsgs([
              ...msgs,
              messageReducer({} as ChatCompletionMessage, chunk),
            ]);
          } else {
            updateMsgs(
              msgs.map((msg, i) => {
                if (i === msgs.length - 1) {
                  const newMsg = messageReducer(msg, chunk);
                  console.log("NEW MSG", newMsg);
                  return newMsg;
                } else {
                  return msg;
                }
              })
            );
          }
        }

        const lastMsg = msgs[msgs.length - 1]! as ChatCompletionMessage;

        const toolCalls = lastMsg.tool_calls;
        if (toolCalls && toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            try {
              const functionName = toolCall.function.name;

              const tool = tools[functionName];

              if (!tool) {
                throw new Error(`Tool ${functionName} not found`);
              }

              const functionArgs = JSON.parse(toolCall.function.arguments);
              const functionResponse = await tool.resolver(functionArgs);
              updateMsgs([
                ...msgs,
                {
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(functionResponse),
                },
              ]);
            } catch (error: any) {
              console.error("Failed to execute tool function:", error);
              setError("Failed to execute tool function");
              updateMsgs([
                ...msgs,
                {
                  role: "tool",
                  tool_call_id: toolCall.id,
                  content: `Error: ${error.message}`,
                },
              ]);
            }
          }

          fetchChatResponse(msgs).catch(handleError);
        }
      } catch (error) {
        console.error("Failed to fetch chat response:", error);
        setError("Failed to fetch chat response");
      } finally {
        setLoading(false);
      }
    },
    [llmContext, prompt, tools]
  );

  const addChatMessage = useCallback(
    (content: string) => {
      fetchChatResponse([
        ...chatHistory,
        {
          role: "user",
          content,
        },
      ]).catch(handleError);
    },
    [chatHistory, fetchChatResponse]
  );

  return { chatHistory, loading, error, addChatMessage };
};

interface PromptProps {
  entityTypes: string[];
  entityData: {
    type: string;
    name: string;
    id: string;
    features: string[];
  };
}
const createPrompt = (props: PromptProps) =>
  `
## Context

### Types of entities

${convertToYAML(props.entityTypes)}

## Subject Entity Data

${convertToYAML(props.entityData)}

## Your Task

Use the tools to dig deeper and investigate if the entity is involved in any fraudulent activities. Highlight any entities of interest using the highlight tool.
`.trim();

function usePrompt(entity: Entity | null) {
  const filters = useMemo(() => {
    const arr: EntityFilter[] = [];
    if (!entity) return arr;
    if (entity.id) {
      arr.push({ type: EntityFilterType.EntityId, data: entity.id });
    }
    if (entity.type) {
      arr.push({ type: EntityFilterType.EntityType, data: entity.type });
    }
    return arr;
  }, [entity]);

  const { data: entityDataRows } = api.lists.getEntitiesList.useQuery(
    { entityFilters: filters },
    { enabled: !!entity }
  );

  const entityData = useMemo(() => entityDataRows?.rows[0], [entityDataRows]);

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const entityTypeMap = useMemo(() => {
    return new Map(entityTypes?.map((et) => [et.id, et]) ?? []);
  }, [entityTypes]);

  const renderTypedDataString = useCallback(
    (data: TypedData) => {
      switch (data.schema.type) {
        case TypeName.Entity: {
          const eType =
            entityTypeMap.get(data.value.type as string)?.type ?? "<error>";
          return `[${eType}] ${data.value.id}`;
        }

        default:
          return JSON.stringify(data.value);
      }
    },
    [entityTypeMap]
  );

  return createPrompt({
    entityTypes: entityTypes?.map((et) => `${et.type}`) ?? [],

    entityData: {
      type: entityTypeMap.get(entityData?.entityType ?? "")?.type ?? "<error>",
      name: entityData?.entityName ?? "<error>",
      id: entityData?.entityId ?? "<error>",
      features:
        entityData?.features.map(
          (f) =>
            `${f.featureName}: ${
              f.result.type === "success"
                ? renderTypedDataString(f.result.data)
                : "<null>"
            }`
        ) ?? [],
    },
  });
}

export function Analysis() {
  const { chatHistory, loading, error, addChatMessage } = useOpenAIChat();

  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(
    null
  );

  const tools = useTools();
  const renderedSelectedToolOutput = useMemo(() => {
    const allToolCalls = chatHistory
      .flatMap((msg) => (msg.role === "assistant" ? msg.tool_calls ?? [] : []))
      .filter((v) => !!v);
    const toolCall = allToolCalls.find((tc) => tc.id === selectedToolCallId);
    const toolDef = tools[toolCall?.function.name ?? ""] ?? null;

    const toolCallResult = chatHistory.find(
      (msg) => msg.role === "tool" && msg.tool_call_id === selectedToolCallId
    );

    if (!toolDef || !toolCallResult) {
      return null;
    }

    return toolDef.renderResult?.({
      result: JSON.parse((toolCallResult.content as string) ?? "{}"),
      params: JSON.parse(toolCall?.function.arguments ?? "{}"),
    });
  }, [chatHistory, selectedToolCallId, tools]);

  const [newMsg, setNewMsg] = useState<string>("");

  const subjectEntity = useEntityPageSubject();
  const prompt = usePrompt(subjectEntity);
  const [llmContext, setLlmContext] = useAtom(llmContextAtom);

  const [openAiKey, setOpenAiKey] = useAtom(openAiKeyAtom);
  return (
    <div className="px-8 flex h-full">
      <div className="flex-1 max-w-xl h-full overflow-y-scroll pt-8 pr-4">
        {/* <Button
          onClick={() => {
            resetChatMessage("user", prompt);
          }}
        >
          Submit
        </Button> */}

        <div className="text-xs flex flex-col-reverse gap-8">
          <div className="sticky bottom-0 pb-8 pt-px bg-white z-10">
            <div className="overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring">
              <Label htmlFor="message" className="sr-only">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Type your message here..."
                className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
              />
              <div className="flex items-center p-3 pt-0">
                <Button
                  type="submit"
                  size="sm"
                  className="ml-auto gap-1.5"
                  disabled={!newMsg || !openAiKey}
                  onClick={() => {
                    addChatMessage(newMsg);
                    setNewMsg("");
                  }}
                >
                  Send Message
                  <CornerDownLeft className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {chatHistory
            .filter((c) => c.role !== "tool" && c.role !== "system")
            .reverse()
            .map((msg, i) => {
              let content: ReactNode = null;
              switch (msg.role) {
                case "user":
                  content = (
                    <div>
                      {typeof msg.content === "string" ? (
                        <ReactMarkdown className="prose prose-sm">
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        JSON.stringify(msg.content, null, 2)
                      )}
                    </div>
                  );
                  break;
                case "system":
                  content = (
                    <div>
                      {typeof msg.content === "string" ? (
                        <ReactMarkdown className="prose prose-sm">
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        JSON.stringify(msg.content, null, 2)
                      )}
                    </div>
                  );
                  break;
                case "assistant":
                  content = (
                    <div>
                      {msg.tool_calls
                        ?.filter((tc) => !!tc)
                        .map((tc, i) => {
                          const toolDef: ToolDef<any> | undefined =
                            tools[tc.function.name ?? ""];
                          if (toolDef?.renderResultTeaser) {
                            const result = chatHistory.find(
                              (msg) =>
                                msg.role === "tool" &&
                                msg.tool_call_id === tc.id
                            )?.content;
                            return toolDef.renderResultTeaser({
                              result:
                                safeParseJSON(
                                  typeof result === "string" ? result : "null"
                                ) ?? undefined,
                              params:
                                safeParseJSON(tc.function.arguments ?? "{}") ??
                                undefined,
                              onClick() {
                                setSelectedToolCallId((prev) => {
                                  return prev === tc.id ? null : tc.id;
                                });
                              },
                              selected: tc.id === selectedToolCallId,
                            });
                          }
                          return (
                            <div key={i}>
                              <div>
                                <span className="text-purple-600">
                                  {tc.function.name}
                                </span>
                              </div>
                              <div>
                                {toolDef?.description ??
                                  "No description available"}
                              </div>
                            </div>
                          );
                        })}
                      {typeof msg.content === "string" && (
                        <ReactMarkdown className="prose prose-sm">
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  );
                  break;
                // case "tool":
                //   content = (
                //     <button
                //       className="whitespace-pre-wrap"
                //       onClick={() => {
                //         setSelectedToolCallId(msg.tool_call_id);
                //       }}
                //     >
                //       <span className="text-purple-600">{msg.tool_call_id}</span>{" "}
                //     </button>
                //   );
                //   break;
              }

              return (
                <div key={i} className="">
                  <div className="mb-1">{msg.role.toLocaleUpperCase()}</div>
                  {content}
                </div>
              );
            })}

          <Accordion type="multiple">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="flex gap-2 items-baseline">
                  API Key (OpenAI){" "}
                  {!openAiKey && (
                    <div className="rounded-full bg-red-500 h-1.5 w-1.5 shrink-0"></div>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Input
                  className="w-full"
                  value={openAiKey}
                  onChange={(e) => setOpenAiKey(e.target.value)}
                />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Context</AccordionTrigger>
              <AccordionContent>
                <Textarea
                  className="w-full"
                  value={llmContext}
                  onChange={(e) => setLlmContext(e.target.value)}
                />
                <Panel className="md:px-3 md:py-2.5 mt-2 max-h-96 overflow-y-auto">
                  <ReactMarkdown className="prose prose-sm">
                    {prompt}
                  </ReactMarkdown>
                </Panel>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
      {/* <div className="flex-1 overflow-auto font-mono whitespace-pre-wrap text-xs">
        {convertToYAML(chatHistory)}
      </div> */}
      <div className="flex-1 overflow-y-auto">{renderedSelectedToolOutput}</div>
    </div>
  );
}
