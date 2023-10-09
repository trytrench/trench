import { Box, SimpleGrid } from "@chakra-ui/react";
import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionList,
  Badge,
  Card,
  Text,
  Title,
} from "@tremor/react";
import { format } from "date-fns";
import { uniqBy } from "lodash";
import Link from "next/link";
import { type RouterOutputs } from "~/utils/api";

interface Props {
  event: RouterOutputs["lists"]["getEventsList"]["rows"][number];
}

export const EventCard = ({ event }: Props) => {
  return (
    <Card>
      <div className="flex">
        <Title className="text-sm">{event.type}</Title>
      </div>
      <Text>{format(new Date(event.timestamp), "MMM d, yyyy h:mm:ss a")}</Text>
      <div className="flex flex-wrap gap-1 mt-3">
        {event.labels.length > 0 ? (
          uniqBy(event.labels, (label) => label.id).map((label, idx) => {
            return (
              <Badge key={idx} color={label.color} size="xs">
                {label.name}
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
                ? 0
                : value === true
                ? "True"
                : value === false
                ? "False"
                : value || "-"}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
      <div className="h-2"></div>
      <AccordionList>
        {event.entities.map((entity) => (
          <Accordion key={entity.id}>
            <AccordionHeader className="text-sm">
              {entity.type}: {entity.name}
            </AccordionHeader>
            <AccordionBody>
              <SimpleGrid columns={5} spacing={2}>
                {Object.entries(entity.features ?? {}).map(
                  ([key, value], idx) => (
                    <div key={key}>
                      <Text className="font-semibold">{key}</Text>
                      <Text className="truncate">
                        {value === 0
                          ? 0
                          : value === true
                          ? "True"
                          : value === false
                          ? "False"
                          : value || "-"}
                      </Text>
                    </div>
                  )
                )}
              </SimpleGrid>
            </AccordionBody>
          </Accordion>
        ))}
      </AccordionList>
    </Card>
  );
};
