import {
  DataPath,
  FnType,
  TypeName,
  buildNodeDefWithFn,
} from "event-processing";
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
import { useMutationToasts } from "./useMutationToasts";
import { handleError } from "../../../lib/handleError";

export const EditDecision = () => {
  const router = useRouter();

  const toasts = useMutationToasts();
  const { mutateAsync: createNodeDefWithFn } =
    api.nodeDefs.createWithFn.useMutation();

  const [conditions, setConditions] = useState<
    { rules: DataPath[]; decisionId: string }[]
  >([{ rules: [], decisionId: "" }]);

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
            onClick={(event) => {
              event.preventDefault();

              const newDef = buildNodeDefWithFn(FnType.Decision, {
                name: "Decision",
                eventType: router.query.eventType as string,
                inputs: {
                  conditions: conditions.filter((d) => !!d.decisionId),
                  elseDecisionId: elseDecisionId,
                },
                fn: {
                  name: "decision",
                  type: FnType.Decision,
                  returnSchema: {
                    type: TypeName.String,
                  },
                  config: {},
                },
              });
              createNodeDefWithFn(newDef)
                .then(toasts.createNode.onSuccess)
                .catch(toasts.createNode.onError)
                .catch(handleError);
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </div>
      {conditions.map((condition, index) => (
        <Panel key={index} className="flex flex-col col-span-3">
          <div className="flex justify-between p-1">
            <span className="flex-1 pl-8">If the rule fires...</span>
            <span className="w-60">Then...</span>
          </div>

          <div>
            <div className="flex">
              {condition.rules.map((rule, outerIndex) => (
                <SelectDataPath
                  key={outerIndex}
                  value={rule}
                  onChange={(val) => {
                    if (val) {
                      setConditions(
                        conditions.map((d, i) =>
                          i === index
                            ? {
                                ...d,
                                rules: [
                                  ...d.rules.slice(0, outerIndex),
                                  val,
                                  ...d.rules.slice(outerIndex + 1),
                                ],
                              }
                            : d
                        )
                      );
                    } else {
                      setConditions(
                        conditions.map((d, i) =>
                          i === index
                            ? {
                                ...d,
                                rules: d.rules.filter(
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
                  setConditions(
                    conditions.map((d, i) =>
                      i === index
                        ? {
                            ...d,
                            rules: [...d.rules, val],
                          }
                        : d
                    )
                  );
                }}
                desiredSchema={{ type: TypeName.Rule }}
                eventType={router.query.eventType as string}
              />

              <Select
                value={condition.decisionId}
                onValueChange={(val) => {
                  setConditions(
                    conditions.map((d, i) =>
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
                  setConditions(conditions.filter((_, i) => i !== index));
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
          setConditions([
            ...conditions,
            {
              rules: [],
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
