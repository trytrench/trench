// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { useEffect, useState } from "react";
import { DataType } from "~/lib/create-feature/types";
import { SpinnerButton } from "~/components/ui/custom/spinner-button";
import { api } from "~/utils/api";
import { useProject } from "~/hooks/useProject";
import { defaultFeatureDef } from "./defaultFeatureDefs";

import { FeatureType } from "~/lib/create-feature/types";
import { useRouter } from "next/router";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";

// - the monaco editor ig? unsure

interface CreateFeatureDefProps {
  // onFeatureDefCreate?: (featureDef: FeatureDef) => void;
}

function CreateFeatureDef(props: CreateFeatureDefProps) {
  const { data: project } = useProject();
  const router = useRouter();

  // TODO: import options from where theyre actually hardcoded

  const typeDefaults = {
    Computed: "string",
    Entity: "string",
    Rule: "boolean",
    Count: "number",
    UniqueCount: "number",
  } as Record<FeatureType, DataType>;

  const { mutateAsync: createFeatureDef } =
    api.featureDefs.create.useMutation();

  // const { onFeatureDefCreate } = props;

  const [featureName, setFeatureName] = useState("");
  const [featureType, setFeatureType] = useState<FeatureType>(
    FeatureType.Computed
  );
  const [dataType, setDataType] = useState<DataType>(DataType.String);

  const [valid, setValid] = useState(false);

  useEffect(() => {
    // should check if featureName is taken
    // only support computed for now
    setValid(!!featureName && featureType === "Computed");
  });

  const handleFeatureTypeSelect = (val: FeatureType) => {
    setFeatureType(val);
    setDataType(typeDefaults[val]!);
  };

  const handleSubmit = async () => {
    if (!valid) return;
    if (!project?.id) return;

    try {
      const res = await createFeatureDef({
        projectId: project.id,
        ...defaultFeatureDef(featureName, featureType, dataType),
      });

      // redirect to [project]/code/feature/[featureId]
      router.push(`/${project.name}/code/feature/${res.id}`);
    } catch (e) {
      // TODO: if error, do something
    }
  };

  return (
    <div className="px-24 py-8">
      <Dialog>
        <DialogTrigger asChild>
          <Button className="text-emphasis-foreground" variant="outline">
            Create Feature
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-emphasis-foreground">
              Create New Feature
            </DialogTitle>
          </DialogHeader>
          <div className="my-4 flex flex-col gap-4">
            {/* Feature Name */}
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                placeholder="Feature Name"
                className="max-w-xs"
                value={featureName}
                onChange={(e) => setFeatureName(e.target.value)}
              />
            </div>

            <div className="flex gap-3 items-end">
              {/* Feature Type */}
              <div className="flex flex-col gap-1.5">
                <Label>Type</Label>
                <Select
                  value={featureType}
                  onValueChange={(v) =>
                    handleFeatureTypeSelect(v as FeatureType)
                  }
                >
                  <SelectTrigger className="w-[20rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(FeatureType).map((featureType) => (
                      <SelectItem key={featureType} value={featureType}>
                        {featureType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Type */}
              <div className="flex flex-col gap-1.5">
                <Select
                  value={dataType}
                  onValueChange={(v) => setDataType(v as DataType)}
                  disabled={featureType !== "Computed"}
                >
                  <SelectTrigger className="w-[8rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(DataType).map((dataType) => (
                      <SelectItem key={dataType} value={dataType}>
                        {dataType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button disabled={!valid} onClick={handleSubmit}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { CreateFeatureDef };
