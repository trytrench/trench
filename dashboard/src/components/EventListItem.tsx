import { Badge, Bold, Text } from "@tremor/react";
import clsx from "clsx";
import { format } from "date-fns";
import { uniqBy } from "lodash";
import { StringParam, useQueryParam } from "use-query-params";
import { api } from "~/utils/api";

function truncateObject(obj, maxLength) {
  let result = {};

  function traverse(o) {
    if (typeof o === "object" && o !== null) {
      let str = JSON.stringify(o);
      return str.length > maxLength ? str.substr(0, maxLength) + "..." : str;
    } else if (typeof o === "string") {
      return o; // return string value without quotes
    } else {
      return String(o); // for other types (number, boolean, etc.), convert to string
    }
  }

  for (const key in obj) {
    if (Object.hasOwnProperty.call(obj, key)) {
      result[key] = traverse(obj[key]);
    }
  }

  return result;
}

type EventCardProps = {
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
  selected?: boolean;
} & React.HTMLAttributes<HTMLButtonElement>;

export function EventListItem({ event, selected, ...rest }: EventCardProps) {
  const [eventType] = useQueryParam("eventType", StringParam);
  const { data: eventLabels } = api.labels.getEventLabels.useQuery({
    eventType: eventType ?? undefined,
  });
  return (
    <button
      className={clsx({
        "px-8 w-full flex items-center text-xs font-mono cursor-pointer text-left":
          true,
        "hover:bg-gray-50": !selected,
        "bg-gray-200": selected,
      })}
      {...rest}
    >
      <Text className="w-32 mr-4 whitespace-nowrap shrink-0 text-xs py-1">
        {format(event.timestamp, "MMM d, HH:mm:ss")}
      </Text>
      <Text className="w-28 mr-4 whitespace-nowrap shrink-0 text-xs truncate">
        {event.type}
      </Text>
      {eventLabels?.length ? (
        <span className="w-24 mr-4 overflow-hidden flex gap-1 shrink-0">
          {uniqBy(event.labels, (label) => label.id).map((label) => (
            <Badge
              size="xs"
              key={label.id}
              color={label.color}
              className="py-0 cursor-pointer"
            >
              <span className="text-xs">{label.name}</span>
            </Badge>
          ))}
        </span>
      ) : null}

      <Text className="truncate flex-1 w-0 text-xs">
        {Object.entries(truncateObject(event.data, 100)).map(([key, value]) => (
          <span key={key}>
            <Bold>{key}: </Bold> {value}{" "}
          </span>
        ))}
      </Text>
    </button>
  );
}
