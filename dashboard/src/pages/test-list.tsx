import { Button } from "@chakra-ui/react";

import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "~/components/Navbar";
import { RouterOutputs, api } from "~/utils/api";
import {
  Badge,
  Card,
  List,
  ListItem,
  Text,
  TextInput,
  Title,
} from "@tremor/react";
import { SelectOptionFlat } from "../components/SelectOptionFlat";
import { ArrayParam, StringParam, useQueryParam } from "use-query-params";
import clsx from "clsx";
import { Select as ChakraReactSelect } from "chakra-react-select";
import { ChevronDown } from "lucide-react";
import { format } from "date-fns";

// Determines if the passed element is overflowing its bounds,
// either vertically or horizontally.
// Will temporarily modify the "overflow" style to detect this
// if necessary.
function checkOverflow(el: HTMLElement) {
  var curOverflow = el.style.overflow;

  if (!curOverflow || curOverflow === "visible") el.style.overflow = "hidden";

  var isOverflowing =
    el.clientWidth < el.scrollWidth || el.clientHeight < el.scrollHeight;

  el.style.overflow = curOverflow;

  return isOverflowing;
}

function processArray(array: (string | null)[] | null | undefined) {
  if (!array) return [];
  return array.filter((item) => item !== null) as string[];
}

function EntityCard({
  entity,
}: {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (ref.current) {
      setIsOverflowing(checkOverflow(ref.current));
    }
  }, [ref.current, expanded]);

  return (
    <Card
      className={clsx({
        "relative flex-1 min-w-[16rem] max-w-[24rem]": true,
        "h-40 overflow-y-hidden": !expanded,
      })}
      ref={ref}
    >
      <div className="">
        <Title className="">
          {entity.type}: {entity.name}
        </Title>
        <Text>
          Last seen: {format(new Date(entity.lastSeenAt), "MMM d, yyyy h:mm a")}
        </Text>
        <div className="h-4"></div>
        <div className="flex flex-wrap gap-1">
          {entity.labels.length > 0 ? (
            entity.labels.map((label, idx) => {
              return (
                <Badge key={idx} color={label.color}>
                  {label.name}
                </Badge>
              );
            })
          ) : (
            <Badge color="neutral">No labels</Badge>
          )}
        </div>
        <div className="h-4"></div>
        <List>
          {Object.entries(entity.features).map(([key, value], idx) => (
            <ListItem key={idx}>
              <Text className="font-semibold">{key}</Text>
              <Text className="ml-4 truncate">{value}</Text>
            </ListItem>
          ))}
        </List>
      </div>

      {isOverflowing ? (
        <>
          <div className="absolute pointer-events-none w-full bottom-0 left-0 bg-gradient-to-t from-white opacity-80 h-12 flex items-end">
            <button
              className="transition w-full h-8 pointer-events-auto hover:bg-gradient-to-t hover:from-tremor-background-subtle flex justify-center items-center gap-1"
              onClick={() => setExpanded(true)}
            >
              {/* <Text className="text-xs">more</Text> */}
              {/* <ChevronDown className="h-3 w-3 mt-0.5" /> */}
            </button>
          </div>

          {/* <div className="absolute bottom-0 left-0 right-0 w-full flex justify-center">
            <Button
              variant="unstyled"
              leftIcon={
                <ChevronDown className="h-6 w-6 text-tremor-content-subtle" />
              }
            ></Button>
          </div> */}
        </>
      ) : expanded ? (
        <button
          className="absolute transition bottom-0 w-full h-8 left-0 hover:bg-gradient-to-t hover:from-tremor-background-subtle flex justify-center items-center gap-1"
          onClick={() => setExpanded(false)}
        ></button>
      ) : null}
    </Card>
  );
}

const Page = () => {
  const [entityType, setEntityType] = useQueryParam("entityType", StringParam);

  const { data: entityTypes } = api.labels.getEntityTypes.useQuery();
  const entityTypeOptions =
    entityTypes?.map((entityType) => ({
      label: entityType.name,
      value: entityType.id,
    })) ?? [];

  const [entityLabelsQuery, setEntityLabels] = useQueryParam(
    "entityLabel",
    ArrayParam,
    { enableBatching: true }
  );
  const { data: entityLabels } = api.labels.getEntityLabels.useQuery({
    entityType: entityType ?? undefined,
  });
  const entityLabelOptions = useMemo(() => {
    return (
      entityLabels?.map((entityLabel) => ({
        label: entityLabel.name,
        value: entityLabel.id,
        colorScheme: entityLabel.color,
      })) ?? []
    );
  }, [entityLabels]);

  const selectedEntityLabelOptions = useMemo(() => {
    return entityLabelOptions.filter((option) => {
      return entityLabelsQuery?.includes(option.value) ?? false;
    });
  }, [entityLabelsQuery, entityLabelOptions]);

  const { data: entityFeatures } = api.labels.getEntityFeatures.useQuery({
    entityType: entityType ?? undefined,
  });

  const { data: entitiesList } = api.lists.getEntitiesList.useQuery({
    entityFilters: {
      entityType: entityType ?? undefined,
      entityLabels: processArray(entityLabelsQuery),
      entityFeatures: [],
    },
    limit: 100,
  });

  return (
    <>
      <Navbar />

      <div className="flex-1 overflow-hidden flex items-stretch">
        <div className="w-96 shrink-0 flex flex-col items-start bg-tremor-background-muted p-8 border-r border-r-tremor-border">
          <Title>Entities</Title>

          <Text className="font-semibold text-lg mb-2 mt-6">Type</Text>
          <div className="bg-tremor-background-subtle p-1 flex flex-wrap items-center gap-1 rounded-md">
            <SelectOptionFlat
              onSelect={(value) => {
                // Clear entityLabel query param when entityType changes
                setEntityLabels(undefined);
              }}
              queryParamKey="entityType"
              options={entityTypeOptions}
              renderOption={(option, { handleClick, selected }) => {
                return (
                  <button
                    onClick={() => handleClick(option.value)}
                    className={clsx({
                      "transition border rounded-md text-base font-semibold":
                        true,
                      "text-tremor-content hover:text-tremor-content-emphasis border-transparent":
                        !selected,
                      "text-tremor-brand bg-white border-gray shadow-sm":
                        selected,
                      "px-2 py-0.5": true,
                    })}
                  >
                    {option.label}
                  </button>
                );
              }}
            />
          </div>

          {entityType && (
            <>
              <Text className="font-semibold text-lg mb-2 mt-6">
                {`\`${entityType}\` `}
                Labels
              </Text>

              <ChakraReactSelect
                className="w-full flex flex-wrap"
                isMulti
                isClearable={false}
                value={selectedEntityLabelOptions}
                onChange={(value) => {
                  setEntityLabels(value?.map((option) => option.value));
                }}
                options={entityLabelOptions}
              ></ChakraReactSelect>

              <Text className="font-semibold text-lg mb-2 mt-6">
                {`\`${entityType}\` `}
                Features
              </Text>
              <div className="flex flex-col gap-2">
                {entityFeatures?.map((feature, idx) => {
                  return (
                    <div className="w-full" key={idx}>
                      <Text className="whitespace-no-wrap text-xs">
                        {feature.name}
                      </Text>
                      <TextInput placeholder="Filter..." className="w-full" />
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div className="relative flex-1">
          <div className="h-full flex flex-wrap gap-4 p-8 overflow-y-auto">
            {entitiesList?.rows.map((entity) => {
              return <EntityCard key={entity.id} entity={entity} />;
            })}
          </div>
          <div className="absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-white pointer-events-none"></div>
        </div>
      </div>
    </>
  );
};

export default Page;
