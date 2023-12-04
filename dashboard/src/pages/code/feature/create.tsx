import { useMemo, useState } from "react";
import AppLayout from "~/components/AppLayout";
import type { NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

import { DataType, FeatureType } from "event-processing";
import { useRouter } from "next/router";
import { EditComputed } from "~/components/features/EditComputed";
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
import { toast } from "~/components/ui/use-toast";

const Page: NextPageWithLayout = () => {
  // Get feature id from url
  const router = useRouter();
  const featureId = router.query.featureId as string;

  const typeDefaults = {
    [FeatureType.Computed]: DataType.String,
    [FeatureType.Count]: DataType.Int64,
    [FeatureType.UniqueCount]: DataType.Boolean,
  } as Record<FeatureType, DataType>;

  const { mutateAsync: createFeatureDef } =
    api.featureDefs.create.useMutation();

  // const { onFeatureDefCreate } = props;

  const [featureName, setFeatureName] = useState("");
  const [featureType, setFeatureType] = useState<FeatureType | undefined>(
    undefined
  );
  const [dataType, setDataType] = useState<DataType | undefined>(undefined);

  const [eventTypes, setEventTypes] = useState<string[]>([]);

  const [dependencies, setDependencies] = useState<string[]>([]);
  const [config, setConfig] = useState<any>({});

  const featureTypeToComponent = {
    Computed: EditComputed,
    Entity: null,
    Count: null,
    Decision: null,
  };

  const handleFeatureTypeSelect = (val: FeatureType) => {
    setFeatureType(val);
    setDataType(typeDefaults[val]!);
  };

  const [typeDetailsValid, setTypeDetailsValid] = useState(false);
  const everythingValid = useMemo(() => {
    return featureName.length > 0 && featureType && typeDetailsValid;
  }, [featureName, featureType, typeDetailsValid]);

  const { mutateAsync: create } = api.featureDefs.create.useMutation();
  const createFeature = async () => {
    if (!everythingValid) return;

    try {
      await create({
        name: featureName,
        featureType: featureType!,
        dataType: dataType!,
        eventTypes: eventTypes,
        deps: dependencies,
        config: config,
      });

      toast({
        variant: "default",
        title: "FeatureDef created!",
      });
    } catch (e) {
      toast({
        variant: "destructive",
        title: "Failed to create FeatureDef",
      });
    }
  };

  // TEMP

  return (
    <div className="h-full w-full flex flex-col px-24 py-16">
      <div className="my-4 flex flex-col gap-4">
        <h1 className="text-emphasis-foreground text-3xl mb-4">
          Create Feature
        </h1>

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
              onValueChange={(v) => handleFeatureTypeSelect(v as FeatureType)}
            >
              <SelectTrigger className="w-[20rem]">
                <SelectValue placeholder="Select Feature Type..." />
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

      <Label className="text-emphasis-foreground w-32 mb-1.5 mt-8">
        Event Types
      </Label>
      <EventTypes eventTypes={eventTypes} onChange={setEventTypes} />

      <Separator className="my-12" />

      {featureType && (
        <>
          <EditComputed
            data={{
              featureName: featureName,
              featureType: featureType,
              dataType: dataType!,
              eventTypes: eventTypes,
            }}
            onConfigChange={setConfig}
            onDepsChange={setDependencies}
            onValidChange={setTypeDetailsValid}
          />
          <Button
            className="mr-auto mt-16"
            disabled={!everythingValid}
            onClick={createFeature}
          >
            Create Feature
          </Button>
        </>
      )}
    </div>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;
