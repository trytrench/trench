import clsx from "clsx";
import { format } from "date-fns";
import { RouterOutputs, api } from "~/utils/api";
import { Badge } from "./ui/badge";

function truncateObject(obj: Object, maxLength: number) {
  let result = {};

  function traverse(o: Object) {
    if (typeof o === "object" && o !== null) {
      let str = JSON.stringify(o);
      return str.length > maxLength ? str.slice(0, maxLength) + "… }" : str;
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
  return (
    <button
      className={clsx({
        "px-4 md:px-8 py-1.5 w-full flex items-start text-xs font-mono cursor-pointer text-left border-b":
          true,
        "hover:bg-muted": !selected,
        "bg-muted": selected,
      })}
      {...rest}
    >
      <span className="w-32 mr-4 whitespace-nowrap shrink-0">
        {format(event.timestamp, "MMM d, HH:mm:ss")}
      </span>
      <span className="w-28 mr-4 whitespace-nowrap shrink-0 truncate">
        {event.type}
      </span>

      <div className="line-clamp-3 flex-1 w-0 text-xs">
        {Object.entries(truncateObject(event.data, 100)).map(([key, value]) => (
          <span key={key}>
            <b className="text-emphasis-foreground">{key}: </b>{" "}
            {value as string}{" "}
          </span>
        ))}
      </div>
    </button>
  );
}
