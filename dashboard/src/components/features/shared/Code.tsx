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
import { Fragment } from "react";
import { Input } from "~/components/ui/input";
import { Plus, Sparkles, Trash, Trash2 } from "lucide-react";

interface CodeProps {
  featureId: string;
  dependencies: Record<string, string>;
  onChange?: (dependencies: Record<string, string>) => void;
}

function Code(props: CodeProps) {
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
        {Object.entries(dependencies).map(([dependency, alias]) => (
          <div key={dependency} className="flex items-center gap-4">
            <div className="w-40 text-muted-foreground">{dependency}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function toCamelCase(str: string) {
  return str
    .split(" ")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join("");
}

export { Code };
