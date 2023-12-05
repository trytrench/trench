import { FeatureDef } from "event-processing";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { api } from "~/utils/api";

interface DepsMapEditorProps {
  featureDef: Partial<FeatureDef>;
  onFeatureDefChange?: (featureDef: Partial<FeatureDef>) => void;
}

function DepsMapEditor(props: DepsMapEditorProps) {
  const { featureDef, onFeatureDefChange } = props;
  const deps: Record<string, string> = featureDef?.config?.depsMap ?? {};

  console.log(deps);

  const { data: allFeatureDefs } = api.featureDefs.allInfo.useQuery();

  const updateDepsOnly = (deps: Record<string, string>) => {
    const asSet = new Set(Object.values(deps));

    onFeatureDefChange?.({
      ...featureDef,
      dependsOn: asSet,
      config: {
        ...featureDef?.config,
        depsMap: deps,
      },
    });
  };

  const addDependency = (dependencyId: string) => {
    let alias = toCamelCase(
      allFeatureDefs?.find((v) => v.id === dependencyId)?.name ?? "Untitled"
    );

    let validAlias = nextValidAlias(alias, deps);

    updateDepsOnly({
      ...deps,
      [validAlias]: dependencyId,
    });
  };

  const removeDependency = (dependency: string) => {
    const removed = Object.fromEntries(
      Object.entries(deps).filter(([_, v]) => v !== dependency)
    ) as Record<string, string>;

    updateDepsOnly(removed);
  };

  const renameDependency = (dependency: string, alias: string) => {
    const removed = Object.fromEntries(
      Object.entries(deps).filter(([_, v]) => v !== dependency)
    ) as Record<string, string>;

    const validAlias = nextValidAlias(alias, removed);

    updateDepsOnly({
      ...removed,
      [validAlias]: dependency,
    });
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
        {Object.entries(deps).map(([alias, depId]) => (
          <div key={depId} className="flex items-center gap-4">
            <div className="w-40 text-muted-foreground">
              {allFeatureDefs?.find((v) => v.id === depId)?.name ?? "-"}
            </div>

            <Input
              value={alias}
              onChange={(e) => renameDependency(depId, e.target.value)}
              className="max-w-xs"
            />

            <Trash2
              className="w-6 h-6 text-destructive cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
              onClick={() => removeDependency(depId)}
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
                      !Object.values(deps).includes(v.id) &&
                      v.id !== featureDef?.featureId
                  )
                  .map((fd) => (
                    <CommandItem
                      key={fd.id}
                      value={fd.id}
                      onSelect={() => {
                        addDependency(fd.id);
                      }}
                      className="relative pl-8"
                    >
                      {fd.name}
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

export { DepsMapEditor };

//

function toCamelCase(str: string) {
  const alphaNumeric = str.replace(/[^a-zA-Z0-9 ]/g, "");
  return alphaNumeric
    .split(" ")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join("");
}

function nextValidAlias(baseName: string, deps: Record<string, string>) {
  const existingAliases = new Set(Object.keys(deps));

  let alias = toCamelCase(baseName);
  if (existingAliases.has(alias)) {
    let i = 1;
    while (existingAliases.has(`${alias}${i}`)) i++;
    alias = `${alias}${i}`;
  }

  return alias;
}
