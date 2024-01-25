import { FeatureDef } from "event-processing";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
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
  featureId?: string; // so we don't show the currently editing feature as an option.
  depsMap: Record<string, string>;
  onChange?: (depsMap: Record<string, string>) => void;
}

function DepsMapEditor(props: DepsMapEditorProps) {
  const { featureId, depsMap, onChange } = props;

  const { data: allFeatureDefs } = api.nodeDefs.allInfo.useQuery({});

  const addDependency = (depId: string) => {
    let alias = toCamelCase(
      allFeatureDefs?.find((v) => v.id === depId)?.name ?? "Untitled"
    );
    let validAlias = nextValidAlias(alias, depsMap);
    onChange?.({ ...depsMap, [validAlias]: depId });
  };

  const removeDependency = (depId: string) => {
    const removed = Object.fromEntries(
      Object.entries(depsMap).filter(([_, v]) => v !== depId)
    ) as Record<string, string>;
    onChange?.(removed);
  };

  const renameDependency = (depId: string, alias: string) => {
    const removed = Object.fromEntries(
      Object.entries(depsMap).filter(([_, v]) => v !== depId)
    ) as Record<string, string>;
    const validAlias = nextValidAlias(alias, removed);
    onChange?.({ ...removed, [validAlias]: depId });
  };

  const [popoverOpen, setPopoverOpen] = useState(false);

  const availableFeatures = useMemo(() => {
    if (!allFeatureDefs) return [];
    return allFeatureDefs.filter(
      (v) => !Object.values(depsMap).includes(v.id) && v.id !== featureId
    );
  }, [allFeatureDefs, depsMap, featureId]);

  return (
    <div className="grid gap-1.5">
      {/* Title and Add Button */}

      <div className="flex mb-4 items-center gap-8">
        <Label className="text-emphasis-foreground text-md">Dependencies</Label>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              size="xs"
              className="gap-2"
              disabled={!availableFeatures.length}
            >
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
                  {availableFeatures.map((fd) => (
                    <CommandItem
                      key={fd.id}
                      value={fd.name}
                      onSelect={() => {
                        setPopoverOpen(true);
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

      {/* Table */}

      <div className="flex items-center gap-4 text-sm border-b pb-1 mb-1 mr-auto">
        <div className="w-[10rem]">Name</div>
        <div className="w-[20rem]">Alias</div>
      </div>

      <div className="flex flex-col gap-1.5 min-h-[3rem]">
        {Object.keys(depsMap).length ? (
          Object.entries(depsMap).map(([alias, depId]) => (
            <div key={depId} className="flex items-center gap-4">
              <div className="w-[10rem] text-muted-foreground">
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
          ))
        ) : (
          <div className="w-[30rem] text-center p-3 text-sm text-muted-foreground italic">
            No dependencies
          </div>
        )}
      </div>
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
