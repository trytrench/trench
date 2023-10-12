import { Box, SimpleGrid } from "@chakra-ui/react";
import { Badge, Card, Text, Title } from "@tremor/react";
import { format } from "date-fns";
import { uniq } from "lodash";
import { BoxIcon } from "lucide-react";
import { useState } from "react";
import { type RouterOutputs } from "~/utils/api";

interface Props {
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
}

export const EventCard = ({ event }: Props) => {
  const eventLabels = uniq(event.labels.filter((label) => label !== ""));

  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  return (
    <Card>
      <div className="flex">
        <Title className="text-sm">{event.type}</Title>
      </div>
      <Text>{format(new Date(event.timestamp), "MMM d, yyyy h:mm:ss a")}</Text>
      <div className="flex flex-wrap gap-1 mt-3">
        {eventLabels.length > 0 ? (
          eventLabels.map((label, idx) => {
            return (
              <Badge key={idx} size="xs">
                {label}
              </Badge>
            );
          })
        ) : (
          <Badge color="neutral">No labels</Badge>
        )}
      </div>
      <div className="h-4"></div>
      <SimpleGrid columns={5} spacing={2}>
        {Object.entries(event.features).map(([key, value], idx) => (
          <Box key={key}>
            <Text className="font-semibold">{key}</Text>
            <Text className="truncate">
              {value === 0
                ? "0"
                : value === true
                ? "True"
                : value === false
                ? "False"
                : (value as string) || "-"}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
      <div className="h-2"></div>
      {/* <AccordionList>
        {event.entities.map((entity) => {
          const entityFeatureEntries = Object.entries(entity.features ?? {});
          const hasFeatures = entityFeatureEntries.length > 0;

          return (
            <Accordion key={entity.id}>
              <AccordionHeader className="text-sm">
                {entity.type}: {entity.name}
              </AccordionHeader>
              <AccordionBody className="">
                {hasFeatures ? (
                  <SimpleGrid columns={5} spacing={2}>
                    {Object.entries(entity.features ?? {}).map(
                      ([key, value], idx) => (
                        <div key={key}>
                          <Text className="font-semibold">{key}</Text>
                          <Text className="truncate">
                            {value === 0
                              ? "0"
                              : value === true
                              ? "True"
                              : value === false
                              ? "False"
                              : (value as string) || "-"}
                          </Text>
                        </div>
                      )
                    )}
                  </SimpleGrid>
                ) : (
                  <Text>No features</Text>
                )}
              </AccordionBody>
            </Accordion>
          );
        })}
      </AccordionList> */}

      <Text className="font-semibold mb-2 mt-4">Entities</Text>

      <div className="flex gap-4 flex-wrap">
        {event.entities.map((entity) => {
          return (
            <div className="rounded-xl p-2 px-4 flex gap-4 bg-gray-50 drop-shadow-sm max-w-[16rem] min-w-[12rem] hover:bg-gray-100 grow">
              <BoxIcon className="my-auto text-gray-500 shrink-0" size={18} />
              <div className="grow min-w-0">
                <Text className="truncate font-semibold">
                  {entity.type}: {entity.name}
                </Text>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
