import { DataPath, TypeName } from "event-processing";
import { Plus, Save, X } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Panel } from "~/components/ui/custom/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { api } from "~/utils/api";
import { SelectDataPath } from "../SelectDataPath";

export const EditDecision = () => {
  const router = useRouter();

  const [data, setData] = useState<
    { conditions: DataPath[]; decisionId: string | null }[]
  >([
    {
      conditions: [],
      decisionId: null,
    },
  ]);
  const [elseDecisionId, setElseDecisionId] = useState<string>("");

  const { data: decisions } = api.decisions.list.useQuery();

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-emphasis-foreground text-2xl mt-1 mb-4">
          Create Decision
        </h1>

        <div className="flex gap-2 items-center">
          <Button
          // disabled={!isValid}
          // onClick={(event) => {
          //   event.preventDefault();

          //   // TODO: Clean this up
          //   onSave(
          //     {
          //       ...initialNodeDef,
          //       name: form.getValues("name"),
          //       config: {
          //         ...config,
          //         depsMap: {},
          //       },
          //     },
          //     assignToFeatures,
          //     form.getValues("featureDeps"),
          //     form.getValues("nodeDeps"),
          //     assignToEventFeature
          //   );
          // }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      {data.map((route, index) => (
        <Panel key={index} className="flex flex-col col-span-3">
          <div className="flex justify-between p-1">
            <span className="flex-1 pl-8">If the rule fires...</span>
            <span className="w-60">Then...</span>
          </div>

          <div>
            <div className="flex">
              {route.conditions.map((condition, outerIndex) => (
                <SelectDataPath
                  key={outerIndex}
                  value={condition}
                  onChange={(val) => {
                    if (val) {
                      setData(
                        data.map((d, i) =>
                          i === index
                            ? {
                                ...d,
                                conditions: [
                                  ...d.conditions.slice(0, outerIndex),
                                  val,
                                  ...d.conditions.slice(outerIndex + 1),
                                ],
                              }
                            : d
                        )
                      );
                    } else {
                      setData(
                        data.map((d, i) =>
                          i === index
                            ? {
                                ...d,
                                conditions: d.conditions.filter(
                                  (_, i) => i !== outerIndex
                                ),
                              }
                            : d
                        )
                      );
                    }
                  }}
                  desiredSchema={{ type: TypeName.Rule }}
                  eventType={router.query.eventType as string}
                />
              ))}

              <SelectDataPath
                value={null}
                onChange={(val) => {
                  setData(
                    data.map((d, i) =>
                      i === index
                        ? {
                            ...d,
                            conditions: [...d.conditions, val],
                          }
                        : d
                    )
                  );
                }}
                desiredSchema={{ type: TypeName.Rule }}
                eventType={router.query.eventType as string}
              />

              <Select
                value={route.decisionId}
                onValueChange={(val) => {
                  setData(
                    data.map((d, i) =>
                      i === index
                        ? {
                            ...d,
                            decisionId: val,
                          }
                        : d
                    )
                  );
                }}
              >
                <SelectTrigger className="w-36 ml-auto font-semibold shrink-0 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {decisions?.map((decision) => (
                    <SelectItem key={decision.id} value={decision.id}>
                      {decision.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setData(data.filter((_, i) => i !== index));
                }}
                variant="ghost"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Panel>
      ))}

      <Button
        onClick={() => {
          setData([
            ...data,
            {
              conditions: [],
              decisionId: null,
            },
          ]);
        }}
      >
        <Plus className="w-4 h-4" />
      </Button>

      <Panel>
        <div>All over events</div>
        <Select value={elseDecisionId} onValueChange={setElseDecisionId}>
          <SelectTrigger className="w-36 ml-auto font-semibold shrink-0 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {decisions?.map((decision) => (
              <SelectItem key={decision.id} value={decision.id}>
                {decision.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Panel>
    </div>
  );
};
