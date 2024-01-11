import { run } from "json_typegen_wasm";
import { useMemo } from "react";
import { api } from "../../utils/api";

export function useEventTypes(eventTypeIds: string[]) {
  const { data: eventTypes } = api.eventTypes.list.useQuery();

  const eventTypeCode = useMemo(() => {
    if (!eventTypes) return [];

    return eventTypes
      ?.filter((eventType) => eventTypeIds.includes(eventType.id))
      .map((eventType, index) => {
        const typeName = `EventType${index}`;
        return {
          eventTypeName: eventType.type,
          typeName,
          code: run(
            typeName,
            JSON.stringify(eventType.exampleEvent),
            JSON.stringify({
              output_mode: "typescript/typealias",
            })
          ).replace("export type", "type"),
        };
      });
  }, [eventTypes, eventTypeIds]);

  const finalCode = useMemo(() => {
    return eventTypeCode.map(
      (eventType) =>
        `
        {
            type: "${eventType.eventTypeName}";
            data: ${eventType.typeName};
        }
        `
    );
  }, [eventTypeCode]);

  if (!eventTypeCode || !finalCode) {
    return "";
  }

  return `
    ${eventTypeCode.map((code) => code.code).join("\n")}

    type TrenchEvent = {
      id: string;
      timestamp: Date;
    }
    & (${finalCode.join(" | ")});
  `;
}
