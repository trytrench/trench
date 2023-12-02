import { Label } from "~/components/ui/label";
import { useProject } from "~/hooks/useProject";
import { api } from "~/utils/api";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface DependenciesProps {
  featureId: string | null;
  dependencies: Record<string, string>; // [alias]: feature id
  onChange?: (dependencies: Record<string, string>) => void;
}

function Dependencies(props: DependenciesProps) {
  const { featureId, dependencies, onChange } = props;

  const { data: project } = useProject();
  const { data: allFeatureDefs } = api.featureDefs.allInfo.useQuery(
    {
      projectId: project?.id!,
    },
    {
      enabled: !!project?.id,
    }
  );

  const addDependency = (dependencyId: string) => {
    const existingAliases = new Set(Object.keys(dependencies));

    let alias = toCamelCase(
      allFeatureDefs?.find((v) => v.id === dependencyId)?.name ?? "Untitled"
    );
    if (existingAliases.has(alias)) {
      let i = 1;
      while (existingAliases.has(`${alias}${i}`)) i++;
      alias = `${alias}${i}`;
    }

    onChange?.({ ...dependencies, [alias]: dependencyId });
  };

  const removeDependency = (dependency: string) => {
    const removed = Object.fromEntries(
      Object.entries(dependencies).filter(([_, v]) => v !== dependency)
    );

    onChange?.(removed);
  };

  const renameDependency = (dependency: string, alias: string) => {
    const removed = Object.fromEntries(
      Object.entries(dependencies).filter(([_, v]) => v !== dependency)
    );
    onChange?.({ ...removed, [alias]: dependency });
  };

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-col gap-2 mb-4">
        <Label className="text-emphasis-foreground text-md">Dependencies</Label>
      </div>

      <div className="flex items-center gap-4 text-sm border-b pb-1 mb-1 mr-auto">
        <div className="w-40">Name</div>
        <div className="w-[20rem]">Alias</div>
      </div>

      <div className="flex flex-col gap-1.5 mb-1">
        {Object.entries(dependencies).map(([alias, dependencyId]) => (
          <div key={dependencyId} className="flex items-center gap-4">
            <div className="w-40 text-muted-foreground">
              {allFeatureDefs?.find((v) => v.id === dependencyId)?.name ?? "-"}
            </div>

            <Input
              value={alias}
              onChange={(e) => renameDependency(dependencyId, e.target.value)}
              className="max-w-xs"
            />

            <Trash2
              className="w-6 h-6 text-destructive cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
              onClick={() => removeDependency(dependencyId)}
            />
          </div>
        ))}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="xs" className="mr-auto gap-1.5">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0">
          <Command>
            <CommandInput placeholder="Search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {allFeatureDefs
                  ?.filter(
                    (v) =>
                      !Object.values(dependencies).includes(v.id) &&
                      v.id !== featureId
                  )
                  .map((featureDef) => (
                    <CommandItem
                      key={featureDef.id}
                      value={featureDef.id}
                      onSelect={() => {
                        addDependency(featureDef.id);
                      }}
                      className="relative pl-8"
                    >
                      {featureDef.name}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function toCamelCase(str: string) {
  const alphaNumeric = str.replace(/[^a-zA-Z0-9 ]/g, "");
  return alphaNumeric
    .split(" ")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join("");
}

export { Dependencies };
