import { useEffect, useMemo, useState } from "react";
import { api } from "../../utils/api";

export function useEventTypes() {
  const { data: eventTypes } = api.eventTypes.list.useQuery();

  const [eventTypeCode, setEventTypeCode] = useState<
    { eventTypeName: string; typeName: string; code: string }[]
  >([]);

  useEffect(() => {
    const get = async () => {
      const { run } = await import("json_typegen_wasm");

      const eTypeCode =
        eventTypes?.map((eventType, idx) => {
          const typeName = `EventType${idx}`;
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
        }) ?? [];

      setEventTypeCode(eTypeCode);
    };

    void get();
  }, [eventTypes]);

  const finalCode = useMemo(() => {
    return eventTypeCode?.map((eventType) => {
      return `
        {
            type: "${eventType.eventTypeName}";
            data: ${eventType.typeName};
        }
        `;
    });
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
