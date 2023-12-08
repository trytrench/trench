import React, { useMemo, useState } from "react";

import {
  DataType,
  FeatureDef,
  FeatureDefs,
  FeatureType,
} from "event-processing";

import { EditComputed } from "~/components/features/feature-types/EditComputed";
import { EventTypes } from "~/components/features/shared/EventTypes";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { EditEntityAppearance } from "~/components/features/feature-types/EditEntityAppearance";
import { Pencil, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { EditCount } from "./feature-types/EditCount";
import { EditUniqueCount } from "./feature-types/EditUniqueCount";

const DATA_TYPE_OPTIONS = [
  {
    label: "String",
    value: DataType.String,
  },
  {
    label: "Number",
    value: DataType.Float64,
  },
  {
    label: "Boolean",
    value: DataType.Boolean,
  },
  {
    label: "JSON",
    value: DataType.Object,
  },
];

const TYPE_DEFAULTS = {
  [FeatureType.Computed]: {
    dataType: DataType.Boolean,
    config: {
      code: "",
      depsMap: {},
      assignedEntityFeatureIds: [],
    },
  },
  [FeatureType.Count]: {
    dataType: DataType.Int64,
    config: {
      timeWindow: {
        number: 1,
        unit: "hours",
      },
      countByFeatureIds: [],
      conditionFeatureId: undefined,
    } as FeatureDefs[FeatureType.Count]["config"],
  },
  [FeatureType.UniqueCount]: {
    dataType: DataType.Int64,
    config: {
      timeWindow: {
        number: 1,
        unit: "hours",
      },
      countByFeatureIds: [],
      countUniqueFeatureIds: [],
      conditionFeatureId: undefined,
    } as FeatureDefs[FeatureType.UniqueCount]["config"],
  },
  [FeatureType.EntityAppearance]: {
    dataType: DataType.Entity,
    config: {
      eventTypes: new Set(),
      code: "",
      depsMap: {},
    },
  },
} as Record<
  FeatureType,
  {
    dataType: DataType;
    config: any;
  }
>;

//

interface EditFeatureDefProps {
  initialDef?: FeatureDef;
  onFeatureRename?: (name: string) => void;
  onFeatureDefSave?: (data: FeatureDef) => void;
}

function EditFeatureDef(props: EditFeatureDefProps) {
  const { initialDef, onFeatureDefSave, onFeatureRename } = props;

  // If we're editing an existing feature then populate forms w/ data.
  // Name, type, and datatype can't be changed after creation so the
  // fields are disabled.
  const isEditingExistingFeature = !!initialDef;

  const [featureDef, setFeatureDef] = useState<Partial<FeatureDef>>(
    initialDef ?? {
      // defaults for some fields
      featureName: "",
      eventTypes: new Set(),
      dependsOn: new Set(),
    }
  );
  const updateFeatureDef = (data: Partial<FeatureDef>) => {
    if (!featureDef) return;
    setFeatureDef({ ...featureDef, ...data });
  };

  const handleFeatureTypeSelect = (val: FeatureType) => {
    updateFeatureDef({
      featureType: val,
      dataType: TYPE_DEFAULTS[val].dataType,
      config: TYPE_DEFAULTS[val].config,
    });
  };

  // Whether or not the featureType-specific config is valid
  const [typeDetailsValid, setTypeDetailsValid] = useState(false);

  const everythingValid = useMemo(() => {
    return (
      featureDef?.featureName &&
      featureDef?.featureType &&
      featureDef?.dataType &&
      typeDetailsValid
    );
  }, [featureDef, typeDetailsValid]);

  const save = () => {
    if (!featureDef || !everythingValid) return;
    // TODO: validate that featureDef is a complete FeatureDef
    onFeatureDefSave?.(featureDef as FeatureDef);
  };

  // TEMP

  const { featureName, featureType, dataType, eventTypes, config } =
    featureDef ?? {};

  return (
    <div className="h-full w-full flex flex-col px-24 py-16">
      <div className="my-4 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <h1 className="text-emphasis-foreground text-3xl mb-4">
            {isEditingExistingFeature ? (
              <>
                <span className="italic">{featureName ?? ""}</span>
              </>
            ) : (
              "Create Feature"
            )}
          </h1>

          <div className="flex gap-2 items-center">
            {isEditingExistingFeature && (
              <RenameDialog
                name={featureName}
                onRename={(newName) => {
                  onFeatureRename?.(newName);
                  updateFeatureDef({ featureName: newName });
                }}
              />
            )}
            <Button
              disabled={!everythingValid}
              onClick={save}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save
            </Button>
          </div>
        </div>

        {/* Feature Name */}
        <div className="flex items-end gap-3">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input
              placeholder="Feature Name"
              className="w-[20rem]"
              value={featureName}
              disabled={isEditingExistingFeature}
              onChange={(e) =>
                updateFeatureDef({ featureName: e.target.value })
              }
            />
          </div>
        </div>

        <div className="flex gap-3 items-end">
          {/* Feature Type */}
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select
              value={featureType}
              onValueChange={(v) => handleFeatureTypeSelect(v as FeatureType)}
              disabled={isEditingExistingFeature}
            >
              <SelectTrigger className="w-[20rem]">
                <SelectValue placeholder="Select Feature Type..." />
              </SelectTrigger>
              <SelectContent>
                {Object.values(FeatureType).map((typeOpt) => (
                  <SelectItem key={typeOpt} value={typeOpt}>
                    {typeOpt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Type */}
          <div className="flex flex-col gap-1.5">
            <Select
              value={dataType}
              onValueChange={(v) =>
                updateFeatureDef({ dataType: v as DataType })
              }
              disabled={
                featureType !== FeatureType.Computed || isEditingExistingFeature
              }
            >
              <SelectTrigger className="w-[8rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATA_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="h-8 shrink-0" />

      <EventTypes
        eventTypes={eventTypes}
        onChange={(v) => {
          updateFeatureDef({ eventTypes: v });
        }}
      />

      <Separator className="my-12" />

      {featureDef.featureType && (
        <>
          {featureDef.featureType === FeatureType.Computed ? (
            <EditComputed
              featureDef={featureDef as FeatureDefs[FeatureType.Computed]}
              onFeatureDefChange={setFeatureDef}
              onValidChange={setTypeDetailsValid}
            />
          ) : featureDef.featureType === FeatureType.EntityAppearance ? (
            <EditEntityAppearance
              featureDef={
                featureDef as FeatureDefs[FeatureType.EntityAppearance]
              }
              onFeatureDefChange={setFeatureDef}
              onValidChange={setTypeDetailsValid}
            />
          ) : featureDef.featureType === FeatureType.Count ? (
            <EditCount
              featureDef={featureDef as FeatureDefs[FeatureType.Count]}
              isEditingExistingFeature={isEditingExistingFeature}
              onFeatureDefChange={setFeatureDef}
              onValidChange={setTypeDetailsValid}
            />
          ) : featureDef.featureType === FeatureType.UniqueCount ? (
            <EditUniqueCount
              featureDef={featureDef as FeatureDefs[FeatureType.UniqueCount]}
              isEditingExistingFeature={isEditingExistingFeature}
              onFeatureDefChange={setFeatureDef}
              onValidChange={setTypeDetailsValid}
            />
          ) : (
            <div>TODO</div>
          )}
        </>
      )}
    </div>
  );
}

export { EditFeatureDef };

//

function RenameDialog(props: {
  name?: string;
  onRename: (name: string) => void;
}) {
  const { name, onRename } = props;

  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState(name ?? "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          {/* todo */}
          <Pencil className="w-4 h-4" /> Rename
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
          <DialogDescription>
            Names are not tied to versioning. The name change applies
            immediately.
          </DialogDescription>
        </DialogHeader>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              onRename(newName);
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
