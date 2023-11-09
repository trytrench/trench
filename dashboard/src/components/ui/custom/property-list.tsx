import { cn } from "~/lib/utils";

interface PropertyListProps extends React.HTMLAttributes<HTMLUListElement> {
  entries: { label: string; value: string }[];
}

function PropertyList({ className, entries, ...props }: PropertyListProps) {
  const hasEntries = entries.length > 0;

  return (
    <ul className={cn("divide-y", className)} {...props}>
      {hasEntries ? (
        entries.map(({ label, value }) => (
          <li
            key={label}
            className="flex justify-between text-muted-foreground text-sm py-2"
          >
            <span>{label}</span>
            <span className="ml-4 truncate">{JSON.stringify(value)}</span>
          </li>
        ))
      ) : (
        <li className="text-muted-foreground italic text-sm">No properties</li>
      )}
    </ul>
  );
}

export { PropertyList };
