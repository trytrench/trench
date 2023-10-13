import { cn } from "~/lib/utils";

interface PropertyListProps extends React.HTMLAttributes<HTMLUListElement> {
  entries: { label: string; value: string }[];
}

function PropertyList({ className, entries, ...props }: PropertyListProps) {
  return (
    <ul className={cn("divide-y", className)} {...props}>
      {entries.map(({ label, value }) => (
        <li
          key={label}
          className="flex justify-between text-muted-foreground text-sm py-2"
        >
          <span>{label}</span>
          <span className="ml-4 truncate">{value}</span>
        </li>
      ))}
    </ul>
  );
}

export { PropertyList };
